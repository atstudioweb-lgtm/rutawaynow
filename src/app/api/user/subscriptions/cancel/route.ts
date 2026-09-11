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
  if (!sub.stripeSubscriptionId) return NextResponse.json({ error: "No Stripe subscription ID" }, { status: 400 });

  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  } catch (e) {
    console.error("Stripe cancel failed", e);
    return NextResponse.json({ error: "Failed to cancel on Stripe" }, { status: 500 });
  }

  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "cancelled" } });
  return NextResponse.json({ ok: true });
}
