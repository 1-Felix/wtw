import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getWebhookById, updateWebhook, deleteWebhook } from "@/lib/db/webhooks";
import { updateWebhookSchema } from "@/lib/db/webhook-schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/webhooks/[id] — update an existing webhook.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const existing = getWebhookById(id);
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const result = updateWebhookSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(result.error) },
        { status: 400 }
      );
    }

    const updated = updateWebhook(id, result.data);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update webhook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/[id] — delete a webhook (cascades to notification_log).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const deleted = deleteWebhook(id);
    if (!deleted) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
