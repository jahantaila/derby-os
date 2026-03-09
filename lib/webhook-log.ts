import { readData, writeData } from "@/lib/data";

export type InstantlyWebhookLogEntry = {
  id: string;
  timestamp: string;
  email: string;
  company: string;
  status: "processed" | "error";
  dealId: string;
};

const WEBHOOK_LOG_FILE = "webhook-log.json";

export function getInstantlyWebhookLog(): InstantlyWebhookLogEntry[] {
  const data = readData<unknown>(WEBHOOK_LOG_FILE, []);
  if (!Array.isArray(data)) return [];
  return data
    .filter((entry): entry is InstantlyWebhookLogEntry => {
      if (!entry || typeof entry !== "object") return false;
      const record = entry as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        typeof record.timestamp === "string" &&
        typeof record.email === "string" &&
        typeof record.company === "string" &&
        (record.status === "processed" || record.status === "error") &&
        typeof record.dealId === "string"
      );
    })
    .slice(0, 50);
}

export function appendInstantlyWebhookLog(entry: InstantlyWebhookLogEntry) {
  const current = getInstantlyWebhookLog();
  const next = [entry, ...current].slice(0, 50);
  writeData(WEBHOOK_LOG_FILE, next);
}
