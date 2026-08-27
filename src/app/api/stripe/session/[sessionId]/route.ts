import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const meta = session.metadata as Record<string, string> | null;
    return NextResponse.json({
      planType: meta?.planType ?? meta?.plan_id,
    });
  } catch (error) {
    console.error('Failed to retrieve Stripe session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}