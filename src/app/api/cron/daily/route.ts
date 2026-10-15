import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getKarachiDateInfo, WEEKLY_CONTENT_CALENDAR } from "@/lib/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PUBLORA_API_BASE = "https://api.publora.com/api/v1";
const OPENAI_API_BASE = "https://api.openai.com/v1";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const ADMIN_PASSWORD = "Atif.123";

/**
 * Curated, expert-level technical posts mapped to each day of the week.
 * Used automatically whenever OpenAI API key is not configured or if OpenAI is unreachable.
 */
interface DayPostContent {
  title: string;
  content: string;
  imageUrl: string;
}

const CURATED_DAY_POSTS: Record<string, DayPostContent> = {
  Monday: {
    title: "⚡ Modern Web Architecture: Designing for Speed, Resilience & Scale",
    content: `Modern web development has moved far beyond simple page rendering. In 2026, building resilient digital products requires a thoughtful balance between server-side execution, edge computing, and client reactivity.

Key architectural principles high-performing engineering teams prioritize:
1. Intelligent Hydration & Edge Compute: Shifting dynamic compute closer to users minimizes time-to-interactive while optimizing resource consumption.
2. Type-Safe Contracts Across the Stack: End-to-end type safety between APIs and UI components eliminates silent runtime failures before reaching production.
3. Observability Over Guesswork: Proactive performance monitoring and automated bundle analysis ensure regressions are caught at deployment, not by end users.

The most successful web applications aren't just fast on day one—they are engineered to stay maintainable as codebases and teams grow. What core architectural pattern has made the biggest difference in your team's web apps this year?

#WebDevelopment #SoftwareArchitecture #NextJS #FrontendEngineering #TechInnovation`,
    imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&fit=crop&q=80",
  },
  Tuesday: {
    title: "🐍 Python at Scale: Asynchronous Workflows & Production Architecture",
    content: `Python continues to dominate data pipelines, backend services, and automated developer tooling. But moving from scripts to bulletproof production systems requires mastering asynchronous execution.

Three practical habits for robust Python services:
1. Leverage asyncio for I/O-Bound Workloads: Utilizing async HTTP clients and connection pools prevents blocking worker threads during third-party API integration.
2. Strict Data Validation: Using Pydantic or dataclasses guarantees incoming and outgoing schemas stay robust under heavy traffic.
3. Graceful Error Handling & Idempotency: Always implement exponential backoff and unique request keys to survive intermittent network hiccups.

Engineering excellence is about making complex workflows predictable and resilient under load.

#Python #BackendDevelopment #Asyncio #SoftwareEngineering #Automation`,
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
  },
  Wednesday: {
    title: "🤖 Engineering with Generative AI: From Prompts to Production Workflows",
    content: `The conversation around Artificial Intelligence has evolved from prompt experimentation to enterprise architecture. Developing production-grade AI applications demands structured engineering discipline.

What separates toy AI demos from enterprise-ready systems:
1. Deterministic Guardrails: Wrapping probabilistic LLM responses with schema validation ensures outputs remain reliable and safe for downstream services.
2. Autonomous Agent Workflows: Combining multi-agent collaboration with real-world tool execution enables autonomous problem solving.
3. Low-Latency Orchestration: Streaming responses and intelligent caching keep UX snappy even during intensive inference tasks.

The real competitive advantage lies in building durable systems around models. How is your team integrating AI into daily workflows?

#ArtificialIntelligence #GenerativeAI #LLM #SoftwareEngineering #MachineLearning`,
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
  },
  Thursday: {
    title: "🧠 Practical Machine Learning: Embedding Models & Semantic Retrieval",
    content: `Machine learning in software applications is no longer just about training models from scratch. Today, the most impactful applications leverage embeddings, semantic search, and hybrid retrieval pipelines.

Core pillars of modern semantic search architectures:
1. Hybrid Vector & Keyword Search: Balancing dense vector representations with traditional BM25 search yields higher retrieval accuracy than pure vector search alone.
2. Optimized Chunking Strategies: Semantic chunking preserves context, allowing downstream models to formulate more accurate responses.
3. Dimensionality & Cost Control: Choosing the right embedding dimensions balances recall precision against indexing cost and latency.

Continuous iteration and evaluation metrics are what turn raw algorithms into delightful user experiences.

#MachineLearning #DataScience #VectorSearch #Embeddings #AIArchitecture`,
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&auto=format&fit=crop&q=80",
  },
  Friday: {
    title: "📱 Modern Mobile Engineering: Performance, Cross-Platform & Native Polish",
    content: `Delivering a top-tier mobile experience in 2026 requires uncompromising attention to frame rates, battery efficiency, and offline capabilities.

Key focus areas for modern mobile engineering:
1. 60 FPS Fluidity: Offloading heavy processing to background isolates keeps the main thread buttery smooth during intricate user animations.
2. Offline-First Synchronization: Storing state locally and syncing opportunistically ensures an uninterrupted experience regardless of signal strength.
3. Consistent Design Systems: A well-architected design system bridges the gap between design vision and cross-platform mobile reality.

Users might not always notice great engineering consciously, but they instantly feel the lack of it when an app lags. Build with care and precision!

#MobileDevelopment #Flutter #ReactNative #MobileEngineering #AppDevelopment`,
    imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop&q=80",
  },
  Saturday: {
    title: "🛠️ Developer Tools & DevOps: Accelerating the Velocity of High-Performing Teams",
    content: `Great developer tools don't just speed up build times—they unlock creative momentum and eliminate cognitive friction across entire engineering organizations.

Where top-tier engineering organizations invest their developer experience efforts:
1. Fast, Hermetic CI Pipelines: Parallel test runners and smart caching turn 30-minute builds into sub-2-minute rapid feedback loops.
2. Automated Preview Environments: Ephemeral review deployments allow cross-functional teams to test real code changes instantly before merging.
3. Zero-Config Local Setup: Reproducible development environments ensure engineers can onboard and contribute from day one without configuration friction.

When teams remove friction from the developer loop, innovation accelerates naturally.

#DevOps #DeveloperExperience #CloudNative #CICD #SoftwareEngineering`,
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80",
  },
  Sunday: {
    title: "💡 Weekly Tech Perspective: Building Resilient Systems for the Long Term",
    content: `As another week begins, it's worth stepping back from individual pull requests to examine the bigger picture of technology and software craftsmanship.

Three timeless lessons that endure across technology waves:
1. Simplicity is a Competitive Advantage: The easiest code to maintain, debug, and scale is the code you didn't have to write.
2. Automate What Drags You Down: Repetitive manual tasks are opportunities to build durable systems that buy back your team's time.
3. Continuous Curiosity: The technologies we rely on today were once experimental. Dedicating time to explore emerging paradigms pays compounds over time.

Here's to building thoughtful, scalable, and impactful technology in the week ahead!

#Technology #EngineeringLeadership #SoftwareCraftsmanship #FutureOfWork #Innovation`,
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80",
  },
};

