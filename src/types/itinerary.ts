export type Atracao = {
  horario: string;
  nome_da_atracao: string;
  descricao_curta: string;
  categoria: string;
  latitude: number;
  longitude: number;
  duracao?: string;
  custo_estimado?: string;
  link?: string;
  telefone?: string;
  horario_funcionamento?: string;
  dicas?: string;
};

export type DiaRoteiro = {
  dia: number;
  titulo: string;
  atracoes: Atracao[];
};

export type Roteiro = {
  destino: string;
  latitude: number;
  longitude: number;
  dias: DiaRoteiro[];
};

export type BudgetLevel = "baixo" | "medio" | "alto";

export type ApiLang = "pt" | "en";

export type GerarRoteiroInput = {
  destination: string;
  days: number;
  month: string;
  budget: BudgetLevel;
  adults: number;
  teens: number;
  children: number;
  styles: string[];
  lang: ApiLang;
  plan?: string;
  planExpiry?: string;
};

export type GerarChecklistInput = {
  destination: string;
  month: string;
  lang: ApiLang;
};

export type TripResult = {
  roteiro: Roteiro;
  destination: string;
  month: string;
  days: number;
  travelers: number;
  budget: BudgetLevel;
  styles: string[];
  input: GerarRoteiroInput;
  styleIds: string[];
  monthIndex: number;
};

export type ChecklistCategoria = {
  categoria: string;
  itens: string[];
};

export type Checklist = {
  destino: string;
  periodo: string;
  categorias: ChecklistCategoria[];
};
