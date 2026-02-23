"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSettings } from "./hooks/use-settings";
import type { SettingsSection } from "./schemas";
import { RulesSection } from "./sections/rules-section";
import { LanguageSection } from "./sections/language-section";
import { OverridesSection } from "./sections/overrides-section";
import { NotificationsSection } from "./sections/notifications-section";
import { DismissedSection } from "./sections/dismissed-section";
import { AboutSection } from "./sections/about-section";

const sections: { id: SettingsSection; label: string }[] = [
  { id: "rules", label: "Rules" },
  { id: "language", label: "Language" },
  { id: "overrides", label: "Overrides" },
  { id: "notifications", label: "Notifications" },
  { id: "dismissed", label: "Dismissed" },
  { id: "about", label: "About" },
];

const validTabs = new Set(sections.map((s) => s.id));

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>(() => {
    const param = searchParams.get("tab");
    if (param && validTabs.has(param as SettingsSection)) return param;
    return "rules";
  });

  const {
    config,
    setConfig,
    webhooks,
    setWebhooks,
    dismissed,
    setDismissed,
    loading,
  } = useSettings();

  // Update URL on tab change
  useEffect(() => {
    if (activeTab === "rules") {
      router.replace("/settings", { scroll: false });
    } else {
      router.replace(`/settings?tab=${activeTab}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (loading || !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-6 overflow-x-auto overscroll-x-contain">
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="rules">
          <RulesSection config={config} onChange={setConfig} />
        </TabsContent>
        <TabsContent value="language">
          <LanguageSection config={config} onChange={setConfig} />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesSection config={config} onChange={setConfig} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsSection
            webhooks={webhooks}
            onWebhooksChange={setWebhooks}
          />
        </TabsContent>
        <TabsContent value="dismissed">
          <DismissedSection
            items={dismissed}
            onItemsChange={setDismissed}
          />
        </TabsContent>
        <TabsContent value="about">
          <AboutSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
