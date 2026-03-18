"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, crossFadeVariants } from "@/components/ui/motion";

const shortcuts = [
  { keys: ["/"], description: "Focus search" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close panel / overlay" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if focused on an input/textarea
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    },
    [open],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcut-overlay"
          variants={crossFadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
            className="relative w-full max-w-xs rounded-lg border border-border bg-card p-5 shadow-xl"
          >
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Keyboard Shortcuts
            </h2>

            <div className="space-y-2.5">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground/50">
              Press <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">?</kbd> or <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">Esc</kbd> to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
