import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PUBLORA_CREATE_POST_ENDPOINT = "https://api.publora.com/api/v1/create-post";

/**
 * Constant-time string comparison to prevent timing attacks.
 * Using sha256 digests guarantees identical buffer lengths for timingSafeEqual.
 */
function safeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(req: NextRequest) {
  // 1. Authorize request using Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid Authorization header." },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7).trim();
  const bridgeSecret = process.env.BRIDGE_SECRET?.trim();

  if (!bridgeSecret) {
    return NextResponse.json(
      { success: false, error: "Server configuration error: BRIDGE_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!safeCompare(token, bridgeSecret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid bridge token." },
      { status: 401 }
    );
  }

  // 2. Validate environment configuration for Publora
  const publoraApiKey = process.env.PUBLORA_API_KEY?.trim();
  const linkedinPlatformId = process.env.LINKEDIN_PLATFORM_ID?.trim();

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

  // 3. Parse and validate request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Bad Request: Invalid JSON in request body." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body.content !== "string" ||
    body.content.trim().length === 0
  ) {
    return NextResponse.json(
      { success: false, error: "Bad Request: 'content' must be a non-empty string." },
      { status: 400 }
    );
  }

  const postContent = body.content.trim();

  // 4. Determine scheduled time: use provided valid ISO timestamp or current time + 60s buffer
  let scheduledTime: string;
  if (
    typeof body.scheduledTime === "string" &&
    !isNaN(Date.parse(body.scheduledTime))
  ) {
    scheduledTime = new Date(body.scheduledTime).toISOString();
  } else {
    // Publora requires UTC ISO 8601 string; 60-second buffer provides immediate publication
    scheduledTime = new Date(Date.now() + 60 * 1000).toISOString();
  }

  // 5. Send post payload to Publora API
  const publoraPayload = {
    content: postContent,
    platforms: [linkedinPlatformId],
    scheduledTime,
  };

  try {
    const publoraResponse = await fetch(PUBLORA_CREATE_POST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publora-key": publoraApiKey,
      },
      body: JSON.stringify(publoraPayload),
    });

    let publoraData: unknown;
    const responseText = await publoraResponse.text();
    try {
      publoraData = responseText ? JSON.parse(responseText) : {};
    } catch {
      publoraData = { message: responseText };
    }

    if (!publoraResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Publora API responded with an error.",
          details: publoraData,
        },
        { status: publoraResponse.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "LinkedIn post successfully submitted to Publora.",
        data: publoraData,
      },
      { status: publoraResponse.status }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected network error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Publora API.",
        details: errorMessage,
      },
      { status: 502 }
    );
  }
}
