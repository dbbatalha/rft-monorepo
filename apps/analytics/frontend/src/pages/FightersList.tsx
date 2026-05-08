import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { useLocation, useSearch } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Users, Search, ChevronRight, Crown, X, ArrowLeft } from "lucide-react";
import { Input } from "@rft/shared/ui/input";
import { Button } from "@rft/shared/ui/button";
import { Badge } from "@rft/shared/ui/badge";
import { getFlagEmoji, getFlagEmojiOrFallback } from "@rft/shared/flagEmoji";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";
import { isRftAthlete } from "@rft/shared/rftAthletes";
import { translateWeightClass, weightClassTooltip } from "@rft/shared/weightClasses";

const ORG_SHORT: Record<string, string> = {
  "UFC": "UFC",
  "ONE Championship": "ONE",
  "PFL": "PFL",
  "Jungle Fight": "Jungle Fight",
  "RIZIN": "RIZIN",
  "LFA": "LFA",
  "Strikeforce": "SF",
  "Pride FC": "Pride",
  "WEC": "WEC",
  "KSW": "KSW",
  "Cage Warriors": "CW",
};

const WEIGHT_CLASS_ORDER = [
  "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
  "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
  "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
  "Women's Featherweight", "Atomweight",
];

function isWomens(weightClass: string | null): boolean {
  if (!weightClass) return false;
  return weightClass.toLowerCase().startsWith("women") || weightClass === "Atomweight";
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest pt-1.5 shrink-0 w-14">{label}</span>
      <div className="flex gap-1.5 flex-wrap min-w-0">{children}</div>
    </div>
  );
}

