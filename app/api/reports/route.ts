import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";
import { seedReports, type ReportItem } from "@/lib/mission-control";

const FILE = "reports.json";

const SCAN_TARGETS: Array<{ generatedBy: "Alex" | "Sabri"; dir: string }> = [
  { generatedBy: "Alex", dir: "/home/kim/.openclaw/workspace/agents/alex/projects" },
  { generatedBy: "Sabri", dir: "/home/kim/.openclaw/workspace/agents/sabri/projects" },
];

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }

    const lower = entry.name.toLowerCase();
    if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      out.push(fullPath);
    }
  }

  return out;
}

function inferReportType(name: string): ReportItem["type"] {
  const normalized = name.toLowerCase();
  if (normalized.includes("proposal")) return "Proposal";
  if (normalized.includes("campaign") || normalized.includes("plan")) return "Campaign Plan";
  if (normalized.includes("optim")) return "Optimization Report";
  return "Analysis";
}

function inferClient(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("bluegrass")) return "Bluegrass Garage Door";
  if (normalized.includes("palma")) return "Palma Italian Kitchen";
  if (normalized.includes("olympus")) return "Olympus Gaming Lounge";
  return "Internal";
}

function toScannedReport(filePath: string, generatedBy: "Alex" | "Sabri"): ReportItem {
  const stat = fs.statSync(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const folderName = path.basename(path.dirname(filePath));
  const titleRaw = baseName.replace(/[-_]+/g, " ").trim();
  const title = titleRaw.length > 2 ? titleRaw : folderName.replace(/[-_]+/g, " ");

  return {
    id: `report-${generatedBy.toLowerCase()}-${Buffer.from(filePath).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
    title: title.replace(/\b\w/g, (c) => c.toUpperCase()),
    type: inferReportType(`${title} ${folderName}`),
    client: inferClient(`${title} ${folderName}`),
    generatedBy,
    dateGenerated: new Date(stat.mtime).toISOString().slice(0, 10),
    path: filePath,
  };
}

function scanReports(): ReportItem[] {
  const scanned: ReportItem[] = [];

  for (const target of SCAN_TARGETS) {
    const files = walkFiles(target.dir);
    for (const filePath of files) {
      scanned.push(toScannedReport(filePath, target.generatedBy));
    }
  }

  return scanned;
}

function mergeReports(stored: ReportItem[], scanned: ReportItem[]): ReportItem[] {
  const byPath = new Map<string, ReportItem>();
  for (const report of [...stored, ...scanned]) {
    byPath.set(report.path, report);
  }

  return Array.from(byPath.values()).sort((a, b) => b.dateGenerated.localeCompare(a.dateGenerated));
}

export async function GET() {
  const stored = readData<ReportItem[]>(FILE, seedReports);
  const scanned = scanReports();
  const merged = mergeReports(stored, scanned);
  writeData(FILE, merged);
  return NextResponse.json(merged);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<ReportItem, "id"> & { id?: string };
  const existing = readData<ReportItem[]>(FILE, seedReports);

  const item: ReportItem = {
    id: body.id || `report-${Date.now()}`,
    title: body.title,
    type: body.type,
    client: body.client,
    generatedBy: body.generatedBy,
    dateGenerated: body.dateGenerated,
    path: body.path,
  };

  const next = mergeReports(existing, [item]);
  writeData(FILE, next);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as ReportItem;
  const existing = readData<ReportItem[]>(FILE, seedReports);
  const next = existing.map((entry) => (entry.id === body.id ? { ...entry, ...body } : entry));
  writeData(FILE, next);
  return NextResponse.json(body);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const existing = readData<ReportItem[]>(FILE, seedReports);
  const next = existing.filter((entry) => entry.id !== id);
  writeData(FILE, next);
  return NextResponse.json({ ok: true });
}
