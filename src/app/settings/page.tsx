"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence, crossFadeVariants } from "@/components/ui/motion";
import { PageTitle } from "@/components/page-title";
import { useSettings } from "./hooks/use-settings";
import type { SettingsSection } from "./schemas";
import { RulesSection } from "./sections/rules-section";
import { NotificationsSection } from "./sections/notifications-section";
import { DismissedSection } from "./sections/dismissed-section";
import { AboutSection } from "./sections/about-section";
import { ServicesSection } from "./sections/services-section";

const sections: { id: SettingsSection; label: string }[] = [
  { id: "rules", label: "Rules" },
  { id: "services", label: "Services" },
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={crossFadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <TabsContent value="services" forceMount={activeTab === "services" ? true : undefined}>
              {activeTab === "services" && <ServicesSection />}
            </TabsContent>
            <TabsContent value="rules" forceMount={activeTab === "rules" ? true : undefined}>
              {activeTab === "rules" && <RulesSection config={config} onChange={setConfig} />}
            </TabsContent>
            <TabsContent value="notifications" forceMount={activeTab === "notifications" ? true : undefined}>
              {activeTab === "notifications" && (
                <NotificationsSection
                  webhooks={webhooks}
                  onWebhooksChange={setWebhooks}
                />
              )}
            </TabsContent>
            <TabsContent value="dismissed" forceMount={activeTab === "dismissed" ? true : undefined}>
              {activeTab === "dismissed" && (
                <DismissedSection
                  items={dismissed}
                  onItemsChange={setDismissed}
                />
              )}
            </TabsContent>
            <TabsContent value="about" forceMount={activeTab === "about" ? true : undefined}>
              {activeTab === "about" && <AboutSection />}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
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
