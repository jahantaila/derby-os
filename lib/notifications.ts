import { supabaseReq } from "@/lib/finance-server";
import type { NotificationRecord, NotificationType } from "@/lib/notification-types";

const MAX_NOTIFICATIONS = 50;

type NotificationRow = {
  id?: string;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  created_at?: string | null;
  read_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeType(value: string | null | undefined): NotificationType {
  switch (value) {
    case "task_complete":
    case "deploy":
    case "alert":
    case "info":
      return value;
    default:
      return "info";
  }
}

function normalizeNotification(row: NotificationRow): NotificationRecord | null {
  if (!row.id) return null;

  return {
    id: row.id,
    title: row.title?.trim() || row.message?.trim() || "Notification",
    message: row.body?.trim() || "",
    timestamp: row.created_at || new Date(0).toISOString(),
    type: normalizeType(row.type),
    read: Boolean(row.read_at),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : null,
  };
}

export async function getNotifications() {
  const rows = (await supabaseReq("GET", "notifications", {
    params: `select=*&order=created_at.desc&limit=${MAX_NOTIFICATIONS}`,
  })) as NotificationRow[];

  const notifications = rows.map(normalizeNotification).filter((row): row is NotificationRecord => Boolean(row));

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
  };
}

export async function markNotificationsRead(input: { ids?: string[]; all?: boolean }) {
  const readAt = new Date().toISOString();

  if (input.all) {
    await supabaseReq("PATCH", "notifications", {
      params: "read_at=is.null",
      body: { read_at: readAt },
      headers: { Prefer: "return=minimal" },
    });

    return getNotifications();
  }

  const ids = Array.isArray(input.ids) ? input.ids.filter((id) => typeof id === "string" && id.trim()) : [];
  if (!ids.length) {
    return getNotifications();
  }

  await supabaseReq("PATCH", "notifications", {
    params: `id=in.(${ids.join(",")})&read_at=is.null`,
    body: { read_at: readAt },
    headers: { Prefer: "return=minimal" },
  });

  return getNotifications();
}
