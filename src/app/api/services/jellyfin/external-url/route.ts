import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getJellyfinExternalUrl } from "@/lib/config/services";
import { setSetting, deleteSetting } from "@/lib/db/settings";

const putBodySchema = z.object({
  externalUrl: z.union([z.url(), z.literal(""), z.null()]).optional(),
});

/**
 * GET /api/services/jellyfin/external-url — returns the resolved external Jellyfin URL.
 */
export async function GET() {
  try {
    const { externalUrl } = getJellyfinExternalUrl();
    return NextResponse.json({ externalUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read external URL" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/services/jellyfin/external-url — saves the external Jellyfin URL to DB.
 * Body: { externalUrl: string }
 * Send an empty string or null to clear the override.
 */
export async function PUT(request: Request) {
  try {
    const raw: unknown = await request.json();
    const parseResult = putBodySchema.safeParse(raw);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const value = parseResult.data.externalUrl?.trim() || null;

    if (value) {
      setSetting("jellyfin.externalUrl", value);
    } else {
      deleteSetting("jellyfin.externalUrl");
    }

    const { externalUrl } = getJellyfinExternalUrl();
    return NextResponse.json({ externalUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save external URL" },
      { status: 500 }
    );
  }
}
