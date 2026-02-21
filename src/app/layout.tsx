import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HealthIndicator } from "@/components/health-indicator";
import { RefreshButton } from "@/components/refresh-button";
import { Sidebar } from "@/components/sidebar";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { ConfigWarningBanner } from "@/components/config-warning-banner";
import { getNavCounts } from "@/lib/counts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "wtw — What to Watch",
  description:
    "Self-hosted dashboard for your Jellyfin media stack. See what's ready to watch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const counts = getNavCounts();

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar — collapsible on tablet, hidden on mobile */}
          <Sidebar counts={counts} />

          {/* Main content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 md:px-6">
              {/* Mobile logo */}
              <div className="flex items-center gap-3 md:hidden">
                <span className="text-lg font-semibold tracking-tight text-primary">
                  wtw
                </span>
              </div>
              <div className="hidden md:block">
                <HealthIndicator />
              </div>
              <div className="flex items-center gap-3">
                <div className="md:hidden">
                  <HealthIndicator />
                </div>
                <RefreshButton />
              </div>
            </header>

            {/* Config warning banner */}
            <ConfigWarningBanner />

            <div className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile bottom tab bar */}
        <BottomTabBar counts={counts} />
      </body>
    </html>
  );
}
