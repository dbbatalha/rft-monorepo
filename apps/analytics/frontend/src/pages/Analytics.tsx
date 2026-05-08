import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { usePredictMutation } from "@/lib/predict";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rft/shared/ui/tabs";
import { Input } from "@rft/shared/ui/input";
import { Badge } from "@rft/shared/ui/badge";
import { Button } from "@rft/shared/ui/button";
import { Progress } from "@rft/shared/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area,
} from "recharts";
import {
  BarChart3, TrendingUp, Activity, Target, ArrowLeft, Search,
  Crown, Swords, Zap, RefreshCw, AlertTriangle, ChevronRight, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { getFlagEmoji, getFlagEmojiOrFallback } from "@rft/shared/flagEmoji";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";
import { isRftAthlete } from "@rft/shared/rftAthletes";
import { translateWeightClass, weightClassTooltip } from "@rft/shared/weightClasses";
import { asset } from "@/lib/url";

const COLORS = ["#f97316", "#f59e0b", "#2dd4bf", "#22c55e", "#a78bfa"];

const WEIGHT_CLASS_ORDER = [
  "Atomweight", "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
  "Women's Featherweight", "Women's Lightweight",
  "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
  "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
];

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-muted-foreground w-14 shrink-0 pt-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active, onClick, children, title,
  activeClass = "bg-primary/20 border-primary/50 text-primary",
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; activeClass?: string; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? activeClass
          : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "oklch(0.16 0.01 240)",
    border: "1px solid oklch(0.25 0.01 240)",
    borderRadius: "8px",
    color: "oklch(0.95 0.01 240)",
    fontSize: "12px",
  },
};

const ORG_SHORT: Record<string, string> = {
  "UFC": "UFC", "ONE Championship": "ONE", "PFL": "PFL",
  "Jungle Fight": "Jungle Fight", "RIZIN": "RIZIN", "LFA": "LFA",
};

type FighterOption = {
  id: number;
  name: string;
  nickname?: string | null;
  weightClass?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  isChampion?: number | null;
  sourceOrg?: string | null;
};

type PredictionResult = {
  fighter1WinProbability: number;
  fighter2WinProbability: number;
  predictedWinner: string;
  confidence: number;
  keyFactors: string[];
  probKoTko: number;
  probSubmission: number;
  probDecision: number;
  modelBreakdown: { model: string; f1Prob: number; f2Prob: number; weight: number }[];
};

