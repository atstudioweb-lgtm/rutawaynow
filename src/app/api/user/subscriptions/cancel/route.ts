import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/payments/stripe/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(()=> ({}));
  const { subscriptionId } = body as { subscriptionId?: string };

  const sub = subscriptionId
    ? await prisma.subscription.findFirst({ where: { id: subscriptionId, userId } })
    : await prisma.subscription.findFirst({ where: { userId, status: "active" }, orderBy: { createdAt: "desc" } });

  if (!sub) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  if (sub.planId === "single") return NextResponse.json({ error: "Single plan cannot be cancelled" }, { status: 400 });
  if (sub.provider !== "stripe") return NextResponse.json({ error: "Only Stripe subscriptions can be cancelled here" }, { status: 400 });
  let stripeSubId = sub.stripeSubscriptionId;
  // Fallback for old subscriptions created before stripeSubscriptionId was saved (or localStorage-only plans)
  if (!stripeSubId) {
    try {
      const stripe = getStripe();
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const emailsToTry = [user?.email, "user@example.com"].filter(Boolean) as string[];
      for (const email of emailsToTry) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data[0]) {
          const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 5 });
          if (subs.data[0]) { stripeSubId = subs.data[0].id; break; }
          const subsAll = await stripe.subscriptions.list({ customer: customers.data[0].id, limit: 5 });
          if (subsAll.data[0]) { stripeSubId = subsAll.data[0].id; break; }
        }
      }
    } catch (e) { console.error("Fallback Stripe lookup failed", e); }
  }
  if (!stripeSubId) {
    // No Stripe subscription found — keep DB active until expiry so user keeps remaining itineraries (e.g., 5/10)
    return NextResponse.json({ ok: true, warning: "No Stripe subscription found, keeping active until expiry" });
  }

  try {
    const stripe = getStripe();
    // Cancel at period end so user keeps remaining itineraries until expiry (e.g., 5/10)
    await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
  } catch (e) {
    console.error("Stripe cancel failed", e);
    return NextResponse.json({ error: "Failed to cancel on Stripe" }, { status: 500 });
  }

  // Keep DB active until expiry (Stripe will handle period end) — don't mark as cancelled immediately
  return NextResponse.json({ ok: true, cancelledAtPeriodEnd: true });
}
