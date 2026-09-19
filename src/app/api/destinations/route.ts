import { NextRequest, NextResponse } from "next/server";
import { findDestinations } from "@/lib/travel/destinations";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ destinations: [] });
  }
  return NextResponse.json({ destinations: findDestinations(q, 8) });
}