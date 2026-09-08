import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getServerPlanStatus } from "@/lib/server-plan";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "pt";
  const status = await getServerPlanStatus((session.user as { id: string }).id, lang);
  const subs = await prisma.subscription.findMany({ where: { userId: (session.user as { id: string }).id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ status, subscriptions: subs });
}
