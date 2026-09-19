export interface Destination {
  tripCityId: number | null;
  cityPt: string;
  cityEn: string;
  countryPt: string;
  countryEn: string;
}

// Trip.com hotel city IDs (shared by /hotels/list?city=<id> and /packages/list?hCity=<id>).
// null = no confirmed Trip.com ID -> the builders fall back to the vertical home page.
const DESTINATIONS: Destination[] = [
  // ─── Brazil ─────────────────────────────────────────────────────────────
  { tripCityId: 415, cityPt: "São Paulo", cityEn: "São Paulo", countryPt: "Brasil", countryEn: "Brazil" },
  { tripCityId: 769, cityPt: "Rio de Janeiro", cityEn: "Rio de Janeiro", countryPt: "Brasil", countryEn: "Brazil" },
  { tripCityId: 3434, cityPt: "Salvador", cityEn: "Salvador", countryPt: "Brasil", countryEn: "Brazil" },
  { tripCityId: 3428, cityPt: "Fortaleza", cityEn: "Fortaleza", countryPt: "Brasil", countryEn: "Brazil" },
  { tripCityId: 6743, cityPt: "Florianópolis", cityEn: "Florianópolis", countryPt: "Brasil", countryEn: "Brazil" },
  { tripCityId: 4669, cityPt: "Belo Horizonte", cityEn: "Belo Horizonte", countryPt: "Brasil", countryEn: "Brazil" },
  { tripCityId: 4827, cityPt: "Porto Seguro", cityEn: "Porto Seguro", countryPt: "Brasil", countryEn: "Brazil" },
  // ─── South America ──────────────────────────────────────────────────────
  { tripCityId: 807, cityPt: "Buenos Aires", cityEn: "Buenos Aires", countryPt: "Argentina", countryEn: "Argentina" },
  { tripCityId: null, cityPt: "Bariloche", cityEn: "San Carlos de Bariloche", countryPt: "Argentina", countryEn: "Argentina" },
  { tripCityId: null, cityPt: "Ushuaia", cityEn: "Ushuaia", countryPt: "Argentina", countryEn: "Argentina" },
  // ─── Europe ─────────────────────────────────────────────────────────────
  { tripCityId: 192, cityPt: "Paris", cityEn: "Paris", countryPt: "França", countryEn: "France" },
  { tripCityId: 357, cityPt: "Madri", cityEn: "Madrid", countryPt: "Espanha", countryEn: "Spain" },
  { tripCityId: null, cityPt: "Barcelona", cityEn: "Barcelona", countryPt: "Espanha", countryEn: "Spain" },
  { tripCityId: 338, cityPt: "Londres", cityEn: "London", countryPt: "Reino Unido", countryEn: "United Kingdom" },
  { tripCityId: 1231, cityPt: "Lisboa", cityEn: "Lisbon", countryPt: "Portugal", countryEn: "Portugal" },
  { tripCityId: 343, cityPt: "Roma", cityEn: "Rome", countryPt: "Itália", countryEn: "Italy" },
  { tripCityId: 687, cityPt: "Florença", cityEn: "Florence", countryPt: "Itália", countryEn: "Italy" },
  { tripCityId: 688, cityPt: "Veneza", cityEn: "Venice", countryPt: "Itália", countryEn: "Italy" },
  { tripCityId: 361, cityPt: "Milão", cityEn: "Milan", countryPt: "Itália", countryEn: "Italy" },
  { tripCityId: null, cityPt: "Amsterdã", cityEn: "Amsterdam", countryPt: "Holanda", countryEn: "Netherlands" },
  // ─── North America ──────────────────────────────────────────────────────
  { tripCityId: null, cityPt: "Nova York", cityEn: "New York", countryPt: "Estados Unidos", countryEn: "United States" },
  { tripCityId: 347, cityPt: "Los Angeles", cityEn: "Los Angeles", countryPt: "Estados Unidos", countryEn: "United States" },
  { tripCityId: null, cityPt: "Orlando", cityEn: "Orlando", countryPt: "Estados Unidos", countryEn: "United States" },
  { tripCityId: null, cityPt: "Miami", cityEn: "Miami", countryPt: "Estados Unidos", countryEn: "United States" },
  // ─── Asia ───────────────────────────────────────────────────────────────
  { tripCityId: 228, cityPt: "Tóquio", cityEn: "Tokyo", countryPt: "Japão", countryEn: "Japan" },
  { tripCityId: 58, cityPt: "Hong Kong", cityEn: "Hong Kong", countryPt: "China", countryEn: "China" },
  { tripCityId: 73, cityPt: "Singapura", cityEn: "Singapore", countryPt: "Singapura", countryEn: "Singapore" },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findDestinations(query: string, limit = 8): Destination[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(/\s+/);

  const scored: Array<{ destination: Destination; score: number }> = [];
  for (const destination of DESTINATIONS) {
    const words = normalize(
      [destination.cityPt, destination.cityEn, destination.countryPt, destination.countryEn].join(" "),
    ).split(/\s+/);
    const hitsEveryToken = tokens.every(
      (token) => words.some((word) => word.startsWith(token) || (token.length >= 4 && word.includes(token))),
    );
    if (!hitsEveryToken) continue;

    let score = 0;
    if (
      tokens.every(
        (token) =>
          normalize(destination.cityPt).includes(token) || normalize(destination.cityEn).includes(token),
      )
    ) {
      score += 40;
    }
    if (
      tokens.every(
        (token) =>
          normalize(destination.cityPt).startsWith(token) || normalize(destination.cityEn).startsWith(token),
      )
    ) {
      score += 20;
    }
    scored.push({ destination, score });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score || a.destination.cityPt.localeCompare(b.destination.cityPt, "pt"),
    )
    .slice(0, limit)
    .map((entry) => entry.destination);
}

export function findDestinationByCityName(
  cityPt: string,
  cityEn?: string,
): Destination | null {
  const names = [cityPt, cityEn ?? ""].map(normalize).filter(Boolean);
  if (names.length === 0) return null;
  const byPt = DESTINATIONS.find((d) => names.includes(normalize(d.cityPt)));
  if (byPt) return byPt;
  if (cityEn) {
    const byEn = DESTINATIONS.find((d) => names.includes(normalize(d.cityEn)));
    if (byEn) return byEn;
  }
  return null;
}