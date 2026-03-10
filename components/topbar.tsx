"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

const TIME_ZONE = "America/New_York";
const UNREAD_COUNT = 3;

export function TopBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: TIME_ZONE,
          timeZoneName: "short",
        }).format(new Date()),
      );

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-surface soft-ring sticky top-0 z-20 flex min-h-14 items-center justify-between rounded-2xl px-4 py-2 md:px-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-blue-200/70">Derby Digital</p>
        <h1 className="heading-font bg-gradient-to-r from-[#F8FBFF] via-[#A2CCFF] to-[#2093FF] bg-clip-text text-lg font-normal uppercase tracking-[0.06em] text-transparent">
          Mission Control
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          aria-label={`Notifications (${UNREAD_COUNT} unread)`}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/20 bg-white/5 text-blue-50 transition hover:border-blue-300/45 hover:bg-white/10"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-1 text-[10px] font-semibold text-white shadow-[0_0_16px_rgba(32,147,255,0.45)]">
            {UNREAD_COUNT}
          </span>
        </Link>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-blue-100/90">{time}</span>
      </div>
    </header>
  );
}
