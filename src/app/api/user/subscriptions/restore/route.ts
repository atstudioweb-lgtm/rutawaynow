import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/payments/stripe/client";

const PLAN_LIMITS: Record<string, number> = { single: 1, fortnightly: 3, monthly: 10 };

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const email = session.user.email;

  // Already has active plan?
  const existing = await prisma.subscription.findFirst({ where: { userId, status: "active", expiryAt: { gt: new Date() } } });
  if (existing) return NextResponse.json({ ok: true, subscription: existing, restored: false });

  // Try to find Stripe subscription by email (covers purchases before DB, even with mock user_123)
  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 3 });
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: cust.id, status: "active", limit: 5 });
      for (const s of subs.data) {
        // Try to infer plan from Stripe price or metadata
        const price = s.items.data[0]?.price;
        const amount = price?.unit_amount;
        // Map amount to plan: single 199/990, fortnightly 399/1990, monthly 699/3490 (cents)
        let planId: string | null = (s.metadata as Record<string,string>)?.plan_id || null;
        if (!planId) {
          if (amount === 199 || amount === 990) planId = "single";
          else if (amount === 399 || amount === 1990) planId = "fortnightly";
          else if (amount === 699 || amount === 3490) planId = "monthly";
        }
        if (!planId) continue;
        const max = PLAN_LIMITS[planId] ?? 0;
        const expiry = new Date(s.current_period_end * 1000);
        const created = await prisma.subscription.create({
          data: {
            userId,
            planId,
            provider: "stripe",
            status: "active",
            startAt: new Date(s.start_date * 1000),
            expiryAt: expiry,
            maxItineraries: max,
            usedCount: 0,
            periodKey: planId === "monthly" ? new Date().toISOString().slice(0, 7) : Math.floor(Date.now() / (14 * 24 * 60 * 60 * 1000)).toString(),
            stripeSubscriptionId: s.id,
            stripeSessionId: null,
          },
        });
        return NextResponse.json({ ok: true, subscription: created, restored: true });
      }
      // Also check checkout sessions for one-time single plan
      const sessions = await stripe.checkout.sessions.list({ customer: cust.id, limit: 5 });
      for (const sess of sessions.data) {
        if (sess.payment_status === "paid" && sess.metadata?.plan_id) {
          const planId = sess.metadata.plan_id;
          const max = PLAN_LIMITS[planId] ?? 1;
          const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 10);
          const created = await prisma.subscription.create({
            data: { userId, planId, provider: "stripe", status: "active", startAt: new Date(sess.created * 1000), expiryAt: expiry, maxItineraries: max, usedCount: 0, stripeSessionId: sess.id },
          });
          return NextResponse.json({ ok: true, subscription: created, restored: true });
        }
      }
    }
  } catch (e) { console.error("Restore failed", e); }

  // Fallback: check mock user_123 subscriptions and migrate
  const mockSub = await prisma.subscription.findFirst({ where: { userId: "user_123", status: "active", expiryAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (mockSub) {
    const migrated = await prisma.subscription.update({ where: { id: mockSub.id }, data: { userId } });
    return NextResponse.json({ ok: true, subscription: migrated, restored: true, fromMock: true });
  }

  return NextResponse.json({ error: "No Stripe subscription found to restore" }, { status: 404 });
}
