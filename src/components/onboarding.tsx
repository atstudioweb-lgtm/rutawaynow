"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useI18n } from "@/i18n/provider";
import type { TripResult } from "@/types/itinerary";
import { getPlanStatus } from "@/lib/plan-utils";

type OnboardingProps = {
  onGenerated?: (result: TripResult) => void;
};

export function Onboarding({ onGenerated }: OnboardingProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const handleClick = () => {
    const planStatus = getPlanStatus();
    if (planStatus.hasActivePlan && planStatus.canGenerate) {
      setPlanError(null);
      setOpen(true);
    } else {
      setOpen(false);
      setPlanError(planStatus.message || t("errors.noActivePlan"));
      // Redirect to pricing after showing error
      setTimeout(() => router.push('/pricing'), 3000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPlanError(null);
  };

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
      {planError && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="max-w-sm rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-lg">
            <div className="flex items-start gap-2">
              <Icon name="alert" className="h-5 w-5 text-rose-600 shrink-0" />
              <p className="text-sm text-rose-700">{t(planError)}</p>
            </div>
          </div>
        </div>
      )}
      {open && (
        <OnboardingModal onClose={handleClose} onGenerated={onGenerated} />
      )}
    </>
  );
}