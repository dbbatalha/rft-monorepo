/**
 * Atletas profissionais da Renovação Fight Team em competição.
 * Usado para destacar com o losango RFT em listagens (fighters/advanced).
 */
export const RFT_ATHLETES: ReadonlyArray<string> = [
  // UFC
  "Carlston Harris",
  "Carlston Lindsay Harris",
  // LFA
  "Jefferson Nascimento",
  // Centurion
  "Caio Italo",
  "Caio Ítalo",
  // Jungle Fight
  "Brena Cardoso",
  "Yasmim Guimarães",
  "Yasmim Guimaraes",
  // Invicta
  "Andressa Romero",
  // MAC
  "Raiane Vinuto",
  // FFC
  "Walleska Karoline",
];

const RFT_SET = new Set(RFT_ATHLETES.map((n) => n.toLowerCase().trim()));

export function isRftAthlete(name: string | null | undefined): boolean {
  if (!name) return false;
  return RFT_SET.has(name.toLowerCase().trim());
}

/**
 * Mapeamento direto nome → fighter id (atletas RFT que já têm perfil scrapeado).
 * Permite clique direto para o perfil; fallback para busca por nome.
 */
const RFT_FIGHTER_IDS: Record<string, number> = {
  "Carlston Harris": 2326,
  "Carlston Lindsay Harris": 2326,
  "Jefferson Nascimento": 4904,
};

export function rftAthleteLink(name: string): string {
  const id = RFT_FIGHTER_IDS[name];
  if (id) return `/analytics/fighter/${id}`;
  return `/analytics/fighters?search=${encodeURIComponent(name)}`;
}

/**
 * Redes sociais oficiais conhecidas dos atletas RFT (handles sem @).
 * Adicione/atualize aqui conforme confirmar handles oficiais.
 */
export const RFT_SOCIALS: Record<string, { instagram?: string; twitter?: string }> = {
  "Carlston Harris":            { instagram: "carlstonharrismma", twitter: "CarlstonHarris" },
  "Carlston Lindsay Harris":    { instagram: "carlstonharrismma", twitter: "CarlstonHarris" },
  "Jefferson Nascimento":       { instagram: "jeffersonnascimento_mma" },
  "Caio Italo":                 { instagram: "caioitalomma" },
  "Caio Ítalo":                 { instagram: "caioitalomma" },
  "Brena Cardoso":              { instagram: "brenacardoso_mma" },
  "Yasmim Guimarães":           { instagram: "yasmimguimaraes_mma" },
  "Yasmim Guimaraes":           { instagram: "yasmimguimaraes_mma" },
  "Andressa Romero":            { instagram: "andressaromeromma" },
  "Raiane Vinuto":              { instagram: "raianevinuto" },
  "Walleska Karoline":          { instagram: "walleskakarolinemma" },
};
