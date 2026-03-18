"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
  /** Progress value between 0 and 1 */
  value: number;
  label?: string;
  className?: string;
  /** Disable the mount animation */
  noAnimation?: boolean;
}

export function ProgressBar({ value, label, className = "", noAnimation }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value * 100));
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (noAnimation) return;
    // Next frame: trigger the transition from 0% → target
    const id = requestAnimationFrame(() => {
      setAnimating(true);
    });
    return () => cancelAnimationFrame(id);
  }, [noAnimation]);

  const showFull = noAnimation || animating;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400"
          style={{
            width: showFull ? `${percent}%` : "0%",
            transitionProperty: "width",
            transitionDuration: noAnimation ? "0ms" : "600ms",
            transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
            transitionDelay: noAnimation ? "0ms" : "100ms",
          }}
        />
      </div>
    </div>
  );
}
