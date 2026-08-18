"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useI18n } from "@/i18n/provider";
import type { TripResult } from "@/types/itinerary";

type OnboardingProps = {
  onGenerated?: (result: TripResult) => void;
};

export function Onboarding({ onGenerated }: OnboardingProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const hasActivePlan = () => {
    if (typeof window === 'undefined') return false;
    const plan = localStorage.getItem('rutawaynow-plan');
    const expiry = localStorage.getItem('rutawaynow-plan-expiry');
    if (!plan || !expiry) return false;
    return new Date(expiry) > new Date();
  };

  const handleClick = () => {
    if (hasActivePlan()) {
      setOpen(true);
    } else {
      router.push('/pricing');
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:bg-indigo-700"
      >
        <Icon name="sparkles" className="h-4 w-4" />
        <span className="hidden sm:inline">{t("onboarding.planTrip")}</span>
        <span className="sm:hidden">{t("onboarding.planTripShort")}</span>
      </button>
      {open && (
        <OnboardingModal onClose={handleClose} onGenerated={onGenerated} />
      )}
    </>
  );
}