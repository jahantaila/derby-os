import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CommandPalette } from "@/components/command-palette";
import { PageTransition } from "@/components/page-transition";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Derby Digital Mission Control",
  description: "Premium operations dashboard for Derby Digital",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={geist.variable}>
        <div className="app-bg" aria-hidden />
        <div className="app-orb app-orb-one" aria-hidden />
        <div className="app-orb app-orb-two" aria-hidden />
        <div className="app-orb app-orb-three" aria-hidden />

        <div className="app-shell">
          <Sidebar />
          <main className="app-main">
            <div className="space-y-6">
              <TopBar />
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}
