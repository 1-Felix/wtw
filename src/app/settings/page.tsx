"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageTitle } from "@/components/page-title";
import { useSettings } from "./hooks/use-settings";
import type { SettingsSection } from "./schemas";
import { RulesSection } from "./sections/rules-section";
import { LanguageSection } from "./sections/language-section";
import { OverridesSection } from "./sections/overrides-section";
import { NotificationsSection } from "./sections/notifications-section";
import { DismissedSection } from "./sections/dismissed-section";
import { AboutSection } from "./sections/about-section";
import { ServicesSection } from "./sections/services-section";

const sections: { id: SettingsSection; label: string }[] = [
  { id: "services", label: "Services" },
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
    return "services";
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
    router.replace(`/settings?tab=${activeTab}`, { scroll: false });
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
      <PageTitle icon={<SettingsIcon className="h-5 w-5 text-primary" />}>
        Settings
      </PageTitle>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-6 flex-wrap overflow-hidden">
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="services">
          <ServicesSection />
        </TabsContent>
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
