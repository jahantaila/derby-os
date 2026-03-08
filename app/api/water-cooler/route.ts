import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";

type WaterCoolerMessage = {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
};

type WaterCoolerPostBody = {
  from?: string;
  to?: string;
  message?: string;
};

const FILE = "water-cooler.json";
const FALLBACK_MESSAGES: WaterCoolerMessage[] = [
  {
    id: "wc1",
    from: "Kimberly",
    to: "Kevin",
    message: "Morning sync at the cooler? Need your ETA on the office UI polish.",
    timestamp: "2026-03-04T13:10:00.000Z",
  },
  {
    id: "wc2",
    from: "Kevin",
    to: "Kimberly",
    message: "On it. I can have the panel interactions done before lunch.",
    timestamp: "2026-03-04T13:12:00.000Z",
  },
  {
    id: "wc3",
    from: "Kimberly",
    to: "Kevin",
    message: "Perfect. Let's keep status set to water-cooler while we're chatting here.",
    timestamp: "2026-03-04T13:13:00.000Z",
  },
  {
    id: "wc4",
    from: "Kevin",
    to: "Kimberly",
    message: "Copy that. I'll wire the feed and badge into office telemetry.",
    timestamp: "2026-03-04T13:14:00.000Z",
  },
];

function normalizeMessages(input: WaterCoolerMessage[]) {
  return [...input]
    .filter((message) => message && typeof message.id === "string" && typeof message.timestamp === "string")
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-50);
}

export async function GET() {
  const raw = readData<WaterCoolerMessage[]>(FILE, FALLBACK_MESSAGES);
  const data = normalizeMessages(raw);
  writeData(FILE, data);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  let body: WaterCoolerPostBody;

  try {
    body = (await req.json()) as WaterCoolerPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const from = (body.from || "").trim();
  const to = (body.to || "").trim();
  const message = (body.message || "").trim();

  if (!from || !to || !message) {
    return NextResponse.json(
      { error: "Fields 'from', 'to', and 'message' are required" },
      { status: 400 },
    );
  }

  const data = normalizeMessages(readData<WaterCoolerMessage[]>(FILE, FALLBACK_MESSAGES));
  const item: WaterCoolerMessage = {
    id: `wc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    to,
    message,
    timestamp: new Date().toISOString(),
  };
  const next = [...data, item].slice(-50);
  writeData(FILE, next);
  return NextResponse.json(item, { status: 201 });
}
