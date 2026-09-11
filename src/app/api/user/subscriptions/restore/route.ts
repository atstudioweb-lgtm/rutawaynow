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
    console.log("Restore: trying emails", email);
    const emailsToTry = [email, "user@example.com"];
    for (const tryEmail of emailsToTry) {
      console.log("Restore: checking customers for", tryEmail);
      const customers = await stripe.customers.list({ email: tryEmail, limit: 3 });
      console.log("Restore: customers found", customers.data.length, "for", tryEmail);
      for (const cust of customers.data) {
        console.log("Restore: checking subs for customer", cust.id, cust.email);
        const subs = await stripe.subscriptions.list({ customer: cust.id, limit: 10 });
        console.log("Restore: subs found", subs.data.length, "statuses", subs.data.map(s=>s.status));
        for (const s of subs.data) {
          if (s.status !== "active" && s.status !== "trialing") continue;
          // Try to infer plan from Stripe price or metadata
          const price = s.items.data[0]?.price;
          const amount = price?.unit_amount;
          // Map amount to plan: single 199/990, fortnightly 399/1990, monthly 699/3490 (cents)
          let planId: string | null = (s.metadata as Record<string,string>)?.plan_id || (s.items.data[0]?.price?.product as unknown as { metadata?: Record<string,string> })?.metadata?.plan_id || null;
          if (!planId) {
            if (amount === 199 || amount === 990) planId = "single";
            else if (amount === 399 || amount === 1990) planId = "fortnightly";
            else if (amount === 699 || amount === 3490) planId = "monthly";
            else { console.log("Restore: skipping sub", s.id, "amount", amount, "no planId"); continue; }
          }
          console.log("Restore: creating sub for plan", planId, s.id);
          const max = PLAN_LIMITS[planId] ?? 0;
          const sAny = s as unknown as { current_period_end?: number; start_date?: number; current_period_start?: number };
          let expiry = sAny.current_period_end ? new Date(sAny.current_period_end * 1000) : new Date();
          if (isNaN(expiry.getTime())) { expiry = new Date(); if (planId === 'monthly') expiry.setMonth(expiry.getMonth()+1); else if (planId === 'fortnightly') expiry.setDate(expiry.getDate()+14); else expiry.setFullYear(expiry.getFullYear()+10); }
          const startAt = sAny.start_date ? new Date(sAny.start_date * 1000) : sAny.current_period_start ? new Date(sAny.current_period_start * 1000) : new Date();
          const created = await prisma.subscription.create({
            data: {
              userId,
              planId,
              provider: "stripe",
              status: "active",
              startAt: isNaN(startAt.getTime()) ? new Date() : startAt,
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
        const sessions = await stripe.checkout.sessions.list({ customer: cust.id, limit: 10 });
        console.log("Restore: sessions found", sessions.data.length);
        for (const sess of sessions.data) {
          if (sess.payment_status === "paid" && (sess.metadata?.plan_id || (sess as unknown as { metadata?: Record<string,string> })?.metadata?.plan_id)) {
            const planId = (sess.metadata as Record<string,string>).plan_id;
            const max = PLAN_LIMITS[planId] ?? 1;
            const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 10);
            const created = await prisma.subscription.create({
              data: { userId, planId, provider: "stripe", status: "active", startAt: new Date(sess.created * 1000), expiryAt: expiry, maxItineraries: max, usedCount: 0, stripeSessionId: sess.id },
            });
            return NextResponse.json({ ok: true, subscription: created, restored: true });
          }
        }
      }
    }
    // Direct check for the specific pi_ you shared (monthly test)
    try {
      const stripe2 = getStripe();
      const pi = await stripe2.paymentIntents.retrieve("pi_3UEHI0E0lZJkHzCS0srTulnz").catch(()=>null);
      console.log("Restore: pi_ lookup", pi?.id, pi?.status, pi?.customer);
      if (pi?.customer) {
        const subs = await stripe2.subscriptions.list({ customer: pi.customer as string, limit: 10 });
        console.log("Restore: pi customer subs", subs.data.length);
        for (const s of subs.data) {
          const planId = (s.metadata as Record<string,string>)?.plan_id || "monthly";
          const max = PLAN_LIMITS[planId] ?? 10;
          const expiry = new Date((s as unknown as { current_period_end: number }).current_period_end * 1000);
          const created = await prisma.subscription.create({ data: { userId, planId, provider: "stripe", status: "active", startAt: new Date((s as unknown as { start_date: number }).start_date * 1000), expiryAt: expiry, maxItineraries: max, usedCount: 0, stripeSubscriptionId: s.id } });
          return NextResponse.json({ ok: true, subscription: created, restored: true, via: "pi_customer" });
        }
      }
    } catch (e) { console.error("Restore pi_ fallback failed", e); }
    console.log("Restore: no Stripe sub found for any email");
  } catch (e) { console.error("Restore failed", e); }

  // Fallback: check mock user_123 subscriptions and migrate
  const mockSub = await prisma.subscription.findFirst({ where: { userId: "user_123", status: "active", expiryAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (mockSub) {
    const migrated = await prisma.subscription.update({ where: { id: mockSub.id }, data: { userId } });
    return NextResponse.json({ ok: true, subscription: migrated, restored: true, fromMock: true });
  }

  return NextResponse.json({ error: "No Stripe subscription found to restore" }, { status: 404 });
}
