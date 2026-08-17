import { MercadoPagoConfig, Preference, PreApprovalPlan, PreApproval, Payment } from 'mercadopago';

export const mercadoPagoConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

export const preference = new Preference(mercadoPagoConfig);
export const preApprovalPlan = new PreApprovalPlan(mercadoPagoConfig);
export const preApproval = new PreApproval(mercadoPagoConfig);
export const payment = new Payment(mercadoPagoConfig);

export const MERCADO_PAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!;