/**
 * Constant-time safe string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const hashA = crypto.createHash("sha256").update(a).digest();
    const hashB = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}

/**
 * Authorize the cron request via:
 * 1. Bearer token in Authorization header (matches CRON_SECRET, BRIDGE_SECRET, or ADMIN_PASSWORD)
 * 2. Query param ?token= or ?secret= (matches CRON_SECRET, BRIDGE_SECRET, or ADMIN_PASSWORD)
 * 3. Vercel Cron invocation header (x-vercel-cron: 1 or User-Agent containing vercel-cron)
 */
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bridgeSecret = process.env.BRIDGE_SECRET?.trim();
  const validSecrets = [cronSecret, bridgeSecret, ADMIN_PASSWORD].filter(Boolean) as string[];

  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && validSecrets.some((secret) => safeCompare(token, secret))) {
      return true;
    }
  }

  // 2. Check query param token / secret
  const queryToken =
    req.nextUrl.searchParams.get("token")?.trim() ||
    req.nextUrl.searchParams.get("secret")?.trim();
  if (queryToken && validSecrets.some((secret) => safeCompare(queryToken, secret))) {
    return true;
  }

  // 3. Check Vercel Cron internal header
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  if (vercelCronHeader === "1") {
    return true;
  }

  const userAgent = req.headers.get("user-agent") || "";
  if (userAgent.toLowerCase().includes("vercel-cron")) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  return handleCronExecution(req);
}

export async function POST(req: NextRequest) {
  return handleCronExecution(req);
}

