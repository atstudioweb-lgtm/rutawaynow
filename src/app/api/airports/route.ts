import { NextRequest, NextResponse } from "next/server";
import { findAirports } from "@/lib/flights/airports";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ airports: [] });
  }
  return NextResponse.json({ airports: findAirports(q, 8) });
}