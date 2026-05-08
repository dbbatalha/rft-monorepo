/**
 * Camada de leitura estática — substitui as procedures tRPC quando o site
 * roda em hospedagem só-estática (sem backend Node).
 *
 * Cada função abaixo expõe um hook compatível com a API do tRPC
 * (`{ data, isLoading, error, refetch }`) usando `@tanstack/react-query`
 * por baixo, fazendo `fetch()` dos JSONs gerados por
 * `apps/analytics/backend/python/modulo_2b_etl/export_static.py`.
 *
 * Arquivos esperados em `/data/`:
 *   stats.json
 *   orgs.json
 *   ranking-orgs.json
 *   top10-names.json
 *   fighters.json                    (lista alfabética completa)
 *   fighters-light.json              (lista enxuta para dropdowns)
 *   fighters-recent.json             (top 20 recentes)
 *   rankings/<org>.json
 *   upcoming/<org>.json
 *   fighters/<id>.json
 *   fights-by-fighter/<id>.json
 */
import { useQuery } from "@tanstack/react-query";

// BASE_URL pode ser:
//   - "/analytics/"              (Cloudflare/domínio próprio)
//   - "/rft-monorepo/analytics/" (GitHub Pages)
// Os JSONs ficam em <BASE_URL>data/.
const BASE = `${import.meta.env.BASE_URL}data`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "default" });
  if (!res.ok) throw new Error(`fetch ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

export type DashboardStats = {
  totalFighters: number;
  totalPredictions: number;
  avgWinRate: number;
  topFighters: any[];
};

export const useStats = () =>
  useQuery<DashboardStats>({
    queryKey: ["data", "stats"],
    queryFn: () => fetchJson("/stats.json"),
    staleTime: 1000 * 60 * 60,
  });

export type Org = { name: string; shortName: string | null };

export const useOrgs = () =>
  useQuery<Org[]>({
    queryKey: ["data", "orgs"],
    queryFn: () => fetchJson("/orgs.json"),
    staleTime: 1000 * 60 * 60,
  });

export const useRankingOrgs = () =>
  useQuery<string[]>({
    queryKey: ["data", "ranking-orgs"],
    queryFn: () => fetchJson("/ranking-orgs.json"),
    staleTime: 1000 * 60 * 60,
  });

export const useTop10Names = () =>
  useQuery<string[]>({
    queryKey: ["data", "top10-names"],
    queryFn: () => fetchJson("/top10-names.json"),
    staleTime: 1000 * 60 * 60,
  });

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export const useFightersAlpha = () =>
  useQuery<any[]>({
    queryKey: ["data", "fighters"],
    queryFn: () => fetchJson("/fighters.json"),
    staleTime: 1000 * 60 * 60,
  });

export const useFightersLight = () =>
  useQuery<any[]>({
    queryKey: ["data", "fighters-light"],
    queryFn: () => fetchJson("/fighters-light.json"),
    staleTime: 1000 * 60 * 60,
  });

export const useFightersRecent = () =>
  useQuery<any[]>({
    queryKey: ["data", "fighters-recent"],
    queryFn: () => fetchJson("/fighters-recent.json"),
    staleTime: 1000 * 60 * 60,
  });

// ---------------------------------------------------------------------------
// By org / id
// ---------------------------------------------------------------------------

export const useRankings = (org: string | undefined) =>
  useQuery<{ weightClass: string; fighters: any[] }[]>({
    queryKey: ["data", "rankings", org],
    queryFn: () => fetchJson(`/rankings/${encodeURIComponent(org || "UFC")}.json`),
    enabled: !!org,
    staleTime: 1000 * 60 * 60,
  });

type UpcomingEvent = { name: string; date: string; location: string; url: string; bouts: any[] };
export const useUpcoming = (org: string) =>
  useQuery<UpcomingEvent[]>({
    queryKey: ["data", "upcoming", org],
    queryFn: async () => {
      try {
        return await fetchJson<UpcomingEvent[]>(`/upcoming/${org.toLowerCase()}.json`);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 30,
  });

export const useFighter = (id: number | undefined) =>
  useQuery<any>({
    queryKey: ["data", "fighter", id],
    queryFn: () => fetchJson(`/fighters/${id}.json`),
    enabled: !!id,
    staleTime: 1000 * 60 * 60,
  });

export const useFightsByFighter = (fighterId: number | undefined) =>
  useQuery<any[]>({
    queryKey: ["data", "fights-by-fighter", fighterId],
    queryFn: () => fetchJson(`/fights-by-fighter/${fighterId}.json`),
    enabled: !!fighterId,
    staleTime: 1000 * 60 * 60,
  });

// ---------------------------------------------------------------------------
// Compatibility shim — mantém a API antiga `trpc.*.useQuery()`
// pra minimizar mudanças nas páginas.
// ---------------------------------------------------------------------------
//
// Antes:
//    const { data } = trpc.fighters.listAlpha.useQuery();
//    const { data } = trpc.fighters.getById.useQuery({ id });
//
// Depois (mesmo shape):
//    const { data } = staticTrpc.fighters.listAlpha.useQuery();
//    const { data } = staticTrpc.fighters.getById.useQuery({ id });
//
// As páginas só precisam trocar `trpc` → `staticTrpc` no import.

export const staticTrpc = {
  dashboard: {
    stats:               { useQuery: () => useStats() },
    organizations:       { useQuery: () => useOrgs() },
    rankingOrganizations:{ useQuery: () => useRankingOrgs() },
  },
  fighters: {
    listAlpha:  { useQuery: () => useFightersAlpha() },
    list:       { useQuery: () => useFightersLight() },
    recent:     { useQuery: () => useFightersRecent() },
    top10Names: { useQuery: () => useTop10Names() },
    rankings:   { useQuery: (input: { org?: string }) => useRankings(input?.org) },
    getById:    {
      useQuery: (input: { id: number }, opts?: { enabled?: boolean }) => {
        const q = useFighter(opts?.enabled === false ? undefined : input.id);
        return q;
      },
    },
  },
  fights: {
    byFighter: {
      useQuery: (input: { fighterId: number }, opts?: { enabled?: boolean }) =>
        useFightsByFighter(opts?.enabled === false ? undefined : input.fighterId),
    },
    // Stats per-fight ainda não exportadas estaticamente — retorna array vazio
    // com a mesma forma de useQuery pra páginas que checam por isLoading/data.
    stats: {
      useQuery: (_input: { fightIds: number[] }, _opts?: { enabled?: boolean }) =>
        useQuery<any[]>({
          queryKey: ["data", "fights-stats-stub"],
          queryFn: async () => [],
          staleTime: Infinity,
        }),
    },
  },
  events: {
    upcoming: {
      useQuery: (input?: { org?: string }, _opts?: any) =>
        useUpcoming((input?.org ?? "ufc")),
    },
  },
} as const;
