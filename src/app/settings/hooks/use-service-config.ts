"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod/v4";

// --- Response schemas ---

const serviceStatusSchema = z.object({
  jellyfin: z.object({
    configured: z.boolean(),
    userName: z.string().nullable(),
    maskedApiKey: z.string().nullable(),
    source: z.enum(["env", "db"]).nullable(),
  }),
  sonarr: z.object({
    configured: z.boolean(),
    maskedApiKey: z.string().nullable(),
    source: z.enum(["env", "db"]).nullable(),
  }),
  radarr: z.object({
    configured: z.boolean(),
    maskedApiKey: z.string().nullable(),
    source: z.enum(["env", "db"]).nullable(),
  }),
});

export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export interface UseServiceConfigReturn {
  status: ServiceStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  testJellyfin: (url: string) => Promise<{ success: boolean; serverName?: string; error?: string }>;
  authJellyfin: (serverUrl: string, username: string, password: string) => Promise<{ success: boolean; userName?: string; error?: string }>;
  disconnectJellyfin: () => Promise<{ success: boolean; error?: string }>;
  testArr: (service: "sonarr" | "radarr", url: string, apiKey: string) => Promise<{ success: boolean; version?: string; error?: string }>;
  saveArr: (service: "sonarr" | "radarr", url: string, apiKey: string) => Promise<{ success: boolean; error?: string }>;
  disconnectArr: (service: "sonarr" | "radarr") => Promise<{ success: boolean; error?: string }>;
}

export function useServiceConfig(): UseServiceConfigReturn {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/services/config");
      const data: unknown = await res.json();
      const parsed = serviceStatusSchema.safeParse(data);
      if (parsed.success) {
        setStatus(parsed.data);
        setError(null);
      } else {
        setError("Invalid config response");
      }
    } catch {
      setError("Failed to fetch service config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const testJellyfin = useCallback(async (url: string) => {
    try {
      const res = await fetch("/api/services/jellyfin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: unknown = await res.json();
      if (res.ok) {
        const parsed = z.object({ success: z.literal(true), serverName: z.string().optional() }).safeParse(data);
        return parsed.success
          ? { success: true, serverName: parsed.data.serverName }
          : { success: false, error: "Unexpected response" };
      }
      const err = z.object({ error: z.string() }).safeParse(data);
      return { success: false, error: err.success ? err.data.error : "Test failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, []);

  const authJellyfin = useCallback(async (serverUrl: string, username: string, password: string) => {
    try {
      const res = await fetch("/api/services/jellyfin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl, username, password }),
      });
      const data: unknown = await res.json();
      if (res.ok) {
        const parsed = z.object({ success: z.literal(true), userName: z.string().optional() }).safeParse(data);
        if (parsed.success) {
          await refresh();
          return { success: true, userName: parsed.data.userName };
        }
        return { success: false, error: "Unexpected response" };
      }
      const err = z.object({ error: z.string() }).safeParse(data);
      return { success: false, error: err.success ? err.data.error : "Auth failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [refresh]);

  const disconnectJellyfin = useCallback(async () => {
    try {
      const res = await fetch("/api/services/jellyfin", { method: "DELETE" });
      if (res.ok) {
        await refresh();
        return { success: true };
      }
      const data: unknown = await res.json();
      const err = z.object({ error: z.string() }).safeParse(data);
      return { success: false, error: err.success ? err.data.error : "Disconnect failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [refresh]);

  const testArr = useCallback(async (service: "sonarr" | "radarr", url: string, apiKey: string) => {
    try {
      const res = await fetch(`/api/services/${service}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey }),
      });
      const data: unknown = await res.json();
      if (res.ok) {
        const parsed = z.object({ success: z.literal(true), version: z.string().optional() }).safeParse(data);
        return parsed.success
          ? { success: true, version: parsed.data.version }
          : { success: false, error: "Unexpected response" };
      }
      const err = z.object({ error: z.string() }).safeParse(data);
      return { success: false, error: err.success ? err.data.error : "Test failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, []);

  const saveArr = useCallback(async (service: "sonarr" | "radarr", url: string, apiKey: string) => {
    try {
      const res = await fetch(`/api/services/${service}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey }),
      });
      if (res.ok) {
        await refresh();
        return { success: true };
      }
      const data: unknown = await res.json();
      const err = z.object({ error: z.string() }).safeParse(data);
      return { success: false, error: err.success ? err.data.error : "Save failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [refresh]);

  const disconnectArr = useCallback(async (service: "sonarr" | "radarr") => {
    try {
      const res = await fetch(`/api/services/${service}`, { method: "DELETE" });
      if (res.ok) {
        await refresh();
        return { success: true };
      }
      const data: unknown = await res.json();
      const err = z.object({ error: z.string() }).safeParse(data);
      return { success: false, error: err.success ? err.data.error : "Disconnect failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [refresh]);

  return {
    status,
    loading,
    error,
    refresh,
    testJellyfin,
    authJellyfin,
    disconnectJellyfin,
    testArr,
    saveArr,
    disconnectArr,
  };
}
