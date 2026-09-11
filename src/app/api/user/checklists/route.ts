import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.checklist.findMany({ where: { userId: (session.user as { id: string }).id }, orderBy: { createdAt: "desc" }, include: { itinerary: { select: { destination: true } } } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { items, lang, itineraryId, checked } = body as { items: unknown; lang: string; itineraryId?: string; checked?: unknown };
  const created = await prisma.checklist.create({ data: { userId: (session.user as { id: string }).id, itineraryId: itineraryId || null, items: items as object, checked: checked as object | undefined, lang: lang || "pt" } });
  return NextResponse.json(created);
}
