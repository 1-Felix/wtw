import { NextResponse } from "next/server";
import { getServiceConfig } from "@/lib/config/services";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const { jellyfin } = getServiceConfig();
  if (!jellyfin) {
    return NextResponse.json(
      { error: "Jellyfin not configured" },
      { status: 503 }
    );
  }
  const baseUrl = jellyfin.url.replace(/\/$/, "");
  const imageUrl = `${baseUrl}/Items/${itemId}/Images/Primary?api_key=${jellyfin.apiKey}&maxWidth=400`;

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 }
    );
  }
}
