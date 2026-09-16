export interface Airport {
  code: string;
  city: string;
  cityEn?: string;
  country: string;
  countryEn?: string;
  name: string;
}

// [code, city (pt), cityEn, name, country (pt), countryEn]
// 3-tuple = Brazilian airport: country defaults to "Brasil"/"Brazil", cityEn = city.
type Row =
  | [code: string, cityPt: string, name: string]
  | [code: string, cityPt: string, cityEn: string, name: string, countryPt: string, countryEn: string];

const rows: Row[] = [
  // ─── Brazil ───────────────────────────────────────────────────────────
  ["BSB", "Brasília", "Brasília International Airport"],
  ["SAO", "São Paulo", "Guarulhos International Airport"],
  ["RIO", "Rio de Janeiro", "Rio de Janeiro – Galeão/Santos Dumont"],
  ["BHZ", "Belo Horizonte", "Confins International Airport"],
  ["CWB", "Curitiba", "Afonso Pena International Airport"],
  ["POA", "Porto Alegre", "Salgado Filho International Airport"],
  ["FLN", "Florianópolis", "Hercílio Luz International Airport"],
  ["VIX", "Vitória", "Eurico de Aguiar Salles Airport"],
  ["SSA", "Salvador", "Salvador International Airport"],
  ["REC", "Recife", "Guararapes International Airport"],
  ["FOR", "Fortaleza", "Pinto Martins International Airport"],
  ["NAT", "Natal", "São Gonçalo do Amarante Airport"],
  ["JPA", "João Pessoa", "Presidente Castro Pinto Airport"],
  ["MCZ", "Maceió", "Zumbi dos Palmares Airport"],
  ["AJU", "Aracaju", "Santa Maria Airport"],
  ["THE", "Teresina", "Senador Petrônio Portella Airport"],
  ["SLZ", "São Luís", "Marechal Cunha Machado Airport"],
  ["MAO", "Manaus", "Eduardo Gomes International Airport"],
  ["BEL", "Belém", "Val de Cans International Airport"],
  ["MCP", "Macapá", "Macapá International Airport"],
  ["PVH", "Porto Velho", "Governador Jorge Teixeira Airport"],
  ["RBR", "Rio Branco", "Plácido de Castro Airport"],
  ["CGB", "Cuiabá", "Marechal Rondon International Airport"],
  ["CGR", "Campo Grande", "Campo Grande International Airport"],
  ["GOJ", "Goiânia", "Santa Genoveva Airport"],
  ["PMW", "Palmas", "Palmas–Brigadeiro Lysias Rodrigues Airport"],
  ["BVB", "Boa Vista", "Atlas Brasil Cantanhede Airport"],
  ["VCP", "Campinas", "Viracopos International Airport"],
  ["IGU", "Foz do Iguaçu", "Foz do Iguaçu International Airport"],
  ["NVT", "Navegantes", "Ministro Victor Konder International Airport"],
  ["LDB", "Londrina", "Londrina Airport"],
  ["MGF", "Maringá", "Maringá Regional Airport"],
  ["CAC", "Cascavel", "Cascavel Airport"],
  ["XAP", "Chapecó", "Chapecó Airport"],
  ["JOI", "Joinville", "Joinville–Lauro Carneiro de Loyola Airport"],
  ["CXJ", "Caxias do Sul", "Caxias do Sul Airport"],
  ["PET", "Pelotas", "Pelotas International Airport"],
  ["PFB", "Passo Fundo", "Passo Fundo Airport"],
  ["SJP", "São José do Rio Preto", "São José do Rio Preto Airport"],
  ["UDI", "Uberlândia", "Uberlândia Airport"],
  ["RAO", "Ribeirão Preto", "Leite Lopes Airport"],
  ["ARU", "Araçatuba", "Araçatuba Airport"],
  ["MII", "Marília", "Marília Airport"],
  ["BAU", "Bauru", "Bauru–Arealva Airport"],
  ["PPB", "Presidente Prudente", "Presidente Prudente Airport"],
  ["UBA", "Uberaba", "Uberaba Airport"],
  ["CLV", "Caldas Novas", "Caldas Novas Airport"],
  ["SJK", "São José dos Campos", "São José dos Campos Airport"],
  ["IOS", "Ilhéus", "Jorge Amado Airport"],
  ["BPS", "Porto Seguro", "Porto Seguro Airport"],
  ["PNZ", "Petrolina", "Petrolina–Senador Nilo Coelho Airport"],
  ["JDO", "Juazeiro do Norte", "Juazeiro do Norte Airport"],
  ["VDC", "Vitória da Conquista", "Vitória da Conquista Airport"],
  ["FEN", "Fernando de Noronha", "Fernando de Noronha Airport"],
  ["OPS", "Sinop", "Sinop Airport"],
  ["STM", "Santarém", "Santarém–Maestro Wilson Fonseca Airport"],
  ["IMP", "Imperatriz", "Imperatriz–Prefeito Renato Moreira Airport"],
  ["MAB", "Marabá", "Marabá Airport"],
  // ─── North America ────────────────────────────────────────────────────
  ["NYC", "Nova York", "New York", "New York – JFK/Newark/LaGuardia", "Estados Unidos", "United States"],
  ["MIA", "Miami", "Miami", "Miami International", "Estados Unidos", "United States"],
  ["MCO", "Orlando", "Orlando", "Orlando International", "Estados Unidos", "United States"],
  ["LAX", "Los Angeles", "Los Angeles", "Los Angeles International", "Estados Unidos", "United States"],
  ["SFO", "São Francisco", "San Francisco", "San Francisco International", "Estados Unidos", "United States"],
  ["CHI", "Chicago", "Chicago", "Chicago – O'Hare/Midway", "Estados Unidos", "United States"],
  ["WAS", "Washington", "Washington", "Washington – Dulles/Reagan/Baltimore", "Estados Unidos", "United States"],
  ["BOS", "Boston", "Boston", "Boston Logan International", "Estados Unidos", "United States"],
  ["ATL", "Atlanta", "Atlanta", "Hartsfield–Jackson Atlanta", "Estados Unidos", "United States"],
  ["SEA", "Seattle", "Seattle", "Seattle–Tacoma International", "Estados Unidos", "United States"],
  ["DFW", "Dallas", "Dallas", "Dallas/Fort Worth International", "Estados Unidos", "United States"],
  ["IAH", "Houston", "Houston", "George Bush Intercontinental", "Estados Unidos", "United States"],
  ["DEN", "Denver", "Denver", "Denver International", "Estados Unidos", "United States"],
  ["PHX", "Phoenix", "Phoenix", "Phoenix Sky Harbor", "Estados Unidos", "United States"],
  ["LAS", "Las Vegas", "Las Vegas", "Harry Reid International", "Estados Unidos", "United States"],
  ["SAN", "San Diego", "San Diego", "San Diego International", "Estados Unidos", "United States"],
  ["PHL", "Filadélfia", "Philadelphia", "Philadelphia International", "Estados Unidos", "United States"],
  ["MSP", "Minneapolis", "Minneapolis", "Minneapolis–Saint Paul", "Estados Unidos", "United States"],
  ["DTW", "Detroit", "Detroit", "Detroit Metropolitan", "Estados Unidos", "United States"],
  ["CLT", "Charlotte", "Charlotte", "Charlotte Douglas", "Estados Unidos", "United States"],
  ["TPA", "Tampa", "Tampa", "Tampa International", "Estados Unidos", "United States"],
  ["AUS", "Austin", "Austin", "Austin–Bergstrom", "Estados Unidos", "United States"],
  ["PDX", "Portland", "Portland", "Portland International", "Estados Unidos", "United States"],
  ["BNA", "Nashville", "Nashville", "Nashville International", "Estados Unidos", "United States"],
  ["HNL", "Honolulu", "Honolulu", "Daniel K. Inouye International", "Estados Unidos", "United States"],
  ["ANC", "Anchorage", "Anchorage", "Ted Stevens Anchorage", "Estados Unidos", "United States"],
  ["STL", "Saint Louis", "St. Louis", "St. Louis Lambert International", "Estados Unidos", "United States"],
  ["MSY", "Nova Orleans", "New Orleans", "Louis Armstrong New Orleans", "Estados Unidos", "United States"],
  ["SLC", "Salt Lake City", "Salt Lake City", "Salt Lake City International", "Estados Unidos", "United States"],
  ["YTO", "Toronto", "Toronto", "Toronto Pearson", "Canadá", "Canada"],
  ["YMQ", "Montreal", "Montreal", "Montréal–Trudeau", "Canadá", "Canada"],
  ["YVR", "Vancouver", "Vancouver", "Vancouver International", "Canadá", "Canada"],
  ["YYC", "Calgary", "Calgary", "Calgary International", "Canadá", "Canada"],
  ["YEG", "Edmonton", "Edmonton", "Edmonton International", "Canadá", "Canada"],
  ["YOW", "Ottawa", "Ottawa", "Ottawa Macdonald–Cartier", "Canadá", "Canada"],
  ["YHZ", "Halifax", "Halifax", "Halifax Stanfield", "Canadá", "Canada"],
  ["MEX", "Cidade do México", "Mexico City", "Mexico City International", "México", "Mexico"],
  ["CUN", "Cancún", "Cancún", "Cancún International", "México", "Mexico"],
  ["GDL", "Guadalajara", "Guadalajara", "Guadalajara International", "México", "Mexico"],
  ["MTY", "Monterrey", "Monterrey", "Monterrey International", "México", "Mexico"],
  ["SJD", "San José del Cabo", "San José del Cabo", "Los Cabos International", "México", "Mexico"],
  ["TIJ", "Tijuana", "Tijuana", "Tijuana International", "México", "Mexico"],
  ["PVR", "Puerto Vallarta", "Puerto Vallarta", "Licenciado Gustavo Díaz Ordaz", "México", "Mexico"],
  ["SJU", "San Juan", "San Juan", "Luis Muñoz Marín International", "Porto Rico", "Puerto Rico"],
  // ─── Latin America ────────────────────────────────────────────────────
  ["BUE", "Buenos Aires", "Buenos Aires", "Buenos Aires – Ezeiza/Jorge Newbery", "Argentina", "Argentina"],
  ["COR", "Córdoba", "Córdoba", "Ingeniero Ambrosio Taravella", "Argentina", "Argentina"],
  ["MDZ", "Mendoza", "Mendoza", "El Plumerillo Airport", "Argentina", "Argentina"],
  ["BRC", "Bariloche", "Bariloche", "Teniente Luis Candelaria", "Argentina", "Argentina"],
  ["USH", "Ushuaia", "Ushuaia", "Ushuaia–Malvinas Argentinas", "Argentina", "Argentina"],
  ["SCL", "Santiago", "Santiago", "Arturo Merino Benítez", "Chile", "Chile"],
  ["LIM", "Lima", "Lima", "Jorge Chávez International", "Peru", "Peru"],
  ["CUZ", "Cusco", "Cusco", "Alejandro Velasco Astete", "Peru", "Peru"],
  ["BOG", "Bogotá", "Bogotá", "El Dorado International", "Colômbia", "Colombia"],
  ["MDE", "Medellín", "Medellín", "José María Córdova", "Colômbia", "Colombia"],
  ["CTG", "Cartagena", "Cartagena", "Rafael Núñez International", "Colômbia", "Colombia"],
  ["CLO", "Cali", "Cali", "Alfonso Bonilla Aragón", "Colômbia", "Colombia"],
  ["UIO", "Quito", "Quito", "Mariscal Sucre International", "Equador", "Ecuador"],
  ["GYE", "Guayaquil", "Guayaquil", "José Joaquín de Olmedo", "Equador", "Ecuador"],
  ["MVD", "Montevidéu", "Montevideo", "Carrasco International", "Uruguai", "Uruguay"],
  ["PDP", "Punta del Este", "Punta del Este", "Punta del Este–Laguna del Sauce", "Uruguai", "Uruguay"],
  ["ASU", "Assunção", "Asunción", "Silvio Pettirossi International", "Paraguai", "Paraguay"],
  ["LPB", "La Paz", "La Paz", "El Alto International", "Bolívia", "Bolivia"],
  ["VVI", "Santa Cruz de la Sierra", "Santa Cruz de la Sierra", "Viru Viru International", "Bolívia", "Bolivia"],
  ["CCS", "Caracas", "Caracas", "Simón Bolívar International", "Venezuela", "Venezuela"],
  ["PTY", "Cidade do Panamá", "Panama City", "Tocumen International", "Panamá", "Panama"],
  ["SJO", "San José", "San José", "Juan Santamaría International", "Costa Rica", "Costa Rica"],
  ["HAV", "Havana", "Havana", "José Martí International", "Cuba", "Cuba"],
  ["SDQ", "Santo Domingo", "Santo Domingo", "Las Américas International", "República Dominicana", "Dominican Republic"],
  ["PUJ", "Punta Cana", "Punta Cana", "Punta Cana International", "República Dominicana", "Dominican Republic"],
  ["GUA", "Guatemala", "Guatemala City", "La Aurora International", "Guatemala", "Guatemala"],
  // ─── Europe ───────────────────────────────────────────────────────────
  ["LIS", "Lisboa", "Lisbon", "Humberto Delgado International", "Portugal", "Portugal"],
  ["OPO", "Porto", "Porto", "Francisco Sá Carneiro", "Portugal", "Portugal"],
  ["FAO", "Faro", "Faro", "Faro–Gago Coutinho", "Portugal", "Portugal"],
  ["FNC", "Funchal", "Funchal", "Cristiano Ronaldo Madeira International", "Portugal", "Portugal"],
  ["PDL", "Ponta Delgada", "Ponta Delgada", "João Paulo II Airport", "Portugal", "Portugal"],
  ["MAD", "Madri", "Madrid", "Adolfo Suárez Madrid–Barajas", "Espanha", "Spain"],
  ["BCN", "Barcelona", "Barcelona", "Josep Tarradellas Barcelona–El Prat", "Espanha", "Spain"],
  ["AGP", "Málaga", "Málaga", "Málaga–Costa del Sol", "Espanha", "Spain"],
  ["SVQ", "Sevilha", "Seville", "Seville Airport", "Espanha", "Spain"],
  ["VLC", "Valência", "Valencia", "Valencia Airport", "Espanha", "Spain"],
  ["BIO", "Bilbau", "Bilbao", "Bilbao Airport", "Espanha", "Spain"],
  ["PMI", "Palma de Mallorca", "Palma de Mallorca", "Son Sant Joan Airport", "Espanha", "Spain"],
  ["ALC", "Alicante", "Alicante", "Alicante–Elche Miguel Hernández", "Espanha", "Spain"],
  ["LPA", "Las Palmas", "Las Palmas", "Gran Canaria Airport", "Espanha", "Spain"],
  ["TFS", "Tenerife", "Tenerife", "Tenerife Sur Airport", "Espanha", "Spain"],
  ["IBZ", "Ibiza", "Ibiza", "Ibiza Airport", "Espanha", "Spain"],
  ["PAR", "Paris", "Paris", "Paris – CDG/Orly", "França", "France"],
  ["NCE", "Nice", "Nice", "Nice Côte d'Azur", "França", "France"],
  ["LYS", "Lyon", "Lyon", "Lyon–Saint-Exupéry", "França", "France"],
  ["MRS", "Marselha", "Marseille", "Marseille Provence", "França", "France"],
  ["TLS", "Toulouse", "Toulouse", "Toulouse–Blagnac", "França", "France"],
  ["BOD", "Bordéus", "Bordeaux", "Bordeaux–Mérignac", "França", "France"],
  ["LON", "Londres", "London", "London – Heathrow/Gatwick", "Reino Unido", "United Kingdom"],
  ["MAN", "Manchester", "Manchester", "Manchester Airport", "Reino Unido", "United Kingdom"],
  ["EDI", "Edimburgo", "Edinburgh", "Edinburgh Airport", "Reino Unido", "United Kingdom"],
  ["DUB", "Dublin", "Dublin", "Dublin Airport", "Irlanda", "Ireland"],
  ["AMS", "Amsterdã", "Amsterdam", "Amsterdam Airport Schiphol", "Holanda", "Netherlands"],
  ["BRU", "Bruxelas", "Brussels", "Brussels Airport", "Bélgica", "Belgium"],
  ["FRA", "Frankfurt", "Frankfurt", "Frankfurt Airport", "Alemanha", "Germany"],
  ["MUC", "Munique", "Munich", "Munich Airport", "Alemanha", "Germany"],
  ["BER", "Berlim", "Berlin", "Berlin Brandenburg", "Alemanha", "Germany"],
  ["HAM", "Hamburgo", "Hamburg", "Hamburg Airport", "Alemanha", "Germany"],
  ["DUS", "Düsseldorf", "Düsseldorf", "Düsseldorf Airport", "Alemanha", "Germany"],
  ["CGN", "Colônia", "Cologne", "Cologne Bonn Airport", "Alemanha", "Germany"],
  ["STR", "Stuttgart", "Stuttgart", "Stuttgart Airport", "Alemanha", "Germany"],
  ["ZRH", "Zurique", "Zurich", "Zurich Airport", "Suíça", "Switzerland"],
  ["GVA", "Genebra", "Geneva", "Geneva Airport", "Suíça", "Switzerland"],
  ["VIE", "Viena", "Vienna", "Vienna International", "Áustria", "Austria"],
  ["MIL", "Milão", "Milan", "Milan – Malpensa/Linate", "Itália", "Italy"],
  ["ROM", "Roma", "Rome", "Rome – Fiumicino/Ciampino", "Itália", "Italy"],
  ["VCE", "Veneza", "Venice", "Venice Marco Polo", "Itália", "Italy"],
  ["NAP", "Nápoles", "Naples", "Naples International", "Itália", "Italy"],
  ["FLR", "Florença", "Florence", "Florence Airport", "Itália", "Italy"],
  ["BLQ", "Bolonha", "Bologna", "Bologna Guglielmo Marconi", "Itália", "Italy"],
  ["TRN", "Turim", "Turin", "Turin Airport", "Itália", "Italy"],
  ["PSA", "Pisa", "Pisa", "Pisa International", "Itália", "Italy"],
  ["CTA", "Catânia", "Catania", "Catania–Fontanarossa", "Itália", "Italy"],
  ["PMO", "Palermo", "Palermo", "Palermo Falcone–Borsellino", "Itália", "Italy"],
  ["OLB", "Olbia", "Olbia", "Olbia Costa Smeralda", "Itália", "Italy"],
  ["BRI", "Bari", "Bari", "Bari Karol Wojtyła", "Itália", "Italy"],
  ["CAG", "Cagliari", "Cagliari", "Cagliari Elmas", "Itália", "Italy"],
  ["CPH", "Copenhague", "Copenhagen", "Copenhagen Airport", "Dinamarca", "Denmark"],
  ["ARN", "Estocolmo", "Stockholm", "Stockholm Arlanda", "Suécia", "Sweden"],
  ["GOT", "Gotemburgo", "Gothenburg", "Göteborg Landvetter", "Suécia", "Sweden"],
  ["OSL", "Oslo", "Oslo", "Oslo Gardermoen", "Noruega", "Norway"],
  ["HEL", "Helsinque", "Helsinki", "Helsinki Airport", "Finlândia", "Finland"],
  ["KEF", "Reykjavík", "Reykjavík", "Keflavík International", "Islândia", "Iceland"],
  ["WAW", "Varsóvia", "Warsaw", "Warsaw Chopin", "Polônia", "Poland"],
  ["KRK", "Cracóvia", "Kraków", "Kraków John Paul II", "Polônia", "Poland"],
  ["PRG", "Praga", "Prague", "Václav Havel Airport", "República Tcheca", "Czech Republic"],
  ["BUD", "Budapeste", "Budapest", "Budapest Ferenc Liszt", "Hungria", "Hungary"],
  ["OTP", "Bucareste", "Bucharest", "Henri Coandă International", "Romênia", "Romania"],
  ["BEG", "Belgrado", "Belgrade", "Belgrade Nikola Tesla", "Sérvia", "Serbia"],
  ["ATH", "Atenas", "Athens", "Athens International", "Grécia", "Greece"],
  ["IST", "Istambul", "Istanbul", "Istanbul Airport", "Turquia", "Turkey"],
  ["AYT", "Antália", "Antalya", "Antalya Airport", "Turquia", "Turkey"],
  ["MOW", "Moscou", "Moscow", "Moscow – Sheremetyevo/Domodedovo", "Rússia", "Russia"],
  ["LED", "São Petersburgo", "Saint Petersburg", "Pulkovo Airport", "Rússia", "Russia"],
  ["KBP", "Kiev", "Kyiv", "Boryspil International", "Ucrânia", "Ukraine"],
  ["DBV", "Dubrovnik", "Dubrovnik", "Dubrovnik Airport", "Croácia", "Croatia"],
  ["SPU", "Split", "Split", "Split Airport", "Croácia", "Croatia"],
  ["ZAG", "Zagreb", "Zagreb", "Franjo Tuđman Airport", "Croácia", "Croatia"],
  // ─── Middle East / Africa ─────────────────────────────────────────────
  ["DXB", "Dubai", "Dubai", "Dubai International", "Emirados Árabes Unidos", "United Arab Emirates"],
  ["AUH", "Abu Dhabi", "Abu Dhabi", "Zayed International", "Emirados Árabes Unidos", "United Arab Emirates"],
  ["DOH", "Doha", "Doha", "Hamad International", "Catar", "Qatar"],
  ["DMM", "Dammam", "Dammam", "King Fahd International", "Arábia Saudita", "Saudi Arabia"],
  ["RUH", "Riad", "Riyadh", "King Khalid International", "Arábia Saudita", "Saudi Arabia"],
  ["JED", "Jidá", "Jeddah", "King Abdulaziz International", "Arábia Saudita", "Saudi Arabia"],
  ["TLV", "Tel Aviv", "Tel Aviv", "Ben Gurion Airport", "Israel", "Israel"],
  ["AMM", "Amã", "Amman", "Queen Alia International", "Jordânia", "Jordan"],
  ["CAI", "Cairo", "Cairo", "Cairo International", "Egito", "Egypt"],
  ["CMN", "Casablanca", "Casablanca", "Mohammed V International", "Marrocos", "Morocco"],
  ["RAK", "Marraquexe", "Marrakech", "Marrakesh Menara", "Marrocos", "Morocco"],
  ["TUN", "Túnis", "Tunis", "Tunis–Carthage International", "Tunísia", "Tunisia"],
  ["NBO", "Nairóbi", "Nairobi", "Jomo Kenyatta International", "Quênia", "Kenya"],
  ["DSS", "Dakar", "Dakar", "Blaise Diagne International", "Senegal", "Senegal"],
  ["LOS", "Lagos", "Lagos", "Murtala Muhammed International", "Nigéria", "Nigeria"],
  ["JNB", "Joanesburgo", "Johannesburg", "O. R. Tambo International", "África do Sul", "South Africa"],
  ["CPT", "Cidade do Cabo", "Cape Town", "Cape Town International", "África do Sul", "South Africa"],
  // ─── Asia ─────────────────────────────────────────────────────────────
  ["TYO", "Tóquio", "Tokyo", "Tokyo – Haneda/Narita", "Japão", "Japan"],
  ["OSA", "Osaka", "Osaka", "Osaka – Kansai/Itami", "Japão", "Japan"],
  ["FUK", "Fukuoka", "Fukuoka", "Fukuoka Airport", "Japão", "Japan"],
  ["CTS", "Sapporo", "Sapporo", "New Chitose Airport", "Japão", "Japan"],
  ["SEL", "Seul", "Seoul", "Seoul – Incheon/Gimpo", "Coreia do Sul", "South Korea"],
  ["BJS", "Pequim", "Beijing", "Beijing – Capital/Daxing", "China", "China"],
  ["SHA", "Xangai", "Shanghai", "Shanghai – Hongqiao/Pudong", "China", "China"],
  ["HKG", "Hong Kong", "Hong Kong", "Hong Kong International", "Hong Kong", "Hong Kong"],
  ["CAN", "Cantão", "Guangzhou", "Guangzhou Baiyun", "China", "China"],
  ["SZX", "Shenzhen", "Shenzhen", "Shenzhen Bao'an", "China", "China"],
  ["TPE", "Taipei", "Taipei", "Taoyuan International", "Taiwan", "Taiwan"],
  ["BKK", "Bangkok", "Bangkok", "Bangkok – Suvarnabhumi/Don Mueang", "Tailândia", "Thailand"],
  ["HKT", "Phuket", "Phuket", "Phuket International", "Tailândia", "Thailand"],
  ["SIN", "Cingapura", "Singapore", "Singapore Changi", "Singapura", "Singapore"],
  ["KUL", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur International", "Malásia", "Malaysia"],
  ["CGK", "Jacarta", "Jakarta", "Soekarno–Hatta International", "Indonésia", "Indonesia"],
  ["DPS", "Denpasar (Bali)", "Denpasar (Bali)", "Ngurah Rai International", "Indonésia", "Indonesia"],
  ["MNL", "Manila", "Manila", "Ninoy Aquino International", "Filipinas", "Philippines"],
  ["BOM", "Mumbai", "Mumbai", "Chhatrapati Shivaji Maharaj International", "Índia", "India"],
  ["DEL", "Nova Délhi", "Delhi", "Indira Gandhi International", "Índia", "India"],
  ["BLR", "Bangalor", "Bengaluru", "Kempegowda International", "Índia", "India"],
  ["MAA", "Chennai", "Chennai", "Chennai International", "Índia", "India"],
  ["HYD", "Hyderabad", "Hyderabad", "Rajiv Gandhi International", "Índia", "India"],
  ["CCU", "Calcutá", "Kolkata", "Netaji Subhas Chandra Bose International", "Índia", "India"],
  ["SGN", "Cidade de Ho Chi Minh", "Ho Chi Minh City", "Tan Son Nhat International", "Vietnã", "Vietnam"],
  ["HAN", "Hanói", "Hanoi", "Noi Bai International", "Vietnã", "Vietnam"],
  ["KTM", "Catmandu", "Kathmandu", "Tribhuvan International", "Nepal", "Nepal"],
  ["CMB", "Colombo", "Colombo", "Bandaranaike International", "Sri Lanka", "Sri Lanka"],
  // ─── Oceania ──────────────────────────────────────────────────────────
  ["SYD", "Sydney", "Sydney", "Sydney Kingsford Smith", "Austrália", "Australia"],
  ["MEL", "Melbourne", "Melbourne", "Melbourne Airport", "Austrália", "Australia"],
  ["BNE", "Brisbane", "Brisbane", "Brisbane Airport", "Austrália", "Australia"],
  ["PER", "Perth", "Perth", "Perth Airport", "Austrália", "Australia"],
  ["ADL", "Adelaide", "Adelaide", "Adelaide Airport", "Austrália", "Australia"],
  ["OOL", "Gold Coast", "Gold Coast", "Gold Coast Airport", "Austrália", "Australia"],
  ["CNS", "Cairns", "Cairns", "Cairns Airport", "Austrália", "Australia"],
  ["AKL", "Auckland", "Auckland", "Auckland Airport", "Nova Zelândia", "New Zealand"],
  ["WLG", "Wellington", "Wellington", "Wellington Airport", "Nova Zelândia", "New Zealand"],
  ["CHC", "Christchurch", "Christchurch", "Christchurch Airport", "Nova Zelândia", "New Zealand"],
  ["ZQN", "Queenstown", "Queenstown", "Queenstown Airport", "Nova Zelândia", "New Zealand"],
];

function toAirport(row: Row): Airport {
  if (row.length === 3) {
    const [code, city, name] = row;
    return { code, city, country: "Brasil", name };
  }
  const [code, city, cityEn, name, country, countryEn] = row;
  return { code, city, cityEn, country, countryEn, name };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const AIRPORTS: Airport[] = rows.map(toAirport);

const AIRPORT_ALIASES: Record<string, string> = {
  GRU: "SAO",
  CGH: "SAO",
  GIG: "RIO",
  SDU: "RIO",
  CNF: "BHZ",
  JFK: "NYC",
  LGA: "NYC",
  EWR: "NYC",
  IAD: "WAS",
  DCA: "WAS",
  BWI: "WAS",
  ORD: "CHI",
  MDW: "CHI",
  LHR: "LON",
  LGW: "LON",
  STN: "LON",
  CDG: "PAR",
  ORY: "PAR",
  FCO: "ROM",
  MXP: "MIL",
  EZE: "BUE",
  AEP: "BUE",
  SVO: "MOW",
  DME: "MOW",
  VKO: "MOW",
  HND: "TYO",
  NRT: "TYO",
  YYZ: "YTO",
  YTZ: "YTO",
  YUL: "YMQ",
};

export function findAirports(query: string, limit = 8): Airport[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(/\s+/);

  if (tokens.length === 1 && AIRPORT_ALIASES[q.toUpperCase()]) {
    const resolved = AIRPORTS.find((airport) => airport.code === AIRPORT_ALIASES[q.toUpperCase()]);
    return resolved ? [resolved] : [];
  }

  const scored: Array<{ airport: Airport; score: number }> = [];
  for (const airport of AIRPORTS) {
    const words = normalize(
      [airport.code, airport.city, airport.cityEn ?? "", airport.name, airport.country, airport.countryEn ?? ""].join(" "),
    ).split(/\s+/);
    const hitsEveryToken = tokens.every(
      (token) =>
        words.some(
          (word) =>
            word.startsWith(token) || (token.length >= 4 && word.includes(token)),
        ) || airport.code.includes(token),
    );
    if (!hitsEveryToken) continue;

    let score = 0;
    const code = normalize(airport.code);
    if (code === q) score += 100;
    else if (code.startsWith(q)) score += 70;
    if (tokens.every((token) => code.includes(token))) score += 15;
    if (
      tokens.every(
        (token) =>
          normalize(airport.city).includes(token) ||
          (airport.cityEn != null && normalize(airport.cityEn).includes(token)),
      )
    ) {
      score += 40;
    }
    if (tokens.every((token) => normalize(airport.name).includes(token))) score += 20;
    scored.push({ airport, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.airport.city.localeCompare(b.airport.city, "pt"))
    .slice(0, limit)
    .map((entry) => entry.airport);
}

export function resolveAirport(text: string): Airport | null {
  const q = normalize(text);
  if (!q) return null;

  const byCode = AIRPORTS.find((airport) => normalize(airport.code) === q);
  if (byCode) return byCode;

  if (AIRPORT_ALIASES[q.toUpperCase()]) {
    const byAlias = AIRPORTS.find((airport) => airport.code === AIRPORT_ALIASES[q.toUpperCase()]);
    if (byAlias) return byAlias;
  }

  const byCity = AIRPORTS.find(
    (airport) =>
      normalize(airport.city) === q ||
      (airport.cityEn != null && normalize(airport.cityEn) === q),
  );
  if (byCity) return byCity;

  const matches = findAirports(text, 100);
  return matches.length === 1 ? matches[0] : null;
}