import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { jellyfinAuthSchema } from "../../schemas";
import { setSetting } from "@/lib/db/settings";
import { restartSyncScheduler } from "@/lib/sync/orchestrator";
import { invalidateConfigCache } from "@/middleware";
import { randomUUID } from "crypto";

/**
 * POST /api/services/jellyfin/auth — authenticate with Jellyfin via username/password,
 * store credentials in DB, and start the sync scheduler.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parseResult = jellyfinAuthSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { serverUrl, username, password } = parseResult.data;
    const normalizedUrl = serverUrl.replace(/\/+$/, "");

    const authHeader = `MediaBrowser Client="wtw", Device="wtw", DeviceId="${randomUUID()}", Version="1.0.0"`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(
        `${normalizedUrl}/Users/AuthenticateByName`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Emby-Authorization": authHeader,
          },
          body: JSON.stringify({ Username: username, Pw: password }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      if (!response.ok) {
        return NextResponse.json(
          { error: `Jellyfin authentication failed with status ${response.status}` },
          { status: 502 }
        );
      }

      const data: unknown = await response.json();

      const authResponseSchema = z.object({
        AccessToken: z.string(),
        User: z.object({
          Id: z.string(),
          Name: z.string().optional(),
        }),
      });

      const parsed = authResponseSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid authentication response from Jellyfin" },
          { status: 502 }
        );
      }

      const accessToken = parsed.data.AccessToken;
      const userId = parsed.data.User.Id;
      const userName = parsed.data.User.Name ?? null;

      // Store credentials in database
      setSetting("jellyfin.url", normalizedUrl);
      setSetting("jellyfin.apiKey", accessToken);
      setSetting("jellyfin.userId", userId);
      if (userName) {
        setSetting("jellyfin.userName", userName);
      }

      // Invalidate middleware cache and restart sync scheduler
      invalidateConfigCache();
      await restartSyncScheduler();

      return NextResponse.json({ success: true, userName: userName ?? username });
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
      { error: err instanceof Error ? err.message : "Failed to authenticate with Jellyfin" },
      { status: 500 }
    );
  }
}
