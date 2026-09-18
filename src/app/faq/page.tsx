import { FaqContent } from "@/components/faq/FaqContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs - RutawayNow",
  description:
    "Perguntas frequentes sobre o RutawayNow: como usar, planos, pagamento, segurança e privacidade.",
};

export default function FaqPage() {
  return <FaqContent />;
}