import { NextResponse } from "next/server";
import { readMemoryFile, listMemoryDates, readLongTermMemory } from "@/lib/data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type");

  if (type === "longterm") {
    return NextResponse.json({ content: readLongTermMemory() });
  }
  if (type === "dates") {
    return NextResponse.json({ dates: listMemoryDates() });
  }
  if (date) {
    const content = readMemoryFile(date);
    return NextResponse.json({ content: content || "No memory for this date." });
  }
  return NextResponse.json({ dates: listMemoryDates() });
}
