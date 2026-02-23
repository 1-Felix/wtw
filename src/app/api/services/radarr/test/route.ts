import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { arrTestSchema } from "../../schemas";

/**
 * POST /api/services/radarr/test — test Radarr connection via /api/v3/system/status.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parseResult = arrTestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { url, apiKey } = parseResult.data;
    const normalizedUrl = url.replace(/\/+$/, "");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${normalizedUrl}/api/v3/system/status`, {
        headers: { "X-Api-Key": apiKey },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Radarr returned ${response.status}` },
          { status: 502 }
        );
      }

      const data: unknown = await response.json();
      const parsed = z.object({ version: z.string() }).safeParse(data);
      const version = parsed.success ? parsed.data.version : "Unknown";

      return NextResponse.json({ success: true, version });
    } catch (fetchErr) {
      clearTimeout(timeout);

      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Connection timed out" },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: "Could not reach Radarr server" },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to test Radarr connection" },
      { status: 500 }
    );
  }
}