function Chip({
  active, onClick, children, activeClass, title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeClass?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
        active
          ? activeClass ?? "bg-primary/20 border-primary/50 text-primary"
          : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function FightersList() {
  const [, setLocation] = useLocation();
  const urlSearch = useSearch();
  const initialSearchQuery = new URLSearchParams(urlSearch).get("search") ?? "";
  const [search, setSearch] = useState(initialSearchQuery);

  // Quando a URL ?search=… mudar (link externo, ex. de ProfessoresSection),
  // sincroniza o input.
  useEffect(() => {
    const q = new URLSearchParams(urlSearch).get("search") ?? "";
    setSearch(q);
  }, [urlSearch]);
  const [filterOrg, setFilterOrg]           = useState<string | null>(null);
  const [filterStatus, setFilterStatus]     = useState<"all" | "champion" | "top10">("all");
  const [filterWeightClass, setFilterWC]    = useState<string>("all");
  const [filterGender, setFilterGender]     = useState<string>("all");

  const { data: fighters = [], isLoading } = staticTrpc.fighters.listAlpha.useQuery();
  const { data: top10NamesArr = [] }       = trpc.fighters.top10Names.useQuery();
  const top10Set = useMemo(() => new Set(top10NamesArr), [top10NamesArr]);

  // Org list derived from data (sorted, no "all")
  const orgList = useMemo(() => {
    const orgs = new Set<string>();
    for (const f of fighters) orgs.add(f.sourceOrg ?? "UFC");
    return Array.from(orgs).sort();
  }, [fighters]);

  // Weight classes present in data, in canonical order — sem prefixo "Women's"
  const stripGender = (wc: string | null) => (wc ?? "").replace(/^Women's\s+/i, "").trim();
  const wcList = useMemo(() => {
    const available = new Set<string>();
    for (const f of fighters) {
      const norm = stripGender(f.weightClass);
      if (norm) available.add(norm);
    }
    const ORDER_NORM = Array.from(new Set(WEIGHT_CLASS_ORDER.map(stripGender)));
    return ORDER_NORM.filter((wc) => available.has(wc));
  }, [fighters]);

  const filtered = useMemo(() => fighters.filter((f) => {
    // Hide fighters with no fight data at all (all-zero records)
    if ((f.wins ?? 0) === 0 && (f.losses ?? 0) === 0 && (f.draws ?? 0) === 0) return false;
    if (filterStatus === "champion" && f.isChampion !== 1 && (f as any).isInterim !== 1) return false;
    if (filterStatus === "top10" && !top10Set.has(f.name)) return false;
    if (filterOrg !== null) {
      const org = f.sourceOrg ?? "UFC";
      if (org !== filterOrg) return false;
    }
    if (filterGender !== "all") {
      const female = isWomens(f.weightClass);
      if (filterGender === "female" && !female) return false;
      if (filterGender === "male"   &&  female) return false;
    }
    if (filterWeightClass !== "all" && stripGender(f.weightClass) !== filterWeightClass) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !f.name.toLowerCase().includes(q) &&
        !(f.nickname ?? "").toLowerCase().includes(q) &&
        !(f.weightClass ?? "").toLowerCase().includes(q) &&
        !(f.nationality ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [fighters, search, filterOrg, filterGender, filterWeightClass, filterStatus, top10Set]);

  const grouped: Record<string, typeof filtered> = {};
  for (const f of filtered) {
    const letter = f.name[0]?.toUpperCase() ?? "#";
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(f);
  }
  const letters = Object.keys(grouped).sort();

  const hasActiveFilters = filterOrg !== null || filterStatus !== "all" || filterWeightClass !== "all" || filterGender !== "all";

  function clearFilters() {
    setFilterOrg(null);
    setFilterStatus("all");
    setFilterWC("all");
    setFilterGender("all");
  }

  const resetKey = `${search}|${filterOrg}|${filterGender}|${filterWeightClass}|${filterStatus}`;
  const { visibleCount, sentinelRef, hasMore, ensureVisible } = useInfiniteScroll(letters.length, 5, resetKey);
  const visibleLetters = letters.slice(0, visibleCount);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-500 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FighterAvatarDiamond icon={Users} variant="rft" size="md" />
              <h1 className="text-xl font-black tracking-tight text-foreground">Todos os Atletas</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Carregando..." : "Busque por nome, apelido, categoria ou nacionalidade."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, apelido, categoria ou nacionalidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border focus:border-primary/40 h-10"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Filtros</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              <X className="h-3 w-3" />Limpar
            </button>
          )}
        </div>

        {/* Row 1 — Organização */}
        <FilterRow label="Org">
          {orgList.map((org) => (
            <Chip
              key={org}
              active={filterOrg === org}
              onClick={() => setFilterOrg(filterOrg === org ? null : org)}
            >
              {ORG_SHORT[org] ?? org}
            </Chip>
          ))}
        </FilterRow>

        {/* Row 2 — Status */}
        <FilterRow label="Status">
          <Chip active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>Todos</Chip>
          <Chip
            active={filterStatus === "champion"}
            onClick={() => setFilterStatus(filterStatus === "champion" ? "all" : "champion")}
            activeClass="bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
          >
            <span className="flex items-center gap-1"><Crown className="h-3 w-3" />Campeões</span>
          </Chip>
          <Chip
            active={filterStatus === "top10"}
            onClick={() => setFilterStatus(filterStatus === "top10" ? "all" : "top10")}
            activeClass="bg-amber-500/20 border-amber-500/50 text-amber-400"
          >
            Top 10
          </Chip>
        </FilterRow>

        {/* Row 3 — Categoria */}
        <FilterRow label="Categoria">
          <Chip active={filterWeightClass === "all"} onClick={() => setFilterWC("all")}>Todas</Chip>
          {wcList.map((wc) => (
            <Chip
              key={wc}
              active={filterWeightClass === wc}
              onClick={() => setFilterWC(filterWeightClass === wc ? "all" : wc)}
              title={weightClassTooltip(wc)}
            >
              {translateWeightClass(wc)}
            </Chip>
          ))}
        </FilterRow>

        {/* Row 4 — Gênero */}
        <FilterRow label="Gênero">
          {(["all", "male", "female"] as const).map((g) => (
            <Chip
              key={g}
              active={filterGender === g}
              onClick={() => setFilterGender(g)}
            >
              {g === "all" ? "Todos" : g === "male" ? "Masculino" : "Feminino"}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {/* ── Alphabet jump ─────────────────────────────── */}
      {!isLoading && letters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap p-3 border border-yellow-400/15 bg-black/40">
          <span className="text-[10px] font-heading uppercase tracking-widest text-yellow-400/70 mr-1 shrink-0">
            Ir para:
          </span>
          {letters.map((l, idx) => (
            <a
              key={l}
              href={`#letter-${l}`}
              onClick={(e) => {
                e.preventDefault();
                ensureVisible(idx);
                requestAnimationFrame(() => {
                  document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
              className="w-7 h-7 rotate-45 flex items-center justify-center font-display font-bold text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400 hover:text-black transition-all group"
            >
              <span className="-rotate-45 text-[11px]">{l}</span>
            </a>
          ))}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum atleta encontrado{search ? ` para "${search}"` : ""}</p>
          <button onClick={() => { setSearch(""); clearFilters(); }} className="text-xs text-primary mt-2 hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      {/* ── Grouped list ─────────────────────────────── */}
      {!isLoading && visibleLetters.map((letter) => (
        <div key={letter} id={`letter-${letter}`} className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-3">
            <FighterAvatarDiamond initials={letter} variant="rft" size="sm" />
            <div className="flex-1 h-px bg-yellow-400/20" />
            <span className="text-[10px] text-yellow-400/60 font-heading uppercase tracking-widest">{grouped[letter].length} atletas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {grouped[letter].map((fighter) => {
              const initials  = fighter.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              const isChamp   = fighter.isChampion === 1;
              const isInterim = fighter.isInterim  === 1;
              const isTop10   = top10Set.has(fighter.name);
              return (
                <button
                  key={fighter.id}
                  onClick={() => setLocation(`/fighter/${fighter.id}`)}
                  className="flex items-center gap-3 p-3 border border-yellow-400/15 bg-black/40 hover:border-yellow-400/60 hover:bg-yellow-400/5 transition-all text-left group"
                >
                  {/* Avatar diamond */}
                  <div className="relative shrink-0">
                    <FighterAvatarDiamond initials={initials} variant="rft" size="md" />
                    {(isChamp || isInterim) && (
                      <span
                        title={isInterim ? "Campeão Interino" : "Campeão"}
                        className="absolute -top-2 -right-2 leading-none"
                      >
                        <Crown
                          className={`h-3.5 w-3.5 ${
                            isInterim ? "text-orange-400" : "text-yellow-400"
                          }`}
                        />
                      </span>
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-display tracking-wider text-white text-base group-hover:text-yellow-400 transition-colors truncate min-w-0">
                        {fighter.name}
                      </p>
                      {isRftAthlete(fighter.name) && (
                        <img
                          src="/imagens/rft-losango.png"
                          alt="Atleta RFT"
                          title="Atleta RFT"
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      {getFlagEmoji((fighter as any).nationality) && (
                        <span
                          title={(fighter as any).nationality}
                          className="text-sm leading-none shrink-0"
                        >
                          {getFlagEmoji((fighter as any).nationality)}
                        </span>
                      )}
                      {isInterim && <span className="text-[9px] font-heading uppercase tracking-widest px-1.5 py-0.5 text-orange-400 border border-orange-400/40 shrink-0">Interino</span>}
                      {!isInterim && isChamp && <span className="text-[9px] font-heading uppercase tracking-widest px-1.5 py-0.5 text-yellow-400 border border-yellow-400/40 shrink-0">Campeão</span>}
                      {!isChamp && !isInterim && isTop10 && <span className="text-[9px] font-heading uppercase tracking-widest px-1.5 py-0.5 text-yellow-400/70 border border-yellow-400/30 shrink-0">Top 10</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {fighter.nickname && (
                        <span className="text-[10px] text-white/40 truncate italic">"{fighter.nickname}"</span>
                      )}
                      {fighter.weightClass && (
                        <span
                          title={weightClassTooltip(fighter.weightClass)}
                          className="text-[10px] uppercase tracking-widest font-heading text-white/40 border border-white/15 px-1.5 py-0.5 shrink-0"
                        >
                          {translateWeightClass(fighter.weightClass)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Record + Org */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-display tracking-wider text-base">
                        <span className="text-yellow-400">{fighter.wins}</span>
                        <span className="text-white/30">-</span>
                        <span className="text-red-500">{fighter.losses}</span>
                        {(fighter.draws ?? 0) > 0 && <span className="text-white/30">-{fighter.draws}</span>}
                      </p>
                      {fighter.sourceOrg ? (
                        <p className="text-[10px] font-heading uppercase tracking-widest text-yellow-400/70 truncate max-w-[80px]">
                          {ORG_SHORT[fighter.sourceOrg] ?? fighter.sourceOrg}
                        </p>
                      ) : (
                        <p className="text-[10px] font-heading uppercase tracking-widest text-white/40">UFC</p>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-yellow-400 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sentinel */}
      {!isLoading && filtered.length > 0 && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {hasMore && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-150" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