async function handleCronExecution(req: NextRequest) {
  // 1. Authorize invocation
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing authorization. Provide Bearer token, ?token= param, or invoke via Vercel Cron.",
      },
      { status: 401 }
    );
  }

  // 2. Validate essential environment variables
  const publoraApiKey = process.env.PUBLORA_API_KEY?.trim();
  const linkedinPlatformId = process.env.LINKEDIN_PLATFORM_ID?.trim();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

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

  const isDryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  const isForce = req.nextUrl.searchParams.get("force") === "true";

  // 4. Duplicate protection: Check if today's execution has already occurred
  if (!isForce) {
    try {
      const listRes = await fetch(`${PUBLORA_API_BASE}/list-posts?limit=30`, {
        headers: {
          "x-publora-key": publoraApiKey,
        },
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const posts: Array<{ content?: string }> = listData.posts || [];
        const isAlreadyProcessed = posts.some(
          (p) => typeof p.content === "string" && p.content.includes(executionId)
        );

        if (isAlreadyProcessed) {
          return NextResponse.json({
            success: true,
            alreadyProcessed: true,
            executionId,
            date: dateStr,
            weekday,
            category,
            message: `Post for ${dateStr} (${executionId}) has already been published. Use ?force=true to override.`,
          });
        }
      }
    } catch {
      // Proceed; idempotency key will still protect at post creation
    }
  }

  // 5. Dry-run mode for health verification without publishing side-effects
  if (isDryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      executionId,
      date: dateStr,
      weekday,
      category,
      hasGeminiKey: Boolean(geminiApiKey),
      hasOpenAiKey: Boolean(openaiApiKey),
    });
  }

  try {
    let finalPostContent = "";
    let finalImageUrl = "";
    let source = "curated_fallback";

    const promptText = `You are an elite, modern software engineer and thoughtful tech writer sharing an insight on LinkedIn for ${weekday}.
Topic Category: ${category}
Date Context: ${dateStr}

Writing Guidelines:
- Write a fresh, high-impact, authentic LinkedIn post (140 to 220 words).
- Hook the reader in the very first sentence with a non-obvious engineering truth or thought-provoking observation.
- Deliver 2 to 3 crisp, concrete bullet points or brief paragraphs with actionable engineering depth.
- Conclude with an open-ended engagement question for practitioners.
- End with 3-5 high-relevance hashtags.
- Do NOT use generic AI clichés like "In today's fast-paced world", "Revolutionizing", "Let's dive in", or "Game-changer".
- Make it sound natural, authoritative, and direct.`;

    // 6. Attempt dynamic generation with Google Gemini first (if configured)
    if (geminiApiKey) {
      try {
        const geminiRes = await fetch(
          `${GEMINI_API_BASE}/models/gemini-3.8-flash:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": geminiApiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: promptText }],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const generatedText: string =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          if (generatedText) {
            finalPostContent = `${generatedText}\n\n📌 Ref: ${executionId}`;
            source = "google_gemini_3.8_flash";
          }
        } else {
          console.warn("Gemini generation HTTP status:", geminiRes.status);
        }
      } catch (geminiErr) {
        console.warn("Google Gemini generation error:", geminiErr);
      }
    }

    // 7. Attempt dynamic generation with OpenAI if Gemini was absent or failed
    if (!finalPostContent && openaiApiKey) {
      try {
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
              { role: "user", content: promptText },
            ],
            temperature: 0.7,
          }),
        });

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          const generatedContent: string = chatData.choices?.[0]?.message?.content?.trim() || "";
          if (generatedContent) {
            finalPostContent = `${generatedContent}\n\n📌 Ref: ${executionId}`;
            source = "openai_gpt4o_mini";
          }
        }
      } catch (openAiErr) {
        console.warn("OpenAI generation encountered an issue:", openAiErr);
      }
    }

    // Attempt OpenAI DALL-E 3 image generation if OpenAI is configured
    if (openaiApiKey) {
      try {
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

        if (imageRes.ok) {
          const imageData = await imageRes.json();
          finalImageUrl = imageData.data?.[0]?.url || "";
        }
      } catch (openAiImgErr) {
        console.warn("OpenAI image generation error:", openAiImgErr);
      }
    }

    // 8. Fallback to rich curated content if dynamic generation did not produce content or image
    const fallback = CURATED_DAY_POSTS[weekday] || CURATED_DAY_POSTS.Monday;
    if (!finalPostContent) {
      finalPostContent = `${fallback.title}\n\n${fallback.content}\n\n📌 Ref: ${executionId}`;
    }
    if (!finalImageUrl) {
      finalImageUrl = fallback.imageUrl;
    }

    // 8. Publish post to Publora targeting LinkedIn
    // Schedule for 60 seconds from now to allow immediate processing by Publora scheduler
    const scheduledTime = new Date(Date.now() + 60 * 1000).toISOString();

    const publoraPayload: Record<string, unknown> = {
      content: finalPostContent,
      platforms: [linkedinPlatformId],
      scheduledTime,
      mediaUrls: [finalImageUrl],
    };

    const publoraRes = await fetch(`${PUBLORA_API_BASE}/create-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publora-key": publoraApiKey,
        "Idempotency-Key": `${executionId}-v2`,
      },
      body: JSON.stringify(publoraPayload),
    });

    const publoraData = await publoraRes.json().catch(() => ({}));

    if (!publoraRes.ok) {
      return NextResponse.json(
        { success: false, error: "Publora create-post failed", details: publoraData },
        { status: publoraRes.status }
      );
    }

    const postGroupId = publoraData.postGroupId || publoraData.id;

    return NextResponse.json({
      success: true,
      executionId,
      date: dateStr,
      weekday,
      category,
      postGroupId,
      scheduledTime,
      source,
      status: "scheduled",
      message: `LinkedIn post for ${weekday} (${category}) successfully submitted to Publora!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected cron execution error";
    return NextResponse.json(
      { success: false, error: "Cron execution error", details: message },
      { status: 500 }
    );
  }
}
