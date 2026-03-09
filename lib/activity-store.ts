import fs from "fs";
import path from "path";

export type ActivityRecord = {
  id: string;
  message: string;
  timestamp: string;
  actor: string;
  type: string;
};

export const ACTIVITY_FILE = "activity.json";
const DATA_DIR = path.join(process.env.HOME || "/home/kim", "mission-control-data");

export const ACTIVITY_SEED: ActivityRecord[] = [
  { id: "a1", message: "Kevin deployed agent/employee split", timestamp: "2026-03-09T16:30:00Z", actor: "kevin", type: "deploy" },
  { id: "a2", message: "Sabri completed veteran section rewrite", timestamp: "2026-03-09T00:40:00Z", actor: "sabri", type: "task" },
  { id: "a3", message: "Kimberly sent Bluegrass location targeting", timestamp: "2026-03-09T00:00:00Z", actor: "kimberly", type: "task" },
  { id: "a4", message: "Jahan started Google Ads campaign setup", timestamp: "2026-03-08T23:45:00Z", actor: "jahan", type: "task" },
  { id: "a5", message: "Kevin built Mission Control V3 dashboard", timestamp: "2026-03-08T19:44:00Z", actor: "kevin", type: "deploy" },
  { id: "a6", message: "Alex completed Olympus NextGen analysis", timestamp: "2026-03-07T14:00:00Z", actor: "alex", type: "task" },
  { id: "a7", message: "Sabri built Bluegrass PPC campaign plan", timestamp: "2026-03-07T18:00:00Z", actor: "sabri", type: "task" },
];

function normalizeActivityEntry(entry: unknown): ActivityRecord | null {
  if (!entry || typeof entry !== "object") return null;
  const value = entry as Record<string, unknown>;
  if (typeof value.id !== "string" || !value.id.trim()) return null;
  if (typeof value.message !== "string" || !value.message.trim()) return null;
  if (typeof value.timestamp !== "string" || !value.timestamp.trim()) return null;
  if (typeof value.actor !== "string" || !value.actor.trim()) return null;
  if (typeof value.type !== "string" || !value.type.trim()) return null;

  return {
    id: value.id.trim(),
    message: value.message.trim(),
    timestamp: value.timestamp.trim(),
    actor: value.actor.trim(),
    type: value.type.trim(),
  };
}

export async function getActivity(): Promise<ActivityRecord[]> {
  const fp = path.join(DATA_DIR, ACTIVITY_FILE);
  let raw: unknown = ACTIVITY_SEED;

  try {
    if (fs.existsSync(fp)) {
      raw = JSON.parse(fs.readFileSync(fp, "utf-8"));
    }
  } catch {
    raw = ACTIVITY_SEED;
  }

  if (!Array.isArray(raw)) return ACTIVITY_SEED;
  const normalized = raw
    .map((entry) => normalizeActivityEntry(entry))
    .filter((entry): entry is ActivityRecord => entry !== null)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return normalized.length > 0 ? normalized : ACTIVITY_SEED;
}
