import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const PLAN_LIMITS: Record<string, number> = { single: 1, fortnightly: 2, monthly: 8 };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  // body: { plan, expiry, provider, usedCount, itineraries: [], checklists: [] }
  const { plan, expiry, provider, usedCount, itineraries, checklists } = body as {
    plan?: string; expiry?: string; provider?: string; usedCount?: number; itineraries?: unknown[]; checklists?: unknown[];
  };

  let created = false;
  let reason: "created" | "already_active" | "no-op" = "no-op";
  if (plan && expiry) {
    const max = PLAN_LIMITS[plan] ?? 0;
    const expiryAt = new Date(expiry);
    const now = new Date();
    const periodKey = plan === "monthly" ? now.toISOString().slice(0, 7) : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString();
    // Allow a second plan (e.g. Single used up, then Fortnightly). Only skip if same plan already active.
    const samePlanActive = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        planId: plan,
        expiryAt: { gt: now },
      },
    });
    if (samePlanActive) {
      reason = "already_active";
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          planId: plan,
          provider: provider || "stripe",
          status: "active",
          startAt: now,
          expiryAt,
          maxItineraries: max,
          usedCount: typeof usedCount === "number" ? usedCount : 0,
          periodKey: plan === "single" ? null : periodKey,
        },
      });
      created = true;
      reason = "created";
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

  if (Array.isArray(checklists)) {
    for (const ch of checklists as Array<Record<string, unknown>>) {
      try {
        await prisma.checklist.create({
          data: {
            userId,
            items: (ch.items as object) || ch,
            lang: (ch.lang as string) || "pt",
          },
        });
      } catch {}
    }
  }

  console.log("POST /api/user/migrate", { userId, plan, provider, created, reason });
  return NextResponse.json({ ok: true, created, reason });
}
