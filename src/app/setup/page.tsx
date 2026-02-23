"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod/v4";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Server,
  SkipForward,
  Tv,
  Film,
  Clapperboard,
} from "lucide-react";

// --- Response Schemas ---

const successWithServerName = z.object({
  success: z.literal(true),
  serverName: z.string().optional(),
});

const successWithUserName = z.object({
  success: z.literal(true),
  userName: z.string().optional(),
});

const successWithVersion = z.object({
  success: z.literal(true),
  version: z.string().optional(),
});

const errorResponse = z.object({
  error: z.string(),
});

const successOnly = z.object({
  success: z.literal(true),
});

// --- Types ---

type Step = "welcome" | "jellyfin" | "sonarr" | "radarr" | "complete";

const STEPS: Step[] = ["welcome", "jellyfin", "sonarr", "radarr", "complete"];

interface ConnectedService {
  name: string;
  detail: string;
}

// --- Step Progress Indicator ---

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? "w-8 bg-primary"
              : i === current
                ? "w-8 bg-primary/60"
                : "w-2 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

// --- Welcome Step ---

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary">wtw</h1>
        <p className="text-lg text-muted-foreground">What to Watch</p>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Your self-hosted dashboard for tracking media readiness across Jellyfin,
        Sonarr, and Radarr. Connect your services to get started.
      </p>

      <Button size="lg" onClick={onNext} className="w-full">
        Get Started
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Jellyfin Step ---

