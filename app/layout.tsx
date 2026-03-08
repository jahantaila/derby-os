import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Derby Digital Mission Control",
  description: "Internal dashboard for Derby Digital operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={geist.className}>
        <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-foreground">
          <div className="pointer-events-none absolute -left-28 top-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(32,147,255,0.32),rgba(32,147,255,0)_70%)] blur-2xl" />
          <div className="pointer-events-none absolute right-[-8rem] top-[22%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(0,38,255,0.28),rgba(0,38,255,0)_70%)] blur-2xl" />
          <div className="pointer-events-none absolute bottom-[-9rem] left-[38%] h-[23rem] w-[23rem] rounded-full bg-[radial-gradient(circle,rgba(13,80,255,0.22),rgba(13,80,255,0)_70%)] blur-2xl" />

          <div className="relative z-10 flex min-h-screen gap-3 p-3 md:gap-5 md:p-5">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="glass-surface relative mt-3 flex-1 overflow-y-auto rounded-3xl p-4 transition-all duration-300 md:p-7">
                <div className="subtle-grid pointer-events-none absolute inset-0 rounded-3xl opacity-[0.08]" />
                <div className="relative z-10">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
