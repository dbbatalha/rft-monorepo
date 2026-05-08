/**
 * Categorias de peso (UFC) — tradução PT-BR + limite em kg.
 * As chaves seguem o padrão "stripGender" usado no banco (sem prefixo "Women's").
 */
const WC_DATA: Record<string, { pt: string; limitKg: number }> = {
  Strawweight:        { pt: "Palha",          limitKg: 52.2 },
  Flyweight:          { pt: "Mosca",          limitKg: 56.7 },
  Bantamweight:       { pt: "Galo",           limitKg: 61.2 },
  Featherweight:      { pt: "Pena",           limitKg: 65.8 },
  Lightweight:        { pt: "Leve",           limitKg: 70.3 },
  Welterweight:       { pt: "Meio-Médio",     limitKg: 77.1 },
  Middleweight:       { pt: "Médio",          limitKg: 83.9 },
  "Light Heavyweight":{ pt: "Meio-Pesado",    limitKg: 93.0 },
  Heavyweight:        { pt: "Pesado",         limitKg: 120.2 },
  Atomweight:         { pt: "Átomo",          limitKg: 47.6 },
};

const stripGender = (wc: string | null | undefined) =>
  (wc ?? "").replace(/^Women's\s+/i, "").trim();

/** Nome em português da categoria (mesmo nome se não houver tradução). */
export function translateWeightClass(wc: string | null | undefined): string {
  if (!wc) return "";
  const norm = stripGender(wc);
  return WC_DATA[norm]?.pt ?? norm;
}

/** Limite de peso em kg como número (ou null se não conhecido). */
export function weightClassLimitKg(wc: string | null | undefined): number | null {
  if (!wc) return null;
  const norm = stripGender(wc);
  return WC_DATA[norm]?.limitKg ?? null;
}

/** Texto pronto para tooltip: "Categoria até 70.3 kg". */
export function weightClassTooltip(wc: string | null | undefined): string {
  const limit = weightClassLimitKg(wc);
  return limit != null ? `Categoria até ${limit} kg` : "";
}
