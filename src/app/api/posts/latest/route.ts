import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PUBLORA_API_BASE = "https://api.publora.com/api/v1";

export async function GET() {
  const publoraApiKey = process.env.PUBLORA_API_KEY?.trim();

  if (!publoraApiKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error: PUBLORA_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${PUBLORA_API_BASE}/list-posts?limit=10&sortBy=createdAt&sortOrder=desc`, {
      headers: {
        "x-publora-key": publoraApiKey,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch posts from Publora." },
        { status: res.status }
      );
    }

    const data = await res.json();
    const posts: Array<{
      postGroupId?: string;
      status?: string;
      createdAt?: string;
      scheduledTime?: string;
      content?: string;
      posts?: Array<{
        postedId?: string;
        platform?: string;
        status?: string;
      }>;
      media?: Array<{
        url?: string;
      }>;
    }> = data.posts || [];

    // Find the latest post that is published or scheduled
    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        hasPost: false,
        message: "No posts published yet.",
      });
    }

    const latest = posts[0];
    const postGroupId = latest.postGroupId;
    let postedId: string | undefined;

    // Check if postedId is in the posts array
    if (Array.isArray(latest.posts)) {
      const liPost = latest.posts.find((p) => p.platform === "linkedin" && p.postedId) || latest.posts[0];
      postedId = liPost?.postedId;
    }

    // If post is published and postedId is not in list-posts, fetch single post details via get-post
    let finalLinkedinUrl: string | undefined;
    let finalMediaUrl: string | undefined = latest.media?.[0]?.url;

    if (postGroupId && (!postedId || !finalMediaUrl)) {
      try {
        const detailRes = await fetch(`${PUBLORA_API_BASE}/get-post/${postGroupId}`, {
          headers: { "x-publora-key": publoraApiKey },
        });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const detailPosts = detailData.posts || [];
          const liDetail = detailPosts.find((p: { platform?: string; postedId?: string }) => p.platform === "linkedin" && p.postedId) || detailPosts[0];
          if (liDetail?.postedId) {
            postedId = liDetail.postedId;
          }
          if (!finalMediaUrl && detailData.media?.[0]?.url) {
            finalMediaUrl = detailData.media[0].url;
          }
        }
      } catch {
        // Fallback to what we have
      }
    }

    if (postedId) {
      finalLinkedinUrl = postedId.startsWith("http")
        ? postedId
        : `https://www.linkedin.com/feed/update/${postedId}`;
    }

    return NextResponse.json({
      success: true,
      hasPost: true,
      post: {
        postGroupId: latest.postGroupId,
        status: latest.status,
        createdAt: latest.createdAt,
        scheduledTime: latest.scheduledTime,
        content: latest.content,
        postedId: postedId || null,
        linkedinUrl: finalLinkedinUrl || null,
        mediaUrl: finalMediaUrl || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching latest post";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
