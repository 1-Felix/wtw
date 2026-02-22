"use client";

import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DismissedItem } from "../schemas";

export function DismissedSection({
  items,
  onItemsChange,
}: {
  items: DismissedItem[];
  onItemsChange: (items: DismissedItem[]) => void;
}) {
  const handleUndismiss = async (mediaId: string) => {
    try {
      await fetch(`/api/media/${mediaId}/dismiss`, { method: "DELETE" });
      onItemsChange(items.filter((i) => i.media_id !== mediaId));
      toast.success("Item restored");
    } catch {
      toast.error("Couldn't restore item");
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Dismissed Items
      </h3>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No dismissed items.</p>
      )}

      {items.map((item) => (
        <div
          key={item.media_id}
          className="flex items-center justify-between rounded-md border border-border bg-surface p-3"
        >
          <div>
            <p className="text-sm text-foreground">{item.media_title}</p>
            <p className="text-xs text-muted-foreground">
              Dismissed{" "}
              {new Date(item.dismissed_at + "Z").toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleUndismiss(item.media_id)}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
        </div>
      ))}
    </section>
  );
}
