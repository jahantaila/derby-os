import { NextResponse } from "next/server";
import { getAllContacts } from "@/lib/rolodex-store";

export async function GET() {
  const contacts = getAllContacts().filter(c => !c.archived);
  const now = Date.now();
  const overdue = contacts.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) < new Date());
  const upcoming = contacts.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) >= new Date() && new Date(c.nextFollowUp) <= new Date(now + 7 * 86400000));
  const stale = contacts.filter(c => {
    const d = c.lastContactedAt ? (now - new Date(c.lastContactedAt).getTime()) / 86400000 : 999;
    return d > 30;
  });
  return NextResponse.json({ overdue, upcoming, stale });
}
