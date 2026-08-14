import type { IconName } from "@/components/icons";
import type { TripResult } from "@/types/itinerary";
import type { Language } from "@/i18n/languages";
import type { Messages } from "@/i18n/pt";

export type Activity = {
  id: number;
  time: string;
  title: string;
  description: string;
  icon: IconName;
  lat?: number;
  lng?: number;
  duration?: string;
  cost?: string;
  link?: string;
  phone?: string;
  openingHours?: string;
  tip?: string;
};

export type TripDay = {
  id: number;
  label: string;
  date: string;
  activities: Activity[];
};

export type Trip = {
  title: string;
  subtitle: string;
  dates: string;
  travelers: number;
  budget: string;
  rating: number;
  center?: { lat: number; lng: number };
  days: TripDay[];
};

const categoriaIcons: Record<string, IconName> = {
  Aventura: "mountain",
  Adventure: "mountain",
  Gastronomia: "food",
  Food: "food",
  Cultura: "flags",
  Culture: "flags",
  Natureza: "tree",
  Nature: "tree",
  Passeio: "mapPin",
  Sightseeing: "mapPin",
  Relaxamento: "sun",
  Relaxation: "sun",
};

export function mapTripResult(
  result: TripResult,
  lang: Language = "pt",
  messages: Messages = {} as Messages,
): Trip {
  const dayWord = lang === "en" ? "Day" : "Dia";
  const daysWord = lang === "en" ? "days" : "dias";
  const dayOneWord = lang === "en" ? "day" : "dia";
  const inWord = lang === "en" ? "in" : "em";
  const months = (messages.onboarding?.months ?? []) as string[];
  const styleOptions = (messages.onboarding?.styleOptions ??
    {}) as Record<string, { label: string }>;

  const monthLabel =
    result.monthIndex >= 0 && result.monthIndex < months.length
      ? months[result.monthIndex]
      : result.month;
  const styleLabels = result.styleIds
    .map((id) => styleOptions[id]?.label ?? id)
    .join(", ");

  let idCounter = 1;
  const days: TripDay[] = result.roteiro.dias.map((dia) => ({
    id: dia.dia,
    label: `${dayWord} ${dia.dia}`,
    date: dia.titulo,
      activities: dia.atracoes.map((atracao) => ({
        id: idCounter++,
        time: atracao.horario,
        title: atracao.nome_da_atracao,
        description: atracao.descricao_curta,
        icon: categoriaIcons[atracao.categoria] ?? "mapPin",
        lat: atracao.latitude,
        lng: atracao.longitude,
        duration: atracao.duracao,
        cost: atracao.custo_estimado,
        link: atracao.link,
        phone: atracao.telefone,
        openingHours: atracao.horario_funcionamento,
        tip: atracao.dicas,
      })),
  }));

  return {
    title: result.destination,
    subtitle: `${monthLabel} · ${styleLabels}`,
    dates: `${result.days} ${
      result.days === 1 ? dayOneWord : daysWord
    } ${inWord} ${monthLabel}`,
    travelers: result.travelers,
    budget: "",
    rating: 0,
    center: { lat: result.roteiro.latitude, lng: result.roteiro.longitude },
    days,
  };
}

const tripPt: Trip = {
  title: "Floripa & Sul da Ilha",
  subtitle: "Florianópolis · Santa Catarina",
  dates: "12 a 16 de março de 2026",
  travelers: 4,
  budget: "R$ 2.480",
  rating: 4.9,
  center: { lat: -27.5954, lng: -48.548 },
  days: [
    {
      id: 1,
      label: "Dia 1",
      date: "Sáb, 12 mar",
      activities: [
        {
          id: 101,
          time: "10:00",
          title: "Check-in na pousada",
          description:
            "Chegada na Vila Santinho e chave do quarto 12, com vista pro mar.",
          icon: "home",
          lat: -27.4572,
          lng: -48.3712,
        },
        {
          id: 102,
          time: "12:30",
          title: "Almoço de comida caseira",
          description:
            "Costela no fogo de chão da família Ramos, pertinho da pousada.",
          icon: "food",
          lat: -27.4572,
          lng: -48.3712,
        },
        {
          id: 103,
          time: "15:00",
          title: "Praia da Lagoinha",
          description:
            "Sol, mar e um açaí na areia pra fechar a tarde.",
          icon: "sun",
          lat: -27.4371,
          lng: -48.3713,
        },
      ],
    },
    {
      id: 2,
      label: "Dia 2",
      date: "Dom, 13 mar",
      activities: [
        {
          id: 201,
          time: "07:30",
          title: "Trilha do Morro das Aranhas",
          description:
            "Nascer do sol no topo, com vista pra toda a Costa da Lagoa.",
          icon: "mountain",
          lat: -27.452,
          lng: -48.383,
        },
        {
          id: 202,
          time: "12:00",
          title: "Costa da Lagoa",
          description:
            "Barco até o vilarejo e pés na água no fim da trilha.",
          icon: "boat",
          lat: -27.5324,
          lng: -48.4673,
        },
        {
          id: 203,
          time: "18:00",
          title: "Cervejaria artesanal",
          description: "Degustação de rótulos locais com música ao vivo.",
          icon: "food",
          lat: -27.6045,
          lng: -48.4627,
        },
      ],
    },
    {
      id: 3,
      label: "Dia 3",
      date: "Seg, 14 mar",
      activities: [
        {
          id: 301,
          time: "08:00",
          title: "Ilha do Campeche",
          description: "Passeio de escuna e mergulho em águas cristalinas.",
          icon: "boat",
          lat: -27.6959,
          lng: -48.466,
        },
        {
          id: 302,
          time: "20:00",
          title: "Jantar no Mercado Público",
          description: "Peixes frescos do dia com vinho da casa.",
          icon: "food",
          lat: -27.5971,
          lng: -48.549,
        },
      ],
    },
    {
      id: 4,
      label: "Dia 4",
      date: "Ter, 15 mar",
      activities: [
        {
          id: 401,
          time: "07:00",
          title: "Surf na Praia Mole",
          description: "Aula com o Leandro pra quem tá começando.",
          icon: "waves",
          lat: -27.6017,
          lng: -48.427,
        },
        {
          id: 402,
          time: "16:00",
          title: "Volta pra casa",
          description:
            "Caixinha de puxa-puxa da fábrica pra levar de presente.",
          icon: "plane",
          lat: -27.5954,
          lng: -48.548,
        },
      ],
    },
  ],
};

