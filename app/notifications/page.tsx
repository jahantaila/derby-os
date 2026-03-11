"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BookUser, CheckCheck, CircleDot, Funnel, Inbox } from "lucide-react";

type NotificationType = "pipeline" | "rolodex";
type NotificationFilter = "all" | NotificationType;

type NotificationRecord = {
  id: string;
  title: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
};

type NotificationsResponse = {
  notifications?: NotificationRecord[];
  unreadCount?: number;
};

const FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "pipeline", label: "Pipeline" },
  { key: "rolodex", label: "Rolodex" },
];

const TYPE_META: Record<NotificationType, { label: string; icon: typeof Bell; iconClass: string }> = {
  pipeline: { label: "Pipeline", icon: Funnel, iconClass: "text-cyan-100 bg-cyan-500/12 border-cyan-400/30" },
  rolodex: { label: "Rolodex", icon: BookUser, iconClass: "text-blue-100 bg-blue-500/12 border-blue-400/30" },
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(timestamp: string) {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return "";

  const deltaSeconds = Math.round((parsed - Date.now()) / 1000);
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, seconds] of ranges) {
    if (Math.abs(deltaSeconds) >= seconds || unit === "minute") {
      return relativeTimeFormatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }

  return "just now";
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as NotificationsResponse;
        if (!cancelled) {
          setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => filter === "all" || notification.type === filter),
    [filter, notifications],
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function markRead(ids?: string[], all?: boolean) {
    setIsMutating(true);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as NotificationsResponse;
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } finally {
      setIsMutating(false);
    }
  }

  function handleNotificationClick(notification: NotificationRecord) {
    if (notification.read || isMutating) return;
    setNotifications((current) => current.map((entry) => (entry.id === notification.id ? { ...entry, read: true } : entry)));
    void markRead([notification.id]);
  }

  function markAllAsRead() {
    if (!unreadCount || isMutating) return;
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    void markRead(undefined, true);
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Inbox</p>
            <h1 className="page-title mt-2">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Pipeline alerts and rolodex relationship signals in one stream.</p>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={!unreadCount || isMutating}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                filter === item.key ? "border-blue-300/45 bg-blue-500/15 text-blue-50" : "border-white/12 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {visibleNotifications.length ? (
            visibleNotifications.map((notification, index) => {
              const meta = TYPE_META[notification.type];
              const Icon = meta.icon;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="glass-card animate-enter flex w-full items-start gap-4 rounded-2xl p-4 text-left transition hover:bg-white/[0.07]"
                  style={{ animationDelay: `${100 + index * 60}ms` }}
                >
                  <div className={`rounded-2xl border p-3 ${meta.iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-white">{notification.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                          <span>{meta.label}</span>
                          <span className="text-slate-600">•</span>
                          <span>{formatRelativeTime(notification.timestamp)}</span>
                        </div>
                      </div>
                      <CircleDot size={12} className={notification.read ? "text-slate-600" : "text-[#2093FF]"} />
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="glass-card flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
                <Inbox size={22} />
              </div>
              <div>
                <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">
                  {loading ? "Loading Notifications" : "No Notifications"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {loading ? "Fetching the latest pipeline and rolodex activity." : "There are no notifications in the current filter."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 text-xs uppercase tracking-[0.16em] text-slate-500">{unreadCount} unread across all notifications</div>
      </div>
    </section>
  );
}