function FighterSelect({
  value, onChange, placeholder, fighters, accentClass,
}: {
  value: FighterOption | null;
  onChange: (f: FighterOption | null) => void;
  placeholder: string;
  fighters: FighterOption[];
  accentClass?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value?.name ?? ""); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = query.trim().length === 0
    ? fighters.slice(0, 15)
    : fighters.filter((f) => {
        const q = query.toLowerCase();
        return f.name.toLowerCase().includes(q) || (f.nickname ?? "").toLowerCase().includes(q);
      }).slice(0, 12);

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`bg-input border-border text-foreground ${accentClass ?? ""}`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {suggestions.map((f) => (
            <button
              key={f.id}
              onMouseDown={() => { onChange(f); setQuery(f.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-sm text-foreground font-medium">{f.name}</span>
                {f.nickname && <span className="text-xs text-muted-foreground ml-1.5">"{f.nickname}"</span>}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-muted-foreground">{f.weightClass}</span>
                {f.wins != null && <span className="text-xs text-muted-foreground ml-2">{f.wins}W-{f.losses}L</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function buildFighterRadar(f: any) {
  return {
    "Win Rate": Math.round((f?.winRate ?? 0.5) * 100),
    "Finalização": Math.round((f?.finishRate ?? 0.5) * 100),
    "Experiência": Math.round(Math.min((f?.totalFightsPro ?? 10) / 35 * 100, 100)),
    "Sequência": Math.round(Math.min(((f?.currentStreakCount ?? 0) / 8) * 100, 100)),
    "KO Rate": Math.round(f?.wins ? Math.min(((f?.koTkoWins ?? 0) / f.wins) * 100, 100) : 0),
    "Sub Rate": Math.round((f?.submissionWinRate ?? 0) * 100),
  };
}

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [lockedFighter, setLockedFighter] = useState<FighterOption | null>(null);
  const [search, setSearch] = useState("");
  const [filterOrg, setFilterOrg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "champion" | "top10">("all");
  const [filterWeightClass, setFilterWC] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [fighter2, setFighter2] = useState<FighterOption | null>(null);
  const [predOpponent, setPredOpponent] = useState<FighterOption | null>(null);
  const [predResult, setPredResult] = useState<PredictionResult | null>(null);

  const { data: allFighters = [] } = staticTrpc.fighters.listAlpha.useQuery();
  const { data: top10NamesArr = [] } = trpc.fighters.top10Names.useQuery();
  const top10Set = useMemo(() => new Set(top10NamesArr), [top10NamesArr]);

  const { data: fighter1Data } = staticTrpc.fighters.getById.useQuery(
    { id: lockedFighter?.id ?? 0 }, { enabled: !!lockedFighter }
  );
  const { data: fights1 } = staticTrpc.fights.byFighter.useQuery(
    { fighterId: lockedFighter?.id ?? 0 }, { enabled: !!lockedFighter }
  );
  const { data: fighter2Data } = staticTrpc.fighters.getById.useQuery(
    { id: fighter2?.id ?? 0 }, { enabled: !!fighter2 }
  );
  const { data: fights2 } = staticTrpc.fights.byFighter.useQuery(
    { fighterId: fighter2?.id ?? 0 }, { enabled: !!fighter2 }
  );

  const predictMutation = usePredictMutation({
    onSuccess: (data) => {
      setPredResult(data as unknown as PredictionResult);
      toast.success("Predição calculada com sucesso!");
    },
    onError: () => toast.error("Erro ao calcular predição."),
  });

  const orgList = useMemo(() => {
    const seen: Record<string, boolean> = {};
    return (allFighters as any[])
      .map((f) => f.sourceOrg ?? "")
      .filter((o) => { if (!o || seen[o]) return false; seen[o] = true; return true; })
      .sort();
  }, [allFighters]);

  const wcList = useMemo(() => {
    const stripGender = (wc: string | null) => (wc ?? "").replace(/^Women's\s+/i, "").trim();
    const present = new Set<string>();
    for (const f of allFighters as any[]) {
      const norm = stripGender(f.weightClass);
      if (norm) present.add(norm);
    }
    const ORDER_NORM = Array.from(new Set(WEIGHT_CLASS_ORDER.map(stripGender)));
    return ORDER_NORM.filter((wc) => present.has(wc));
  }, [allFighters]);

  const sameWeightFighters = useMemo(
    () => allFighters.filter((f) => f.id !== lockedFighter?.id && f.weightClass === lockedFighter?.weightClass),
    [allFighters, lockedFighter]
  );

  const filteredFighters = useMemo(() => {
    let list = (allFighters as any[]).filter(
      (f) => (f.wins ?? 0) > 0 || (f.losses ?? 0) > 0 || (f.draws ?? 0) > 0
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.nickname ?? "").toLowerCase().includes(q) ||
          (f.weightClass ?? "").toLowerCase().includes(q) ||
          (f.sourceOrg ?? "").toLowerCase().includes(q)
      );
    }
    if (filterOrg !== null) {
      list = list.filter((f) => (f.sourceOrg ?? "") === filterOrg);
    }
    if (filterStatus === "champion") {
      list = list.filter((f) => f.isChampion === 1 || f.isInterim === 1);
    } else if (filterStatus === "top10") {
      list = list.filter((f) => top10Set.has(f.name));
    }
    if (filterWeightClass !== "all") {
      const stripGender = (wc: string | null) => (wc ?? "").replace(/^Women's\s+/i, "").trim();
      list = list.filter((f) => stripGender(f.weightClass) === filterWeightClass);
    }
    if (filterGender !== "all") {
      list = list.filter((f) => {
        const wc = f.weightClass ?? "";
        const isWomen = wc.toLowerCase().includes("women") || wc === "Atomweight";
        return filterGender === "female" ? isWomen : !isWomen;
      });
    }
    return list;
  }, [allFighters, search, filterOrg, filterStatus, filterWeightClass, filterGender, top10Set]);

  // Infinite scroll for the fighter selection grid — 30 at a time, reset on any filter change
  const filterResetKey = `${search}|${filterOrg}|${filterGender}|${filterWeightClass}|${filterStatus}`;
  const {
    visibleCount: fighterVisibleCount,
    sentinelRef: fighterSentinelRef,
    hasMore: fighterHasMore,
    ensureVisible: ensureFighterVisible,
  } = useInfiniteScroll(filteredFighters.length, 30, filterResetKey);
  const visibleFighters = filteredFighters.slice(0, fighterVisibleCount);

  // Alphabet jump — derive letters from the full filtered list
  const alphaLetters = useMemo(() => {
    const set = new Set<string>();
    for (const f of filteredFighters as any[]) {
      const l = f.name?.[0]?.toUpperCase();
      if (l) set.add(l);
    }
    return Array.from(set).sort();
  }, [filteredFighters]);

  // First-occurrence index per letter (within the filtered list ordering)
  const alphaFirstIndex = useMemo(() => {
    const map: Record<string, number> = {};
    (filteredFighters as any[]).forEach((f, i) => {
      const l = f.name?.[0]?.toUpperCase();
      if (l && map[l] === undefined) map[l] = i;
    });
    return map;
  }, [filteredFighters]);

  const fights = fights1 ?? [];

  const timelineData = fights.slice().reverse().slice(-15).map((f) => ({
    name: f.opponent.split(" ").pop() || f.opponent,
    time: f.elapsedTimeSeconds ? Math.round(f.elapsedTimeSeconds / 60) : 0,
  }));

  const methodData = Object.entries(
    fights.reduce((acc, f) => {
      const m = f.methodCategory || "OTHER";
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace("_", "/"), value }));

  const promotionData = Object.entries(
    fights.reduce((acc, f) => {
      const p = f.promotion || "Other";
      if (!acc[p]) acc[p] = { wins: 0, losses: 0 };
      if (f.result === "win") acc[p].wins++;
      else if (f.result === "loss") acc[p].losses++;
      return acc;
    }, {} as Record<string, { wins: number; losses: number }>)
  ).map(([name, data]) => ({ name, ...(data as { wins: number; losses: number }) }));

  const roundData = Object.entries(
    fights.reduce((acc, f) => {
      const r = `R${f.round || 0}`;
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => a[0].localeCompare(b[0])).map(([name, value]) => ({ name, value }));

  const careerData = fights.slice().reverse().reduce(
    (acc, f, i) => {
      const prev = acc[i - 1] || { wins: 0, losses: 0 };
      const wins = prev.wins + (f.result === "win" ? 1 : 0);
      const losses = prev.losses + (f.result === "loss" ? 1 : 0);
      return [...acc, { fight: i + 1, wins, losses, winRate: Math.round((wins / (i + 1)) * 100) }];
    },
    [] as { fight: number; wins: number; losses: number; winRate: number }[]
  );

  const r1 = buildFighterRadar(fighter1Data);
  const r2 = buildFighterRadar(fighter2Data);
  const comparisonData = Object.keys(r1).map((subject) => ({
    subject,
    F1: r1[subject as keyof typeof r1],
    F2: r2[subject as keyof typeof r2],
  }));

  const getConfidenceLabel = (conf: number) =>
    conf >= 0.7
      ? { label: "Alta Confiança", color: "text-emerald-400" }
      : conf >= 0.4
      ? { label: "Confiança Moderada", color: "text-yellow-400" }
      : { label: "Baixa Confiança", color: "text-rose-400" };

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  if (!lockedFighter) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header */}
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
                <FighterAvatarDiamond icon={BarChart3} variant="rft" size="md" />
                <h1 className="text-xl font-black tracking-tight text-foreground">Advanced Analytics</h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione um atleta para ver analytics avançados, comparações e fazer predições da mesma divisão.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, apelido, categoria ou organização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border focus:border-primary/40 h-10"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <FilterRow label="Organização">
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
          <FilterRow label="Status">
            <Chip active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>Todos</Chip>
            <Chip
              active={filterStatus === "champion"}
              onClick={() => setFilterStatus("champion")}
              activeClass="bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
            >Campeões</Chip>
            <Chip
              active={filterStatus === "top10"}
              onClick={() => setFilterStatus("top10")}
              activeClass="bg-amber-500/20 border-amber-500/50 text-amber-400"
            >Top 10</Chip>
          </FilterRow>
          <FilterRow label="Categoria">
            <Chip active={filterWeightClass === "all"} onClick={() => setFilterWC("all")}>Todas</Chip>
            {wcList.map((wc) => (
              <Chip
                key={wc}
                active={filterWeightClass === wc}
                onClick={() => setFilterWC(wc)}
                title={weightClassTooltip(wc)}
              >
                {translateWeightClass(wc)}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Gênero">
            <Chip active={filterGender === "all"} onClick={() => setFilterGender("all")}>Todos</Chip>
            <Chip active={filterGender === "male"} onClick={() => setFilterGender("male")}>Masculino</Chip>
            <Chip active={filterGender === "female"} onClick={() => setFilterGender("female")}>Feminino</Chip>
          </FilterRow>
        </div>

        {/* Alphabet jump */}
        {alphaLetters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap p-3 border border-yellow-400/15 bg-black/40">
            <span className="text-[10px] font-heading uppercase tracking-widest text-yellow-400/70 mr-1 shrink-0">
              Ir para:
            </span>
            {alphaLetters.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                onClick={(e) => {
                  e.preventDefault();
                  const idx = alphaFirstIndex[l] ?? 0;
                  ensureFighterVisible(idx);
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

        {/* Fighter grid */}
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {filteredFighters.length} atleta{filteredFighters.length !== 1 ? "s" : ""} — clique para selecionar e ver analytics
          </p>
          {(() => {
            const grouped: Record<string, typeof visibleFighters> = {};
            for (const f of visibleFighters) {
              const letter = f.name[0]?.toUpperCase() ?? "#";
              (grouped[letter] ??= []).push(f);
            }
            const letters = Object.keys(grouped).sort();
            return letters.map((letter) => (
              <div key={letter} id={`letter-${letter}`} className="mb-5 scroll-mt-24">
                <div className="flex items-center gap-3 mb-3">
                  <FighterAvatarDiamond initials={letter} variant="rft" size="sm" />
                  <div className="flex-1 h-px bg-yellow-400/20" />
                  <span className="text-[10px] text-yellow-400/60 font-heading uppercase tracking-widest">
                    {grouped[letter].length} atleta{grouped[letter].length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {grouped[letter].map((fighter) => {
                    const initials = fighter.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                    const isChamp   = fighter.isChampion === 1;
                    const isInterim = (fighter as any).isInterim === 1;
                    const isTop10   = top10Set.has(fighter.name);
                    return (
                      <button
                        key={fighter.id}
                        onClick={() => {
                          setLockedFighter(fighter);
                          setFighter2(null);
                          setPredOpponent(null);
                          setPredResult(null);
                        }}
                        className="flex items-center gap-3 p-3 border border-yellow-400/15 bg-black/40 hover:border-yellow-400/60 hover:bg-yellow-400/5 transition-all text-left group"
                      >
                        {/* Avatar diamond */}
                        <div className="relative shrink-0">
                          <FighterAvatarDiamond initials={initials} variant="rft" size="md" />
                          {(isChamp || isInterim) && (
                            <Crown
                              className={`absolute -top-2 -right-2 h-3.5 w-3.5 ${
                                isInterim ? "text-orange-400" : "text-yellow-400"
                              }`}
                            />
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
                                src={asset("/imagens/rft-losango.png")}
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
            ));
          })()}
          {filteredFighters.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhum atleta encontrado para "{search}"</p>
              <button onClick={() => setSearch("")} className="text-xs text-primary mt-2 hover:underline">Limpar busca</button>
            </div>
          )}
          {/* Sentinel */}
          <div ref={fighterSentinelRef} className="py-2 flex justify-center">
            {fighterHasMore && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-150" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ANALYSIS VIEW ────────────────────────────────────────────────────────────
  const isChamp = lockedFighter.isChampion === 1;
  const initials = lockedFighter.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Locked fighter header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-500 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="sm"
            onClick={() => { setLockedFighter(null); setSearch(""); }}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />Lista
          </Button>
          <div className="relative shrink-0">
            <FighterAvatarDiamond initials={initials} isChampion={isChamp} size="lg" />
            {isChamp && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
                <Crown className="h-2.5 w-2.5 text-yellow-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground truncate">{lockedFighter.name}</h1>
              <Lock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              {isChamp && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs shrink-0">CAMPEÃO</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {fighter1Data
                ? `${fighter1Data.wins}W-${fighter1Data.losses}L-${fighter1Data.draws}D`
                : `${lockedFighter.wins}W-${lockedFighter.losses}L`}
              {lockedFighter.weightClass && ` • ${lockedFighter.weightClass}`}
              {lockedFighter.sourceOrg && ` • ${ORG_SHORT[lockedFighter.sourceOrg] ?? lockedFighter.sourceOrg}`}
            </p>
          </div>
        </div>
      </div>

      {fights.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-pulse" />
            <p className="text-muted-foreground">Nenhuma luta encontrada para {lockedFighter.name}.</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="performance">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-xl">
          <TabsTrigger value="performance" className="rounded-lg text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />Performance
          </TabsTrigger>
          <TabsTrigger value="methods" className="rounded-lg text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />Métodos
          </TabsTrigger>
          <TabsTrigger value="career" className="rounded-lg text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Activity className="h-3.5 w-3.5 mr-1" />Carreira
          </TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-lg text-xs data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-400">
            <Target className="h-3.5 w-3.5 mr-1" />Comparação
          </TabsTrigger>
          <TabsTrigger value="predicao" className="rounded-lg text-xs data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-400">
            <Swords className="h-3.5 w-3.5 mr-1" />Predição
          </TabsTrigger>
        </TabsList>

        {/* ── Performance ────────────────────────────── */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total de Lutas", value: fights.length, color: "text-foreground" },
              { label: "Vitórias", value: fights.filter((f) => f.result === "win").length, color: "text-green-400" },
              { label: "Derrotas", value: fights.filter((f) => f.result === "loss").length, color: "text-red-400" },
              { label: "Finalizações", value: fights.filter((f) => f.result === "win" && f.methodCategory !== "DECISION").length, color: "text-orange-400" },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />Taxa de Vitória ao Longo da Carreira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={careerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
                    <XAxis dataKey="fight" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Win Rate"]} />
                    <Area type="monotone" dataKey="winRate" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />Duração das Lutas (minutos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timelineData.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
                    <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} min`, "Duração"]} />
                    <Bar dataKey="time" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />Distribuição por Round
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={roundData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Methods ────────────────────────────────── */}
        <TabsContent value="methods" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Métodos de Finalização</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={methodData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "oklch(0.60 0.01 240)" }}>
                      {methodData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">W/L por Organização</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={promotionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
                    <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.01 240)" }} />
                    <Bar dataKey="wins" name="Vitórias" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="losses" name="Derrotas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Career ─────────────────────────────────── */}
        <TabsContent value="career" className="space-y-4 mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Progressão de Vitórias e Derrotas — {lockedFighter.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={careerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" />
                  <XAxis dataKey="fight" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }}
                    label={{ value: "Luta #", position: "insideBottom", offset: -5, fill: "oklch(0.60 0.01 240)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.01 240)" }} />
                  <Line type="monotone" dataKey="wins" name="Vitórias" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="losses" name="Derrotas" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Comparison ─────────────────────────────── */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-foreground shrink-0">
                  Comparar com <span className="text-xs text-muted-foreground">(mesma divisão)</span>:
                </span>
                <div className="flex-1 min-w-48 max-w-80">
                  <FighterSelect
                    value={fighter2}
                    onChange={setFighter2}
                    placeholder={
                      sameWeightFighters.length > 0
                        ? `Buscar em ${lockedFighter.weightClass}...`
                        : "Sem atletas na mesma divisão"
                    }
                    accentClass="border-teal-500/40"
                    fighters={sameWeightFighters}
                  />
                </div>
                {fighter2Data && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {fighter2Data.wins}W-{fighter2Data.losses}L · {fighter2Data.weightClass}
                  </Badge>
                )}
              </div>
              {sameWeightFighters.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Nenhum outro atleta encontrado na categoria {lockedFighter.weightClass}.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                {lockedFighter.name}{fighter2 ? ` vs ${fighter2.name}` : " — Perfil Técnico"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={comparisonData}>
                  <PolarGrid stroke="oklch(0.25 0.01 240)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 11 }} />
                  <Radar name={lockedFighter.name} dataKey="F1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                  {fighter2 && <Radar name={fighter2.name} dataKey="F2" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.3} />}
                  <Legend wrapperStyle={{ fontSize: "12px", color: "oklch(0.60 0.01 240)" }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { fighter: fighter1Data, color: "text-orange-400", label: lockedFighter.name },
              ...(fighter2 && fighter2Data ? [{ fighter: fighter2Data, color: "text-teal-400", label: fighter2.name }] : []),
            ].map((item) => (
              <Card key={item.label} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm font-semibold ${item.color}`}>{item.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Taxa de Vitória", value: (item.fighter?.winRate ?? 0) * 100 },
                    { label: "Taxa de Finalização", value: (item.fighter?.finishRate ?? 0) * 100 },
                    { label: "Sub Win Rate", value: (item.fighter?.submissionWinRate ?? 0) * 100 },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                        <span className={`text-xs font-bold ${item.color}`}>{stat.value.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(stat.value, 100)}%`, backgroundColor: item.color.includes("orange") ? "#f97316" : "#2dd4bf" }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Prediction ─────────────────────────────── */}
        <TabsContent value="predicao" className="space-y-4 mt-4">
          {/* Locked fighter card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">Atleta Principal (bloqueado)</p>
                  <p className="font-bold text-foreground">{lockedFighter.name}</p>
                  <p className="text-xs text-muted-foreground">{lockedFighter.weightClass} • {lockedFighter.wins}W-{lockedFighter.losses}L</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opponent selector */}
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Oponente{" "}
                  <span className="text-xs text-muted-foreground">
                    (apenas atletas da mesma divisão: {lockedFighter.weightClass})
                  </span>
                </p>
                <FighterSelect
                  value={predOpponent}
                  onChange={(f) => { setPredOpponent(f); setPredResult(null); }}
                  placeholder={
                    sameWeightFighters.length > 0
                      ? `Buscar em ${lockedFighter.weightClass}...`
                      : "Sem atletas na mesma divisão"
                  }
                  accentClass="border-orange-500/40"
                  fighters={sameWeightFighters}
                />
              </div>
              <Button
                onClick={() => {
                  if (!predOpponent) { toast.error("Selecione um oponente."); return; }
                  predictMutation.mutate({
                    fighter1Id: lockedFighter.id,
                    fighter2Id: predOpponent.id,
                    fighter1Name: lockedFighter.name,
                    fighter2Name: predOpponent.name,
                  });
                }}
                disabled={!predOpponent || predictMutation.isPending}
                className="bg-orange-500 hover:bg-orange-500/90 text-black font-bold"
              >
                {predictMutation.isPending
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Calculando...</>
                  : <><Swords className="h-4 w-4 mr-2" />Calcular Predição</>}
              </Button>
            </CardContent>
          </Card>

          {/* Prediction result */}
          {predResult && predOpponent && (
            <div className="space-y-4">
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Vencedor Previsto</p>
                      <h2 className="text-3xl font-black text-primary">{predResult.predictedWinner}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm font-semibold ${getConfidenceLabel(predResult.confidence).color}`}>
                          {getConfidenceLabel(predResult.confidence).label}
                        </span>
                        <span className="text-sm text-muted-foreground">({(predResult.confidence * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-2xl font-black text-amber-400">{(predResult.fighter1WinProbability * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{lockedFighter.name.split(" ")[0]}</p>
                      </div>
                      <div className="text-muted-foreground font-bold text-xl self-center">vs</div>
                      <div>
                        <p className="text-2xl font-black text-teal-400">{(predResult.fighter2WinProbability * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{predOpponent.name.split(" ")[0]}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Probabilidades de Vitória</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-amber-400">{lockedFighter.name}</span>
                      <span className="text-sm font-bold text-amber-400">{(predResult.fighter1WinProbability * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={predResult.fighter1WinProbability * 100} className="h-3 [&>div]:bg-amber-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-teal-400">{predOpponent.name}</span>
                      <span className="text-sm font-bold text-teal-400">{(predResult.fighter2WinProbability * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={predResult.fighter2WinProbability * 100} className="h-3 [&>div]:bg-teal-500" />
                  </div>
                </CardContent>
              </Card>

              {predResult.keyFactors && predResult.keyFactors.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />Fatores Determinantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {predResult.keyFactors.map((factor, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{factor}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  As predições são baseadas em análise estatística e não constituem conselho de apostas.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
