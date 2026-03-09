import { NextResponse } from "next/server";
import { getActivity } from "@/lib/activity-store";

export async function GET() {
  return NextResponse.json(await getActivity());
}
