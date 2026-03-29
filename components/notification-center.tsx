"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Bell, CheckCheck, Rocket, ShieldAlert, Info, ClipboardCheck, Inbox, X } from "lucide-react";
import type { NotificationRecord, NotificationsResponse, NotificationType } from "@/lib/notification-types";

const POLL_INTERVAL_MS = 30000;

const TYPE_META: Record<NotificationType, { label: string; icon: typeof Bell; iconClass: string }> = {
  task_complete: {
    label: "Task Complete",
    icon: ClipboardCheck,
    iconClass: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
  },
  deploy: {
    label: "Deploy",
    icon: Rocket,
    iconClass: "border-sky-400/25 bg-sky-500/12 text-sky-100",
  },
  alert: {
    label: "Alert",
    icon: ShieldAlert,
    iconClass: "border-amber-400/25 bg-amber-500/12 text-amber-100",
  },
  info: {
    label: "Info",
    icon: Info,
    iconClass: "border-slate-300/20 bg-white/8 text-slate-100",
  },
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

type NotificationCenterState = {
  notifications: NotificationRecord[];
  unreadCount: number;
  open: boolean;
  loading: boolean;
  isMutating: boolean;
  setOpen: (open: boolean) => void;
  handleNotificationClick: (notification: NotificationRecord) => void;
  markAllAsRead: () => void;
};

const NotificationCenterContext = createContext<NotificationCenterState | null>(null);

function useNotificationCenter() {
  const value = useContext(NotificationCenterContext);
  if (!value) {
    throw new Error("Notification center components must be wrapped in NotificationCenterProvider.");
  }
  return value;
}

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

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as NotificationsResponse;
        if (cancelled) return;

        const nextNotifications = Array.isArray(data.notifications) ? data.notifications : [];
        setNotifications(nextNotifications);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function refreshFromReadRequest(payload: { ids?: string[]; all?: boolean }) {
    setIsMutating(true);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return;

      const data = (await response.json()) as NotificationsResponse;
      const nextNotifications = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(nextNotifications);
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } finally {
      setIsMutating(false);
    }
  }

  function handleNotificationClick(notification: NotificationRecord) {
    if (notification.read || isMutating) return;

    setNotifications((current) =>
      current.map((entry) => (entry.id === notification.id ? { ...entry, read: true } : entry)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    void refreshFromReadRequest({ ids: [notification.id] });
  }

  function markAllAsRead() {
    if (!unreadCount || isMutating) return;

    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);
    void refreshFromReadRequest({ all: true });
  }

  const value = {
    notifications,
    unreadCount,
    open,
    loading,
    isMutating,
    setOpen,
    handleNotificationClick,
    markAllAsRead,
  };

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function NotificationCenterTrigger({ className = "" }: { className?: string }) {
  const { unreadCount, open, setOpen } = useNotificationCenter();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={className}
      aria-label={`Open notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
      aria-expanded={open}
    >
      <Bell size={18} />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-1 text-[10px] font-semibold text-white shadow-[0_0_16px_rgba(32,147,255,0.45)]">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
      <span className="sidebar-rail-tooltip">Notifications</span>
    </button>
  );
}

export function NotificationCenterPanel() {
  const { notifications, unreadCount, open, loading, isMutating, setOpen, handleNotificationClick, markAllAsRead } =
    useNotificationCenter();

  return (
    <div
      className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        aria-label="Close notifications"
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[24rem] flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(10,10,15,0.98),rgba(13,18,30,0.98))] shadow-[-24px_0_48px_rgba(0,0,0,0.45)] transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Inbox</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Notification Center</h2>
            <p className="mt-1 text-sm text-slate-400">{unreadCount} unread across recent events</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recent events</p>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={!unreadCount || isMutating}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-300/25 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-50 transition hover:border-blue-300/45 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {notifications.length ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const meta = TYPE_META[notification.type];
                const Icon = meta.icon;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      notification.read
                        ? "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]"
                        : "border-blue-400/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl border p-3 ${meta.iconClass}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{notification.title}</p>
                            {notification.message ? <p className="mt-1 text-sm text-slate-400">{notification.message}</p> : null}
                          </div>
                          {!notification.read ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#2093FF]" /> : null}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          <span>{meta.label}</span>
                          <span className="text-slate-700">•</span>
                          <span>{formatRelativeTime(notification.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-full flex-col items-center justify-center gap-3 rounded-3xl border border-white/8 bg-white/[0.03] p-8 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
                <Inbox size={22} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{loading ? "Loading Notifications" : "No Notifications"}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {loading ? "Fetching the latest activity from Supabase." : "Recent events will appear here as they come in."}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
