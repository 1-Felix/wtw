import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAllWebhooks, createWebhook } from "@/lib/db/webhooks";
import { createWebhookSchema } from "@/lib/db/webhook-schemas";

/**
 * GET /api/webhooks — list all webhooks.
 */
export async function GET() {
  try {
    const webhooks = getAllWebhooks();
    return NextResponse.json({ webhooks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list webhooks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks — create a new webhook.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = createWebhookSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(result.error) },
        { status: 400 }
      );
    }

    const webhook = createWebhook(result.data);
    return NextResponse.json(webhook, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create webhook" },
      { status: 500 }
    );
  }
}
