"use client";
import { useEffect, useState } from "react";

export function TopBar() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }));
    update();
    const i = setInterval(update, 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <h1 className="text-lg font-bold">
        <span className="text-primary">Mission Control</span>
      </h1>
      <span className="text-sm text-muted-foreground">{time}</span>
    </header>
  );
}
