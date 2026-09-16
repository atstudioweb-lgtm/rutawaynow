import { createHmac, timingSafeEqual } from 'crypto';
import { mercadoPagoConfig } from './client';

interface MercadoPagoSignatureParts {
  ts: string;
  v1: string;
}

function parseSignature(signature: string | null): MercadoPagoSignatureParts | null {
  if (!signature) return null;
  const parts: MercadoPagoSignatureParts = { ts: '', v1: '' };
  for (const pair of signature.split(',')) {
    const [key, ...rest] = pair.split('=');
    const value = rest.join('=');
    if (key === 'ts') parts.ts = value;
    if (key === 'v1') parts.v1 = value;
  }
  return parts.ts && parts.v1 ? parts : null;
}

/**
 * Verifies the x-signature header Mercado Pago sends on webhook deliveries.
 * Format: `ts=<timestamp>,v1=<hmac-sha256 hex>` where the signed manifest is
 * `id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;`. Per Mercado Pago
 * docs, `data.id` comes from the notification URL query params (lowercased),
 * and any absent segment is omitted from the manifest.
 *
 * The key is the "secret signature" generated in Your integrations → your app
 * → Webhooks → Configure notification (not a dashboard credential).
 *
 * Verification is only enforced when a signature header is present AND
 * MERCADO_PAGO_WEBHOOK_SECRET is configured. Webhooks arriving without
 * `x-signature` (common for `notification_url`-configured webhooks) are
 * accepted so they are not silently dropped.
 */
export function verifyMercadoPagoWebhookSignature(params: {
  signature: string | null;
  requestId: string | null;
  dataId?: string;
}): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = parseSignature(params.signature);
  if (!signature) {
    console.warn('Mercado Pago webhook received without x-signature; accepting');
    return true;
  }

  const manifest =
    (params.dataId ? `id:${params.dataId.toLowerCase()};` : '') +
    (params.requestId ? `request-id:${params.requestId};` : '') +
    `ts:${signature.ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');

  const expected = Buffer.from(hash, 'utf8');
  const received = Buffer.from(signature.v1, 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function parseExternalReference(value: unknown): { userId?: string; planId?: string } {
  const raw = typeof value === 'string' ? value : '';
  const separator = raw.indexOf('|');
  if (separator === -1) return { userId: raw || undefined };
  return {
    userId: raw.slice(0, separator) || undefined,
    planId: raw.slice(separator + 1) || undefined,
  };
}

/**
 * The Mercado Pago Node SDK does not expose a client for `/v1/authorized_payments`,
 * so renewal charges from `subscription_authorized_payment` webhooks are fetched here.
 */
export async function getMercadoPagoAuthorizedPayment(authorizedPaymentId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/authorized_payments/${authorizedPaymentId}`,
    {
      headers: { Authorization: `Bearer ${mercadoPagoConfig.accessToken}` },
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    throw new Error(`Mercado Pago authorized payment fetch failed: ${response.status}`);
  }
  return response.json();
}