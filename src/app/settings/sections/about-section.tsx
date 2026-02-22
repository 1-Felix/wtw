"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { healthResponseSchema } from "../schemas";
import type { HealthResponse } from "../schemas";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function AboutSection() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        const parsed = healthResponseSchema.safeParse(data);
        if (parsed.success) setHealth(parsed.data);
      })
      // Silent: non-critical info display; failure just means "Loading..." stays visible
      .catch(() => {});
  }, []);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        About
      </h3>

      {/* Migration notice */}
      {health?.rulesJsonImported && (
        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground">
            Configuration was imported from rules.json. Changes are now saved to
            the database.
          </p>
        </div>
      )}

      <div className="space-y-2 rounded-md border border-border bg-surface p-4">
        <InfoRow label="Version" value="0.1.0" />
        <InfoRow
          label="Sync Phase"
          value={health ? health.phase : "Loading..."}
        />
        <InfoRow
          label="Sync Interval"
          value={
            health?.syncIntervalMinutes
              ? `${health.syncIntervalMinutes} minutes`
              : "..."
          }
        />
        <InfoRow
          label="Last Sync"
          value={
            health?.lastSyncEnd
              ? new Date(health.lastSyncEnd).toLocaleString()
              : "Never"
          }
        />
        <InfoRow label="Database" value="/config/wtw.db" />
      </div>

      {/* Services */}
      {health && health.services.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Services
          </p>
          {health.services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">{svc.name}</span>
              <span
                className={
                  svc.connected ? "text-primary" : "text-destructive"
                }
              >
                {svc.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
