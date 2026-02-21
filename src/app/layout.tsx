import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HealthIndicator } from "@/components/health-indicator";
import { RefreshButton } from "@/components/refresh-button";
import { Sidebar } from "@/components/sidebar";
import { NavLink } from "@/components/nav-link";
import { ConfigWarningBanner } from "@/components/config-warning-banner";
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
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar — collapsible on tablet, hidden on mobile */}
          <Sidebar />

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

            {/* Mobile navigation */}
            <div className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 md:hidden">
              <NavLink href="/" label="Ready" />
              <NavLink href="/almost-ready" label="Almost" />
              <NavLink href="/languages" label="Languages" />
              <NavLink href="/continue" label="Continue" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
