import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const it = await prisma.itinerary.findFirst({ where: { id, userId: (session.user as { id: string }).id } });
  if (!it) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(it);
}
