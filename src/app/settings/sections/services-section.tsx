"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clapperboard,
  Film,
  Info,
  Loader2,
  Tv,
  Unplug,
  XCircle,
} from "lucide-react";
import { useServiceConfig } from "../hooks/use-service-config";

// --- Helpers ---

function SourceBadge({ source }: { source: "env" | "db" | null }) {
  if (source === "env") {
    return (
      <span className="mt-2 inline-flex items-center gap-1 rounded bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400">
        <Info className="h-3 w-3" />
        Configured via environment variables. Remove them from Docker Compose to manage here.
      </span>
    );
  }
  return null;
}

// --- Jellyfin Card ---

function JellyfinCard() {
  const { status, testJellyfin, authJellyfin, disconnectJellyfin } = useServiceConfig();
  const jf = status?.jellyfin;

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [url, setUrl] = useState("");
  const [serverVerified, setServerVerified] = useState(false);
  const [serverName, setServerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setError(null);
    const result = await testJellyfin(url);
    setTesting(false);
    if (result.success) {
      setServerVerified(true);
      setServerName(result.serverName ?? "");
      toast.success(`Connected to ${result.serverName ?? "Jellyfin"}`);
    } else {
      const msg = result.error ?? "Could not reach server";
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleAuth() {
    setAuthenticating(true);
    setError(null);
    const result = await authJellyfin(url, username, password);
    setAuthenticating(false);
    if (result.success) {
      toast.success(`Signed in as ${result.userName ?? username}`);
      setMode("view");
      resetForm();
    } else {
      const msg = result.error ?? "Authentication failed";
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectJellyfin();
    setDisconnecting(false);
    if (result.success) {
      toast.success("Jellyfin disconnected");
    } else {
      toast.error(result.error ?? "Failed to disconnect");
    }
  }

  function resetForm() {
    setUrl("");
    setServerVerified(false);
    setServerName("");
    setUsername("");
    setPassword("");
    setError(null);
  }

  const isConnected = jf?.configured;
  const isEnvOverride = jf?.source === "env";

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Jellyfin</h4>
          {isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {isConnected && !isEnvOverride && mode === "view" && (
          <div className="flex gap-2">
            <Button variant="ghost" size="xs" onClick={() => setMode("edit")}>
              Re-authenticate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Jellyfin</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disconnect Jellyfin? The app will enter setup mode and you will need to re-authenticate.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDisconnect}>
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isEnvOverride && <SourceBadge source="env" />}

      {isConnected && mode === "view" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Connected{jf.userName ? ` as ${jf.userName}` : ""}{jf.maskedApiKey ? ` — API key: ${jf.maskedApiKey}` : ""}
        </p>
      )}

      {(!isConnected || mode === "edit") && !isEnvOverride && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="http://jellyfin:8096"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setServerVerified(false);
                setError(null);
              }}
              disabled={serverVerified}
            />
            {!serverVerified ? (
              <Button onClick={handleTest} disabled={!url || testing} variant="secondary" size="sm" className="shrink-0">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-primary"
                onClick={() => { setServerVerified(false); setError(null); }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {serverVerified && (
            <>
              <p className="text-xs text-primary">Connected to {serverName}</p>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button onClick={handleAuth} disabled={!username || authenticating} className="w-full" size="sm">
                {authenticating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </>
          )}
          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          {mode === "edit" && (
            <Button variant="ghost" size="xs" onClick={() => { setMode("view"); resetForm(); }}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Arr Connection Card (Sonarr/Radarr) ---

function ArrCard({
  service,
  icon: Icon,
}: {
  service: "sonarr" | "radarr";
  icon: typeof Clapperboard;
}) {
  const { status, testArr, saveArr, disconnectArr } = useServiceConfig();
  const svc = status?.[service];
  const label = service === "sonarr" ? "Sonarr" : "Radarr";

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [version, setVersion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestPassed(false);
    const result = await testArr(service, url, apiKey);
    setTesting(false);
    if (result.success) {
      setTestPassed(true);
      setVersion(result.version ?? "");
      toast.success(`${label} connection successful`);
    } else {
      const msg = result.error ?? `Could not connect to ${label}`;
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveArr(service, url, apiKey);
    setSaving(false);
    if (result.success) {
      toast.success(`${label} saved`);
      setMode("view");
      resetForm();
    } else {
      const msg = result.error ?? `Failed to save ${label} config`;
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectArr(service);
    setDisconnecting(false);
    if (result.success) {
      toast.success(`${label} disconnected`);
    } else {
      toast.error(result.error ?? "Failed to disconnect");
    }
  }

  function resetForm() {
    setUrl("");
    setApiKey("");
    setTestPassed(false);
    setVersion("");
    setError(null);
  }

  const isConnected = svc?.configured;
  const isEnvOverride = svc?.source === "env";

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">{label}</h4>
          {isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {isConnected && !isEnvOverride && mode === "view" && (
          <div className="flex gap-2">
            <Button variant="ghost" size="xs" onClick={() => setMode("edit")}>
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect {label}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disconnect {label}? You will need to re-enter the URL and API key to reconnect.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDisconnect}>
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isEnvOverride && <SourceBadge source="env" />}

      {isConnected && mode === "view" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Connected{svc?.maskedApiKey ? ` — API key: ${svc.maskedApiKey}` : ""}
        </p>
      )}

      {(!isConnected || mode === "edit") && !isEnvOverride && (
        <div className="mt-4 space-y-3">
          <Input
            type="url"
            placeholder={`http://${service}:${service === "sonarr" ? "8989" : "7878"}`}
            value={url}
            onChange={(e) => { setUrl(e.target.value); setTestPassed(false); setError(null); }}
          />
          <Input
            type="text"
            placeholder="API Key (Settings > General)"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestPassed(false); setError(null); }}
          />
          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={!url || !apiKey || testing} variant="secondary" size="sm" className="flex-1">
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Connection
            </Button>
            {testPassed && (
              <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            )}
          </div>
          {testPassed && (
            <p className="text-xs text-primary">
              <CheckCircle2 className="mr-1 inline h-3 w-3" />
              Connected — {label} v{version}
            </p>
          )}
          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          {mode === "edit" && (
            <Button variant="ghost" size="xs" onClick={() => { setMode("view"); resetForm(); }}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Services Section ---

export function ServicesSection() {
  const { loading, error } = useServiceConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Service Connections
      </h3>
      <div className="space-y-3">
        <JellyfinCard />
        <ArrCard service="sonarr" icon={Clapperboard} />
        <ArrCard service="radarr" icon={Film} />
      </div>
    </section>
  );
}
