import { NextResponse } from "next/server";
import { dismissItem, undismissItem } from "@/lib/db/dismissed";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/media/[id]/dismiss — dismiss a media item.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const title = (body as Record<string, unknown>).title;

    dismissItem(id, typeof title === "string" ? title : id);
    return NextResponse.json({ success: true, mediaId: id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dismiss item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id]/dismiss — un-dismiss a media item.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const removed = undismissItem(id);

    if (!removed) {
      return NextResponse.json({ error: "Item was not dismissed" }, { status: 404 });
    }

    return NextResponse.json({ success: true, mediaId: id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to un-dismiss item" },
      { status: 500 }
    );
  }
}
