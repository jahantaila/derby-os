import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

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
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
