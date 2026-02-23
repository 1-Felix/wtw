import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { jellyfinTestSchema } from "../../schemas";

/**
 * POST /api/services/jellyfin/test — test Jellyfin server reachability via /System/Info/Public.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parseResult = jellyfinTestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { url } = parseResult.data;
    const normalizedUrl = url.replace(/\/+$/, "");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${normalizedUrl}/System/Info/Public`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Jellyfin server returned ${response.status}` },
          { status: 502 }
        );
      }

      const data: unknown = await response.json();
      const parsed = z.object({ ServerName: z.string() }).safeParse(data);
      const serverName = parsed.success ? parsed.data.ServerName : "Unknown";

      return NextResponse.json({ success: true, serverName });
    } catch (fetchErr) {
      clearTimeout(timeout);

      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Connection timed out" },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: "Could not reach Jellyfin server" },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to test Jellyfin connection" },
      { status: 500 }
    );
  }
}