const tripEn: Trip = {
  title: "Floripa & South of the Island",
  subtitle: "Florianópolis · Santa Catarina",
  dates: "Mar 12–16, 2026",
  travelers: 4,
  budget: "R$ 2,480",
  rating: 4.9,
  center: { lat: -27.5954, lng: -48.548 },
  days: [
    {
      id: 1,
      label: "Day 1",
      date: "Sat, Mar 12",
      activities: [
        {
          id: 101,
          time: "10:00",
          title: "Check-in at the guesthouse",
          description:
            "Arrival at Vila Santinho and keys to room 12, with an ocean view.",
          icon: "home",
          lat: -27.4572,
          lng: -48.3712,
        },
        {
          id: 102,
          time: "12:30",
          title: "Home-cooked lunch",
          description:
            "Fire-roasted brisket from the Ramos family, right by the guesthouse.",
          icon: "food",
          lat: -27.4572,
          lng: -48.3712,
        },
        {
          id: 103,
          time: "15:00",
          title: "Lagoinha Beach",
          description: "Sun, sea and an açaí on the sand to end the afternoon.",
          icon: "sun",
          lat: -27.4371,
          lng: -48.3713,
        },
      ],
    },
    {
      id: 2,
      label: "Day 2",
      date: "Sun, Mar 13",
      activities: [
        {
          id: 201,
          time: "07:30",
          title: "Morro das Aranhas trail",
          description:
            "Sunrise at the top, overlooking all of Costa da Lagoa.",
          icon: "mountain",
          lat: -27.452,
          lng: -48.383,
        },
        {
          id: 202,
          time: "12:00",
          title: "Costa da Lagoa",
          description:
            "Boat to the village and feet in the water at the end of the trail.",
          icon: "boat",
          lat: -27.5324,
          lng: -48.4673,
        },
        {
          id: 203,
          time: "18:00",
          title: "Craft brewery",
          description: "Tasting local labels with live music.",
          icon: "food",
          lat: -27.6045,
          lng: -48.4627,
        },
      ],
    },
    {
      id: 3,
      label: "Day 3",
      date: "Mon, Mar 14",
      activities: [
        {
          id: 301,
          time: "08:00",
          title: "Ilha do Campeche",
          description: "Schooner trip and snorkeling in crystal-clear waters.",
          icon: "boat",
          lat: -27.6959,
          lng: -48.466,
        },
        {
          id: 302,
          time: "20:00",
          title: "Dinner at Mercado Público",
          description: "Fresh fish of the day with the house wine.",
          icon: "food",
          lat: -27.5971,
          lng: -48.549,
        },
      ],
    },
    {
      id: 4,
      label: "Day 4",
      date: "Tue, Mar 15",
      activities: [
        {
          id: 401,
          time: "07:00",
          title: "Surf at Praia Mole",
          description: "Lesson with Leandro for beginners.",
          icon: "waves",
          lat: -27.6017,
          lng: -48.427,
        },
        {
          id: 402,
          time: "16:00",
          title: "Heading home",
          description:
            "A box of puxa-puxa candy from the factory to take as a gift.",
          icon: "plane",
          lat: -27.5954,
          lng: -48.548,
        },
      ],
    },
  ],
};

export function getSampleTrip(lang: Language): Trip {
  return lang === "en" ? tripEn : tripPt;
}
