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
  return NextResponse.json({ status, subscriptions: subs });
}
