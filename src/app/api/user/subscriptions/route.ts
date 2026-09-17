import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getServerPlanStatus } from "@/lib/server-plan";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const email = (session.user as { email?: string }).email;
  console.log("GET /api/user/subscriptions", { userId, email });
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "pt";
  const status = await getServerPlanStatus(userId, lang);
  const subs = await prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  console.log("Found subs", subs.length, subs.map(s=> ({ id: s.id, planId: s.planId, status: s.status, userId: s.userId })));

  // Heal duplicates: keep at most one active subscription per plan (newest), expire the rest
  const activeIdsByPlan = new Map<string, string[]>();
  for (const s of subs) {
    if (s.status === "active") {
      const ids = activeIdsByPlan.get(s.planId) ?? [];
      ids.push(s.id);
      activeIdsByPlan.set(s.planId, ids);
    }
  }
  const toExpire: string[] = [];
  for (const ids of activeIdsByPlan.values()) {
    if (ids.length > 1) toExpire.push(...ids.slice(1));
  }
  if (toExpire.length > 0) {
    await prisma.subscription.updateMany({ where: { id: { in: toExpire } }, data: { status: "expired" } });
    console.log("Healed duplicate subscriptions", { userId, expired: toExpire.length });
  }
  const healedSubs = toExpire.length > 0
    ? await prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    : subs;

  return NextResponse.json({ status, subscriptions: healedSubs });
}
