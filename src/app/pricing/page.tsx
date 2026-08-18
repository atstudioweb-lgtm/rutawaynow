import { PricingPlans } from '@/components/pricing/PricingPlans';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preços - RutawayNow',
  description: 'Escolha o plano ideal para planejar suas viagens',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <PricingPlans />
    </main>
  );
}