import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.env.HOME || "/home/kim", "mission-control-data");
const DOCS_DIR = path.join(DATA_DIR, "docs");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readData<T>(file: string, fallback: T): T {
  ensureDir(DATA_DIR);
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return fallback;
  try { return JSON.parse(fs.readFileSync(fp, "utf-8")); } catch { return fallback; }
}

export function writeData(file: string, data: unknown) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

export function readDoc(filename: string): string {
  ensureDir(DOCS_DIR);
  const fp = path.join(DOCS_DIR, filename);
  if (!fs.existsSync(fp)) return "";
  return fs.readFileSync(fp, "utf-8");
}

export function writeDoc(filename: string, content: string) {
  ensureDir(DOCS_DIR);
  fs.writeFileSync(path.join(DOCS_DIR, filename), content);
}

export function readMemoryFile(date: string): string | null {
  const fp = path.join(process.env.HOME || "/home/kim", ".openclaw/workspace/memory", `${date}.md`);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, "utf-8");
}

export function listMemoryDates(): string[] {
  const dir = path.join(process.env.HOME || "/home/kim", ".openclaw/workspace/memory");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .map(f => f.replace(".md", ""))
    .sort();
}

export function readLongTermMemory(): string {
  const fp = path.join(process.env.HOME || "/home/kim", ".openclaw/workspace/MEMORY.md");
  if (!fs.existsSync(fp)) return "No long-term memory file found.";
  return fs.readFileSync(fp, "utf-8");
}

export function readCronJobs(): unknown[] {
  const fp = path.join(process.env.HOME || "/home/kim", ".openclaw/cron/jobs.json");
  if (!fs.existsSync(fp)) return [];
  try { return JSON.parse(fs.readFileSync(fp, "utf-8")); } catch { return []; }
}
