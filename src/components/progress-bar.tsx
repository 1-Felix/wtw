interface ProgressBarProps {
  /** Progress value between 0 and 1 */
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className = "" }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value * 100));

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
          className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
