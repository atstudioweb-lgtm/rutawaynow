import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  await prisma.checklist.deleteMany({ where: { userId } });
  await prisma.itinerary.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  // also clean mock user_123 if exists (previous bug)
  await prisma.subscription.deleteMany({ where: { userId: "user_123" } });
  return NextResponse.json({ ok: true, cleaned: true });
}
