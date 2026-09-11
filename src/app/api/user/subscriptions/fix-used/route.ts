import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const active = await prisma.subscription.findFirst({ where: { userId, status: "active" }, orderBy: { createdAt: "desc" } });
  if (!active) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  // Set to 8 used = 2 remaining for monthly (as user reported correct status)
  const updated = await prisma.subscription.update({ where: { id: active.id }, data: { usedCount: 8 } });
  // Delete duplicate cancelled with same planId if exists (the 4/10)
  await prisma.subscription.deleteMany({ where: { userId, status: "cancelled", planId: active.planId } });
  return NextResponse.json({ ok: true, subscription: updated });
}
