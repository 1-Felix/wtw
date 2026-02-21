import { NextResponse } from "next/server";
import { getWebhookById } from "@/lib/db/webhooks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/webhooks/[id]/test — send a test notification to the webhook.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const webhook = getWebhookById(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Build test payload based on webhook type
    const payload =
      webhook.type === "discord"
        ? {
            embeds: [
              {
                title: "[TEST] Ready to Watch",
                description:
                  "**Test Series** — Season 1\nThis is a test notification from wtw.",
                color: 0xf59e0b,
                footer: { text: "wtw — test notification" },
                timestamp: new Date().toISOString(),
              },
            ],
          }
        : {
            event: "test",
            media: {
              id: "test-item",
              title: "Test Series",
              type: "season",
              seasonNumber: 1,
              progress: { current: 10, total: 10 },
            },
            verdict: { status: "ready" },
            timestamp: new Date().toISOString(),
          };

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send test notification",
      },
      { status: 500 }
    );
  }
}
