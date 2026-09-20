import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getKarachiDateInfo } from "@/lib/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PUBLORA_API_BASE = "https://api.publora.com/api/v1";
const OPENAI_API_BASE = "https://api.openai.com/v1";

/**
 * Constant-time safe string comparison
 */
function safeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function GET(req: NextRequest) {
  // 1. Authorize Cron invocation via Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid Authorization header." },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7).trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "Server configuration error: CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!safeCompare(token, cronSecret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid cron secret." },
      { status: 401 }
    );
  }

  // 2. Validate other required environment variables
  const publoraApiKey = process.env.PUBLORA_API_KEY?.trim();
  const linkedinPlatformId = process.env.LINKEDIN_PLATFORM_ID?.trim();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

  if (!publoraApiKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error: PUBLORA_API_KEY is not configured." },
      { status: 500 }
    );
  }

  if (!linkedinPlatformId) {
    return NextResponse.json(
      { success: false, error: "Server configuration error: LINKEDIN_PLATFORM_ID is not configured." },
      { status: 500 }
    );
  }

  // 3. Determine today's date, weekday, and category in Asia/Karachi
  const dateInfo = getKarachiDateInfo();
  const { dateStr, weekday, category, executionId } = dateInfo;

  // 4. Duplicate protection: Check if today's execution has already occurred
  try {
    const listRes = await fetch(`${PUBLORA_API_BASE}/list-posts?limit=30`, {
      headers: {
        "x-publora-key": publoraApiKey,
      },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const posts: Array<{ content?: string }> = listData.posts || [];
      const isAlreadyProcessed = posts.some((p) =>
        typeof p.content === "string" && p.content.includes(executionId)
      );

      if (isAlreadyProcessed) {
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          executionId,
          date: dateStr,
          weekday,
          category,
          message: `Post for ${dateStr} (${executionId}) has already been published.`,
        });
      }
    }
  } catch {
    // Continue if list check fails; idempotency key will still protect at post creation
  }

  // 5. Dry-run mode for testing without external side-effects
  const isDryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  if (isDryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      executionId,
      date: dateStr,
      weekday,
      category,
      alreadyProcessed: false,
    });
  }

  if (!openaiApiKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error: OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    // 6. Generate unique, high-quality LinkedIn post content using OpenAI
    const textPrompt = `You are a professional software engineer and content creator. Write an engaging, educational LinkedIn post about ${category}.
Requirements:
- Target length: 120–200 words.
- Professional, human, educational, practical, and clear.
- Strong opening hook.
- Short, readable paragraphs (1–2 sentences each).
- Actionable insight or useful conclusion.
- 3–5 relevant hashtags at the end.
- Strictly avoid: fake statistics, exaggerated claims, excessive emojis, generic AI phrasing ("In today's fast-paced world..."), or hard selling.`;

    const chatRes = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You write insightful, human, high-impact LinkedIn engineering posts." },
          { role: "user", content: textPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!chatRes.ok) {
      const errData = await chatRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: "OpenAI text generation failed", details: errData },
        { status: chatRes.status }
      );
    }

    const chatData = await chatRes.json();
    const generatedContent: string = chatData.choices?.[0]?.message?.content?.trim() || "";

    if (!generatedContent) {
      return NextResponse.json(
        { success: false, error: "OpenAI returned empty post content" },
        { status: 502 }
      );
    }

    // Attach execution ID as a clean footer reference for duplicate tracking
    const finalPostContent = `${generatedContent}\n\n📌 Ref: ${executionId}`;

    // 7. Generate matching landscape AI image using DALL-E 3
    const imagePrompt = `A premium, modern, technology-focused visual concept representing ${category}. Clean, LinkedIn professional aesthetic, high quality, strong visual hierarchy, minimal text, no watermark, no logos, modern tech workspace or abstract digital architecture.`;

    const imageRes = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
      }),
    });

    if (!imageRes.ok) {
      const errData = await imageRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: "OpenAI image generation failed", details: errData },
        { status: imageRes.status }
      );
    }

    const imageData = await imageRes.json();
    const generatedImageUrl: string = imageData.data?.[0]?.url || "";

    if (!generatedImageUrl) {
      return NextResponse.json(
        { success: false, error: "OpenAI returned empty image URL" },
        { status: 502 }
      );
    }

    // 8. Publora Workflow:
    // Step A: Create Draft
    const draftRes = await fetch(`${PUBLORA_API_BASE}/create-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publora-key": publoraApiKey,
        "Idempotency-Key": executionId,
      },
      body: JSON.stringify({
        content: finalPostContent,
        platforms: [linkedinPlatformId],
      }),
    });

    const draftData = await draftRes.json().catch(() => ({}));
    if (!draftRes.ok || !draftData.postGroupId) {
      return NextResponse.json(
        { success: false, error: "Publora draft creation failed", details: draftData },
        { status: draftRes.status }
      );
    }

    const postGroupId = draftData.postGroupId;

    // Step B: Get Upload URL
    const uploadUrlRes = await fetch(`${PUBLORA_API_BASE}/get-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publora-key": publoraApiKey,
      },
      body: JSON.stringify({
        postGroupId,
        fileName: `${executionId}.jpg`,
        contentType: "image/jpeg",
        type: "image",
      }),
    });

    const uploadUrlData = await uploadUrlRes.json().catch(() => ({}));
    if (!uploadUrlRes.ok || !uploadUrlData.uploadUrl) {
      return NextResponse.json(
        { success: false, error: "Publora get-upload-url failed", details: uploadUrlData },
        { status: uploadUrlRes.status }
      );
    }

    const { uploadUrl, fileUrl } = uploadUrlData;

    // Step C: Fetch generated image from OpenAI and upload directly to S3
    const imageBinaryRes = await fetch(generatedImageUrl);
    if (!imageBinaryRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to download generated image from OpenAI" },
        { status: 502 }
      );
    }

    const imageBuffer = await imageBinaryRes.arrayBuffer();
    const s3UploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
      },
      body: Buffer.from(imageBuffer),
    });

    if (!s3UploadRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to upload image to Publora S3 storage" },
        { status: 502 }
      );
    }

    // Step D: Schedule / Publish the post with the attached image
    const scheduledTime = new Date(Date.now() + 60 * 1000).toISOString();
    const updateRes = await fetch(`${PUBLORA_API_BASE}/update-post/${postGroupId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-publora-key": publoraApiKey,
        "Idempotency-Key": `${executionId}-publish`,
      },
      body: JSON.stringify({
        status: "scheduled",
        scheduledTime,
        mediaUrls: fileUrl ? [fileUrl] : undefined,
      }),
    });

    const updateData = await updateRes.json().catch(() => ({}));
    if (!updateRes.ok) {
      return NextResponse.json(
        { success: false, error: "Publora post schedule failed", details: updateData },
        { status: updateRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      executionId,
      date: dateStr,
      weekday,
      category,
      postGroupId,
      scheduledTime,
      status: "scheduled",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected cron execution error";
    return NextResponse.json(
      { success: false, error: "Cron execution error", details: message },
      { status: 500 }
    );
  }
}