function JellyfinStep({ onNext, onBack, onConnect }: {
  onNext: () => void;
  onBack: () => void;
  onConnect: (service: ConnectedService) => void;
}) {
  const [url, setUrl] = useState("");
  const [serverVerified, setServerVerified] = useState(false);
  const [serverName, setServerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTestServer() {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch("/api/services/jellyfin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: unknown = await res.json();

      if (res.ok) {
        const parsed = successWithServerName.safeParse(data);
        if (parsed.success) {
          setServerVerified(true);
          setServerName(parsed.data.serverName ?? "");
          toast.success(`Connected to ${parsed.data.serverName ?? "Jellyfin"}`);
        } else {
          setError("Unexpected response from server");
        }
      } else {
        const err = errorResponse.safeParse(data);
        setError(err.success ? err.data.error : "Could not reach server");
      }
    } catch {
      setError("Network error — check the URL and try again");
    } finally {
      setTesting(false);
    }
  }

  async function handleAuthenticate() {
    setAuthenticating(true);
    setError(null);
    try {
      const res = await fetch("/api/services/jellyfin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl: url, username, password }),
      });
      const data: unknown = await res.json();

      if (res.ok) {
        const parsed = successWithUserName.safeParse(data);
        if (parsed.success) {
          const userName = parsed.data.userName ?? username;
          toast.success(`Signed in as ${userName}`);
          onConnect({ name: "Jellyfin", detail: `${serverName} (${userName})` });
          onNext();
        } else {
          setError("Unexpected response from server");
        }
      } else {
        const err = errorResponse.safeParse(data);
        setError(err.success ? err.data.error : "Authentication failed");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setAuthenticating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Tv className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Connect Jellyfin</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Jellyfin is required to track your media library.
        </p>
      </div>

      {/* Server URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Server URL</label>
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
            <Button
              onClick={handleTestServer}
              disabled={!url || testing}
              variant="secondary"
              className="shrink-0"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="shrink-0 text-primary"
              onClick={() => {
                setServerVerified(false);
                setError(null);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {serverVerified && (
          <p className="text-xs text-primary">
            Connected to {serverName}
          </p>
        )}
      </div>

      {/* Username / Password (shown after server verified) */}
      {serverVerified && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button
            onClick={handleAuthenticate}
            disabled={!username || authenticating}
            className="w-full"
          >
            {authenticating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sign In
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Back button */}
      <div className="flex justify-start pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

// --- Arr (Sonarr/Radarr) Step ---

function ArrStep({
  service,
  icon: Icon,
  testEndpoint,
  saveEndpoint,
  onNext,
  onBack,
  onConnect,
  onSkip,
}: {
  service: "Sonarr" | "Radarr";
  icon: typeof Server;
  testEndpoint: string;
  saveEndpoint: string;
  onNext: () => void;
  onBack: () => void;
  onConnect: (service: ConnectedService) => void;
  onSkip: () => void;
}) {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [version, setVersion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestSuccess(false);
    try {
      const res = await fetch(testEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey }),
      });
      const data: unknown = await res.json();

      if (res.ok) {
        const parsed = successWithVersion.safeParse(data);
        if (parsed.success) {
          setTestSuccess(true);
          setVersion(parsed.data.version ?? "");
          toast.success(`${service} connection successful`);
        } else {
          setError("Unexpected response from server");
        }
      } else {
        const err = errorResponse.safeParse(data);
        setError(err.success ? err.data.error : `Could not connect to ${service}`);
      }
    } catch {
      setError("Network error — check the URL and try again");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(saveEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey }),
      });

      if (res.ok) {
        onConnect({ name: service, detail: `v${version}` });
        onNext();
      } else {
        const data: unknown = await res.json();
        const err = errorResponse.safeParse(data);
        setError(err.success ? err.data.error : `Failed to save ${service} config`);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Connect {service}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {service === "Sonarr"
            ? "Sonarr tracks your TV series downloads and monitoring status."
            : "Radarr tracks your movie downloads and availability."}
          {" "}This step is optional.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Server URL</label>
          <Input
            type="url"
            placeholder={`http://${service.toLowerCase()}:${service === "Sonarr" ? "8989" : "7878"}`}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setTestSuccess(false);
              setError(null);
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">API Key</label>
          <Input
            type="text"
            placeholder="Settings > General > API Key"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestSuccess(false);
              setError(null);
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTest}
            disabled={!url || !apiKey || testing}
            variant="secondary"
            className="flex-1"
          >
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test Connection
          </Button>

          {testSuccess && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & Continue
            </Button>
          )}
        </div>

        {testSuccess && (
          <p className="text-xs text-primary">
            <CheckCircle2 className="mr-1 inline h-3 w-3" />
            Connected — {service} v{version}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
          <SkipForward className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Complete Step ---

function CompleteStep({
  connected,
  onFinish,
}: {
  connected: ConnectedService[];
  onFinish: () => void;
}) {
  const skippedServices = ["Sonarr", "Radarr"].filter(
    (s) => !connected.some((c) => c.name === s)
  );

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold">Setup Complete</h2>
        <p className="text-sm text-muted-foreground">
          Your media dashboard is ready.
        </p>
      </div>

      <div className="space-y-3 text-left">
        {connected.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </div>
          </div>
        ))}
        {skippedServices.map((s) => (
          <div
            key={s}
            className="flex items-center gap-3 rounded-md border border-border bg-surface/50 p-3 opacity-50"
          >
            <SkipForward className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{s}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" onClick={onFinish} className="w-full">
        Go to Dashboard
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Main Setup Wizard ---

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [connected, setConnected] = useState<ConnectedService[]>([]);

  const stepIndex = STEPS.indexOf(currentStep);

  function goTo(step: Step) {
    setCurrentStep(step);
  }

  function addConnected(service: ConnectedService) {
    setConnected((prev) => [...prev.filter((s) => s.name !== service.name), service]);
  }

  function handleFinish() {
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <StepIndicator current={stepIndex} total={STEPS.length} />

      {currentStep === "welcome" && (
        <WelcomeStep onNext={() => goTo("jellyfin")} />
      )}

      {currentStep === "jellyfin" && (
        <JellyfinStep
          onNext={() => goTo("sonarr")}
          onBack={() => goTo("welcome")}
          onConnect={addConnected}
        />
      )}

      {currentStep === "sonarr" && (
        <ArrStep
          service="Sonarr"
          icon={Clapperboard}
          testEndpoint="/api/services/sonarr/test"
          saveEndpoint="/api/services/sonarr"
          onNext={() => goTo("radarr")}
          onBack={() => goTo("jellyfin")}
          onConnect={addConnected}
          onSkip={() => goTo("radarr")}
        />
      )}

      {currentStep === "radarr" && (
        <ArrStep
          service="Radarr"
          icon={Film}
          testEndpoint="/api/services/radarr/test"
          saveEndpoint="/api/services/radarr"
          onNext={() => goTo("complete")}
          onBack={() => goTo("sonarr")}
          onConnect={addConnected}
          onSkip={() => goTo("complete")}
        />
      )}

      {currentStep === "complete" && (
        <CompleteStep connected={connected} onFinish={handleFinish} />
      )}
    </div>
  );
}
