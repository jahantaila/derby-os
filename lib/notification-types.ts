export type NotificationType = "task_complete" | "deploy" | "alert" | "info";

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
  metadata: Record<string, unknown> | null;
};

export type NotificationsResponse = {
  notifications?: NotificationRecord[];
  unreadCount?: number;
  error?: string;
};
