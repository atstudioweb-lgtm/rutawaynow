import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function handleFix() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized - login with Google first" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const active = await prisma.subscription.findFirst({ where: { userId, status: "active" }, orderBy: { createdAt: "desc" } });
  if (!active) return NextResponse.json({ error: "No active subscription to fix" }, { status: 404 });
  const updated = await prisma.subscription.update({ where: { id: active.id }, data: { usedCount: 8 } });
  await prisma.subscription.deleteMany({ where: { userId, status: "cancelled", planId: active.planId } });
  return NextResponse.json({ ok: true, subscription: updated, message: "Fixed to 2/10 remaining" });
}
export async function POST() { return handleFix(); }
export async function GET() { return handleFix(); }
