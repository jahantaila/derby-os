"use client";

import { useEffect, useState } from "react";

export function TopBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      );

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-surface soft-ring sticky top-0 z-20 flex min-h-14 items-center justify-between rounded-2xl px-4 py-2 md:px-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-blue-200/70">Derby Digital</p>
        <h1 className="bg-gradient-to-r from-[#F8FBFF] via-[#A2CCFF] to-[#2093FF] bg-clip-text text-lg font-semibold text-transparent">
          Mission Control
        </h1>
      </div>
      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-blue-100/90">{time}</span>
    </header>
  );
}
