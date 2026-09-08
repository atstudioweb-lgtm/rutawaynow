import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const PLAN_LIMITS: Record<string, number> = { single: 1, fortnightly: 3, monthly: 10 };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  // body: { plan, expiry, provider, usedCount, itineraries: [] }
  const { plan, expiry, provider, usedCount, itineraries } = body as {
    plan?: string; expiry?: string; provider?: string; usedCount?: number; itineraries?: unknown[];
  };

  if (plan && expiry) {
    const max = PLAN_LIMITS[plan] ?? 0;
    const expiryAt = new Date(expiry);
    const existing = await prisma.subscription.findFirst({ where: { userId, status: "active" } });
    if (!existing) {
      await prisma.subscription.create({
        data: {
          userId,
          planId: plan,
          provider: provider || "stripe",
          status: "active",
          startAt: new Date(),
          expiryAt,
          maxItineraries: max,
          usedCount: typeof usedCount === "number" ? usedCount : 0,
          periodKey: plan === "monthly" ? new Date().toISOString().slice(0, 7) : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString(),
        },
      });
    }
  }

  if (Array.isArray(itineraries)) {
    for (const it of itineraries as Array<Record<string, unknown>>) {
      try {
        await prisma.itinerary.create({
          data: {
            userId,
            destination: (it.destination as string) || "Migrated",
            month: (it.month as string) || "",
            days: (it.days as number) || 1,
            budget: (it.budget as string) || "medio",
            adults: (it.adults as number) || 1,
            teens: (it.teens as number) || 0,
            children: (it.children as number) || 0,
            styles: (it.styles as unknown) || [],
            lang: (it.lang as string) || "pt",
            roteiro: (it.roteiro as object) || it,
          },
        });
      } catch {}
    }
  }

  return NextResponse.json({ ok: true });
}
