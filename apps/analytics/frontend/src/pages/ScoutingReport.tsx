import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { usePredictMutation } from "@/lib/predict";
import { useSearch, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Button } from "@rft/shared/ui/button";
import { Input } from "@rft/shared/ui/input";
import { Label } from "@rft/shared/ui/label";
import { Badge } from "@rft/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rft/shared/ui/tabs";
import {
  FileText, Shield, Users, Briefcase, ChevronRight, RefreshCw, Lock,
  Search, ArrowLeft, Calendar, User, ChevronDown, ChevronUp, Activity,
  Swords, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background:   "oklch(0.16 0.01 240)",
    border:       "1px solid oklch(0.25 0.01 240)",
    borderRadius: "8px",
    color:        "oklch(0.95 0.01 240)",
    fontSize:     "12px",
  },
};

function buildFighterRadar(f: any) {
  return {
    "Win Rate":    Math.round((f?.winRate ?? 0.5) * 100),
    "Finalização": Math.round((f?.finishRate ?? 0.5) * 100),
    "Experiência": Math.round(Math.min((f?.totalFightsPro ?? 10) / 35 * 100, 100)),
    "Sequência":   Math.round(Math.min(((f?.currentStreakCount ?? 0) / 8) * 100, 100)),
    "KO Rate":     Math.round(f?.wins ? Math.min(((f?.koTkoWins ?? 0) / f.wins) * 100, 100) : 0),
    "Sub Rate":    Math.round((f?.submissionWinRate ?? 0) * 100),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Fighter = {
  id: number;
  name: string;
  nickname?: string | null;
  weightClass?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  heightCm?: number | null;
  reachCm?: number | null;
  stance?: string | null;
  nationality?: string | null;
  primaryTeam?: string | null;
  koTkoWins?: number | null;
  submissionWins?: number | null;
  decisionWins?: number | null;
  winRate?: number | null;
};

// ─── Autocomplete ─────────────────────────────────────────────────────────────

function FighterAutocomplete({
  value,
  onChange,
  placeholder,
  fighters,
  disabled,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  fighters: Fighter[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () =>
      value.trim().length === 0
        ? fighters.slice(0, 15)
        : fighters
            .filter((f) => {
              const q = value.toLowerCase();
              return (
                f.name.toLowerCase().includes(q) ||
                (f.nickname ?? "").toLowerCase().includes(q)
              );
            })
            .slice(0, 12),
    [fighters, value]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9 bg-input border-border text-foreground"
          autoComplete="off"
        />
      </div>
      {open && suggestions.length > 0 && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {suggestions.map((f) => (
            <button
              key={f.id}
              onMouseDown={() => { onChange(f.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-sm text-foreground font-medium">{f.name}</span>
                {f.nickname && <span className="text-xs text-muted-foreground ml-1.5">"{f.nickname}"</span>}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-muted-foreground">{f.weightClass}</span>
                {f.wins != null && (
                  <span className="text-xs text-muted-foreground ml-2">{f.wins}W-{f.losses}L</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comparison Panel ─────────────────────────────────────────────────────────

function ComparisonPanel({
  fighter,
  opponent,
  fighterRankEntry,
  opponentRankEntry,
}: {
  fighter: any;
  opponent: any | null;
  fighterRankEntry: any | null;
  opponentRankEntry: any | null;
}) {
  // Returns true only when a value is meaningfully populated (non-null, non-empty, non-zero for strings)
  function pop(v: any): boolean {
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return true;
  }

  function fmtTime(s: number | null | undefined): string {
    if (!s) return "";
    return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  }

  function fmtStreak(streak: string | null | undefined, n: number | null | undefined): string {
    if (!streak || !n) return "";
    if (streak === "W") return `${n}V`;
    if (streak === "L") return `${n}D`;
    return "";
  }

  function fmtPct(v: number | null | undefined): string {
    if (v == null) return "";
    return `${Math.round(v * 100)}%`;
  }

  function rankStr(f: any, rankEntry: any | null): string {
    if (f?.isInterim === 1 || rankEntry?.isInterim === 1) return "Interino";
    if (f?.isChampion === 1 || rankEntry?.isChampion === 1) return "Campeão";
    if (rankEntry?.rank != null) return `#${rankEntry.rank}`;
    return "";
  }

  // Row component — only called when both values are already confirmed populated
  function Row({ label, fVal, oVal, fNum, oNum }: {
    label: string; fVal: string; oVal: string; fNum?: number; oNum?: number;
  }) {
    const hasBar = fNum != null && oNum != null;
    const total = (fNum ?? 0) + (oNum ?? 0);
    const pct = hasBar && total > 0 ? Math.round(((fNum ?? 0) / total) * 100) : 50;
    return (
      <div className="py-2 border-b border-border/20 last:border-0 space-y-1">
        <div className="grid grid-cols-3 items-center">
          <div className="text-sm font-bold text-primary text-right pr-4">{fVal}</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">{label}</div>
          <div className="text-sm font-bold text-orange-400 text-left pl-4">{oVal}</div>
        </div>
        {hasBar && total > 0 && (
          <div className="flex h-1 rounded-full overflow-hidden mx-1 bg-muted/20">
            <div className="bg-primary transition-all" style={{ width: `${pct}%` }} />
            <div className="bg-orange-500 transition-all" style={{ width: `${100 - pct}%` }} />
          </div>
        )}
      </div>
    );
  }

  // Build filtered row lists — only keep rows where BOTH sides are populated
  const fH = fighter?.heightCm, oH = opponent?.heightCm;
  const fR = fighter?.reachCm,  oR = opponent?.reachCm;
  const fW = fighter?.weightKg, oW = opponent?.weightKg;
  const fS = fighter?.stance,   oSt = opponent?.stance;

  const physRows = [
    pop(fH) && pop(oH) ? { label: "Altura",      fVal: `${fH} cm`, oVal: `${oH} cm` } : null,
    pop(fR) && pop(oR) ? { label: "Envergadura",  fVal: `${fR} cm`, oVal: `${oR} cm` } : null,
    pop(fW) && pop(oW) ? { label: "Peso",         fVal: `${fW} kg`, oVal: `${oW} kg` } : null,
    pop(fS) && pop(oSt) ? { label: "Postura",     fVal: fS,         oVal: oSt }        : null,
  ].filter(Boolean) as { label: string; fVal: string; oVal: string }[];

  const fWR  = fmtPct(fighter?.winRate),           oWR  = fmtPct(opponent?.winRate);
  const fFR  = fmtPct(fighter?.finishRate),        oFR  = fmtPct(opponent?.finishRate);
  const fSWR = fmtPct(fighter?.submissionWinRate), oSWR = fmtPct(opponent?.submissionWinRate);
  const fKO  = fighter?.koTkoWins,                 oKO  = opponent?.koTkoWins;
  const fSUB = fighter?.submissionWins,            oSUB = opponent?.submissionWins;
  const fDEC = fighter?.decisionWins,              oDEC = opponent?.decisionWins;
  const fAFT = fmtTime(fighter?.avgFightTimeSeconds), oAFT = fmtTime(opponent?.avgFightTimeSeconds);
  const fSTR = fmtStreak(fighter?.currentStreak, fighter?.currentStreakCount);
  const oSTR = fmtStreak(opponent?.currentStreak, opponent?.currentStreakCount);
  const fRNK = rankStr(fighter, fighterRankEntry),  oRNK = rankStr(opponent, opponentRankEntry);

  const statRows = [
    pop(fWR)  && pop(oWR)  ? { label: "Win Rate",    fVal: fWR,         oVal: oWR,         fNum: fighter?.winRate,           oNum: opponent?.winRate }           : null,
    pop(fFR)  && pop(oFR)  ? { label: "Finish Rate", fVal: fFR,         oVal: oFR,         fNum: fighter?.finishRate,        oNum: opponent?.finishRate }        : null,
    pop(fSWR) && pop(oSWR) ? { label: "Sub Win %",   fVal: fSWR,        oVal: oSWR,        fNum: fighter?.submissionWinRate, oNum: opponent?.submissionWinRate } : null,
    pop(fKO)  && pop(oKO)  ? { label: "KO/TKO",      fVal: String(fKO), oVal: String(oKO), fNum: fKO,                        oNum: oKO }                         : null,
    pop(fSUB) && pop(oSUB) ? { label: "Submissões",  fVal: String(fSUB),oVal: String(oSUB),fNum: fSUB,                       oNum: oSUB }                        : null,
    pop(fDEC) && pop(oDEC) ? { label: "Decisões",    fVal: String(fDEC),oVal: String(oDEC),fNum: fDEC,                       oNum: oDEC }                        : null,
    pop(fAFT) && pop(oAFT) ? { label: "Tempo Médio", fVal: fAFT,        oVal: oAFT }                                                                              : null,
    pop(fSTR) && pop(oSTR) ? { label: "Sequência",   fVal: fSTR,        oVal: oSTR }                                                                              : null,
    pop(fRNK) && pop(oRNK) ? { label: "Ranking",     fVal: fRNK,        oVal: oRNK }                                                                              : null,
  ].filter(Boolean) as { label: string; fVal: string; oVal: string; fNum?: number; oNum?: number }[];

  // Strengths/weaknesses — only show the pair when BOTH have data
  const strengths  = (fighter  as any)?.strengths  as string[] | null;
  const weaknesses = (fighter  as any)?.weaknesses as string[] | null;
  const oStrengths  = (opponent as any)?.strengths  as string[] | null;
  const oWeaknesses = (opponent as any)?.weaknesses as string[] | null;
  const showStrengths  = strengths?.length  && oStrengths?.length;
  const showWeaknesses = weaknesses?.length && oWeaknesses?.length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Swords className="h-4 w-4" /> Comparação de Atletas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Names + record header */}
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-center space-y-0.5">
            <p className="font-black text-sm text-primary leading-tight">{fighter?.name ?? "—"}</p>
            <p className="text-xs font-semibold">
              <span className="text-green-400">{fighter?.wins ?? 0}</span>
              <span className="text-muted-foreground/50">-</span>
              <span className="text-red-400">{fighter?.losses ?? 0}</span>
            </p>
            {fighter?.weightClass && <p className="text-[10px] text-muted-foreground">{fighter.weightClass}</p>}
          </div>
          <div className="flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-border/60 flex items-center justify-center">
              <span className="text-[11px] font-black text-muted-foreground">VS</span>
            </div>
          </div>
          <div className="text-center space-y-0.5">
            <p className="font-black text-sm text-orange-400 leading-tight">{opponent?.name ?? "—"}</p>
            <p className="text-xs font-semibold">
              <span className="text-green-400">{opponent?.wins ?? 0}</span>
              <span className="text-muted-foreground/50">-</span>
              <span className="text-red-400">{opponent?.losses ?? 0}</span>
            </p>
            {opponent?.weightClass && <p className="text-[10px] text-muted-foreground">{opponent.weightClass}</p>}
          </div>
        </div>

        {/* Physical profile — only shown rows */}
        {physRows.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Perfil Físico</p>
            {physRows.map((r) => <Row key={r.label} {...r} />)}
          </div>
        )}

        {/* Combat stats — only shown rows */}
        {statRows.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Estatísticas de Combate</p>
            {statRows.map((r) => <Row key={r.label} {...r} />)}
          </div>
        )}

        {/* Strengths & weaknesses — only when BOTH sides have data */}
        {(showStrengths || showWeaknesses) && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2">Forças e Fraquezas</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Fighter side */}
              <div className="space-y-2">
                {showStrengths && (
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest mb-1.5">Forças</p>
                    <div className="space-y-1">
                      {strengths!.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/90 leading-tight">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {showWeaknesses && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Fraquezas</p>
                    <div className="space-y-1">
                      {weaknesses!.slice(0, 4).map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/90 leading-tight">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Opponent side */}
              <div className="space-y-2">
                {showStrengths && (
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Forças</p>
                    <div className="space-y-1">
                      {oStrengths!.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-orange-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/90 leading-tight">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {showWeaknesses && (
                  <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest mb-1.5">Fraquezas</p>
                    <div className="space-y-1">
                      {oWeaknesses!.slice(0, 4).map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/90 leading-tight">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

// ─── Fight history sub-components ────────────────────────────────────────────

function StatBar({ label, f1, f2 }: { label: string; f1: number | null | undefined; f2: number | null | undefined }) {
  const v1 = f1 ?? 0; const v2 = f2 ?? 0; const total = v1 + v2;
  const pct1 = total > 0 ? Math.round((v1 / total) * 100) : 50;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{v1}</span>
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
        <span className="font-medium text-foreground">{v2}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/30">
        <div className="bg-primary transition-all" style={{ width: `${pct1}%` }} />
        <div className="bg-orange-500 transition-all" style={{ width: `${100 - pct1}%` }} />
      </div>
    </div>
  );
}

function FightStatsPanel({ stat, fighterName, opponentName }: { stat: any; fighterName: string; opponentName: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        <span className="text-primary">{fighterName.split(" ")[0]}</span>
        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Estatísticas</span>
        <span className="text-orange-400">{opponentName.split(" ")[0]}</span>
      </div>
      <StatBar label="Golpes Sig."   f1={stat.f1SigStrikesLanded}   f2={stat.f2SigStrikesLanded} />
      <StatBar label="Golpes Totais" f1={stat.f1TotalStrikesLanded} f2={stat.f2TotalStrikesLanded} />
      <StatBar label="Takedowns"     f1={stat.f1TakedownsLanded}    f2={stat.f2TakedownsLanded} />
      <StatBar label="Ctrl. (seg)"   f1={stat.f1ControlTimeSeconds} f2={stat.f2ControlTimeSeconds} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScoutingReport() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const urlFighterId = params.get("fighterId") ? parseInt(params.get("fighterId")!) : null;

  const [selectedFighterId, setSelectedFighterId] = useState<number>(urlFighterId ?? 1);
  const [opponentName, setOpponentName] = useState("");
  const [activeReport, setActiveReport] = useState<any>(null);
  const [activeType, setActiveType] = useState<"full" | "managerial" | "coach">("full");
  const [expandedStats, setExpandedStats] = useState<Set<number>>(new Set());

  const { data: allFighters = [] } = staticTrpc.fighters.listAlpha.useQuery();
  const { data: fighter } = staticTrpc.fighters.getById.useQuery({ id: selectedFighterId });
  const { data: fights, isLoading: fightsLoading } = staticTrpc.fights.byFighter.useQuery({ fighterId: selectedFighterId });

  const fightIds = fights?.map((f) => f.id) ?? [];
  const { data: statsRaw } = staticTrpc.fights.stats.useQuery({ fightIds }, { enabled: fightIds.length > 0 });
  const statsMap = new Map((statsRaw ?? []).map((s: any) => [s.fightId, s]));

  // Filter opponents to same weight class only
  const sameClassFighters = useMemo(() =>
    allFighters.filter(
      (f: any) => f.weightClass === fighter?.weightClass && f.id !== selectedFighterId
    ),
    [allFighters, fighter?.weightClass, selectedFighterId]
  );

  const isPreSelected = !!urlFighterId;
  const noSameClass = fighter?.weightClass && sameClassFighters.length === 0;

  // Find opponent by exact name match from allFighters (includes all DB fields)
  const opponentFighterBasic = useMemo(
    () => allFighters.find((f: any) => f.name.toLowerCase() === opponentName.toLowerCase().trim()) ?? null,
    [allFighters, opponentName]
  );

  // Rankings to derive rank positions
  const rankingsOrg = (fighter as any)?.sourceOrg ?? "UFC";
  const { data: rankingsData = [] } = staticTrpc.fighters.rankings.useQuery({ org: rankingsOrg });

  const fighterRankEntry = useMemo(() => {
    if (!(rankingsData as any[]).length || !fighter?.weightClass) return null;
    const wc = (rankingsData as any[]).find((r: any) => r.weightClass === fighter.weightClass);
    return wc?.fighters.find((f: any) => f.name === fighter.name) ?? null;
  }, [rankingsData, fighter]);

  const opponentRankEntry = useMemo(() => {
    if (!(rankingsData as any[]).length || !opponentFighterBasic?.weightClass) return null;
    const wc = (rankingsData as any[]).find((r: any) => r.weightClass === opponentFighterBasic.weightClass);
    return wc?.fighters.find((f: any) => f.name === opponentFighterBasic.name) ?? null;
  }, [rankingsData, opponentFighterBasic]);

  const generateMutation = trpc.scouting.generate.useMutation({
    onSuccess: (data) => { setActiveReport(data.reportData); toast.success("Relatório gerado!"); },
    onError: () => { toast.error("Erro ao gerar relatório."); },
  });

  const handleGenerate = (type: "full" | "managerial" | "coach") => {
    if (!opponentName.trim()) { toast.error("Informe o adversário."); return; }
    setActiveType(type);
    generateMutation.mutate({ fighterId: selectedFighterId, opponentName, reportType: type });
  };

  const getResultBadge = (result: string | null) => {
    if (result === "win")  return <span className="badge-win">VITÓRIA</span>;
    if (result === "loss") return <span className="badge-loss">DERROTA</span>;
    return <span className="badge-draw">EMPATE</span>;
  };

  const getMethodColor = (method: string | null) => {
    if (method === "SUBMISSION" || method === "KO_TKO") return "text-orange-400";
    if (method === "DECISION") return "text-teal-400";
    return "text-muted-foreground";
  };

  const methodData = fights
    ? Object.entries(
        fights.reduce((acc, f) => {
          const m = f.methodCategory || "OTHER";
          acc[m] = (acc[m] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name: name.replace("_", "/"), value }))
    : [];

  const reportTypes = [
    {
      type: "full" as const,
      label: "Relatório Inicial",
      icon: FileText,
      description: "Comparações estatísticas e físicas, recordes, forças/fraquezas, vitórias por KO/Sub/Decisão e prévia da luta.",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      type: "managerial" as const,
      label: "Relatório de Preparação",
      icon: Briefcase,
      description: "Estatísticas descritivas + radar comparativo + tempo médio de luta + probabilidade de vitória (modelo XGBoost).",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      type: "coach" as const,
      label: "Relatório para a Luta",
      icon: Users,
      description: "Plano round-by-round e instruções táticas a partir das análises anteriores.",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-primary to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          {isPreSelected && (
            <Button variant="ghost" size="icon" onClick={() => history.back()}
              className="shrink-0 hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-black text-foreground">{fighter?.name ?? "Scouting"}</h1>
            {fighter && (
              <p className="text-xs text-muted-foreground">
                {fighter.wins}W-{fighter.losses}L-{fighter.draws}D
                {fighter.weightClass && ` • ${fighter.weightClass}`}
                {fighter.nationality && ` • ${fighter.nationality}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue={isPreSelected ? "scouting" : "historico"} className="w-full">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-xl">
          <TabsTrigger
            value="historico"
            onClick={(e) => {
              if (isPreSelected) {
                e.preventDefault();
                setLocation(`/fighter/${selectedFighterId}?tab=historico`);
              }
            }}
            className="rounded-lg text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <Swords className="h-3.5 w-3.5 mr-1.5" />Histórico
          </TabsTrigger>
          <TabsTrigger
            value="atleta"
            onClick={(e) => {
              if (isPreSelected) {
                e.preventDefault();
                setLocation(`/fighter/${selectedFighterId}?tab=atleta`);
              }
            }}
            className="rounded-lg text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <User className="h-3.5 w-3.5 mr-1.5" />Atleta
          </TabsTrigger>
          <TabsTrigger value="scouting" className="rounded-lg text-sm data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">
            <Shield className="h-3.5 w-3.5 mr-1.5" />Scouting
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-5 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total de Lutas",  value: fights?.length || 0,                                                           color: "text-foreground" },
              { label: "Vitórias",        value: fights?.filter((f) => f.result === "win").length || 0,                         color: "text-green-400" },
              { label: "Derrotas",        value: fights?.filter((f) => f.result === "loss").length || 0,                        color: "text-red-400" },
              { label: "Finalizações",    value: fights?.filter((f) => f.result === "win" && f.methodCategory !== "DECISION").length || 0, color: "text-orange-400" },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Method chart */}
          {methodData.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Distribuição por Método</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={methodData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 240)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ background: "oklch(0.16 0.01 240)", border: "1px solid oklch(0.25 0.01 240)", borderRadius: "8px", color: "oklch(0.95 0.01 240)" }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {methodData.map((entry, i) => (
                        <Cell key={i} fill={entry.name.includes("SUBMISSION") || entry.name.includes("KO") ? "#f97316" : "#2dd4bf"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Fight list */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Todas as Lutas ({fights?.length || 0})
            </h2>
            {fightsLoading ? (
              <div className="text-muted-foreground animate-pulse py-8 text-center text-sm">Carregando lutas...</div>
            ) : (
              <div className="space-y-2">
                {fights?.map((fight) => {
                  const stat = statsMap.get(fight.id);
                  const isExpanded = expandedStats.has(fight.id);
                  return (
                    <Card key={fight.id} className="border-border bg-card hover:border-border/80 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 text-center shrink-0">{getResultBadge(fight.result)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <p className="font-semibold text-foreground truncate">{fight.opponent}</p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{fight.event}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-medium ${getMethodColor(fight.methodCategory)}`}>{fight.methodDetail}</p>
                            <p className="text-xs text-muted-foreground">R{fight.round} • {fight.timeInRound}</p>
                          </div>
                          <div className="text-right shrink-0 hidden md:block">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />{fight.fightDate}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{fight.promotion}</p>
                          </div>
                          {stat && (
                            <button className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => {
                                const next = new Set(expandedStats);
                                if (isExpanded) next.delete(fight.id); else next.add(fight.id);
                                setExpandedStats(next);
                              }}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        {stat && isExpanded && (
                          <FightStatsPanel stat={stat} fighterName={fighter?.name ?? "Atleta"} opponentName={fight.opponent} />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB: Atleta ─────────────────────────────────────────────────── */}
        <TabsContent value="atleta" className="mt-5 space-y-5">
          {fighter ? (
            <>
              {/* Physical profile */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Perfil Físico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Altura",      value: fighter.heightCm ? `${fighter.heightCm} cm` : "—" },
                      { label: "Envergadura", value: fighter.reachCm  ? `${fighter.reachCm} cm`  : "—" },
                      { label: "Postura",     value: fighter.stance   ?? "—" },
                      { label: "Equipe",      value: fighter.primaryTeam ?? "—" },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-secondary border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                        <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Combat stats */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Estatísticas de Combate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Win Rate",       value: fighter.winRate != null ? `${Math.round(fighter.winRate * 100)}%` : "—",          color: "text-green-400" },
                      { label: "KO/TKO",         value: fighter.koTkoWins ?? 0,                                                            color: "text-red-400" },
                      { label: "Finalizações",   value: fighter.submissionWins ?? 0,                                                        color: "text-orange-400" },
                      { label: "Decisões",       value: fighter.decisionWins ?? 0,                                                          color: "text-teal-400" },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-secondary border border-border text-center">
                        <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Style info if available */}
              {((fighter as any).styleArchetype || (fighter as any).strengths || (fighter as any).weaknesses) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(fighter as any).strengths && (
                    <Card className="border-border bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-green-400">Pontos Fortes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {((fighter as any).strengths as string[]).map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ChevronRight className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground">{s}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {(fighter as any).weaknesses && (
                    <Card className="border-border bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-400">Vulnerabilidades</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {((fighter as any).weaknesses as string[]).map((w, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ChevronRight className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground">{w}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-center py-12 text-sm">Carregando perfil...</div>
          )}
        </TabsContent>

        {/* ── TAB: Scouting ───────────────────────────────────────────────── */}
        <TabsContent value="scouting" className="mt-5 space-y-5">

          {/* Weight class warning */}
          {noSameClass && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Não há outros atletas cadastrados na mesma categoria ({fighter?.weightClass}). O adversário pode ser de qualquer divisão.
            </div>
          )}

          {/* Config card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Configuração do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Locked athlete */}
              <div className="space-y-2">
                <Label className="text-sm text-foreground flex items-center gap-1.5">
                  Atleta Analisado
                  {isPreSelected && <Lock className="h-3 w-3 text-primary" />}
                </Label>
                {isPreSelected ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-primary">
                        {fighter?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{fighter?.name ?? "Carregando..."}</p>
                      <p className="text-xs text-muted-foreground">
                        {fighter ? `${fighter.wins}W-${fighter.losses}L` : ""}
                        {fighter?.weightClass && ` • ${fighter.weightClass}`}
                      </p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs shrink-0">
                      Selecionado
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {allFighters.map((f: any) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFighterId(f.id)}
                        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                          selectedFighterId === f.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Opponent — same weight class */}
              <div className="space-y-2">
                <Label className="text-sm text-foreground flex items-center gap-2">
                  Adversário
                  {fighter?.weightClass && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 py-0 px-1.5">
                      {fighter.weightClass} apenas
                    </Badge>
                  )}
                </Label>
                <FighterAutocomplete
                  value={opponentName}
                  onChange={setOpponentName}
                  placeholder={
                    noSameClass
                      ? "Buscar adversário (qualquer divisão)..."
                      : `Buscar em ${fighter?.weightClass ?? "mesma categoria"}...`
                  }
                  fighters={noSameClass ? (allFighters as Fighter[]) : sameClassFighters}
                />
              </div>

              {/* Report type buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {reportTypes.map((rt) => (
                  <Card key={rt.type} className="border-border bg-secondary">
                    <CardContent className="p-4">
                      <div className={`inline-flex p-2 rounded-lg ${rt.bg} mb-3`}>
                        <rt.icon className={`h-5 w-5 ${rt.color}`} />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{rt.label}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{rt.description}</p>
                      <Button
                        onClick={() => handleGenerate(rt.type)}
                        disabled={generateMutation.isPending || !opponentName.trim()}
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-xs"
                      >
                        {generateMutation.isPending && activeType === rt.type && (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        )}
                        Gerar Relatório
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Report output */}
          {activeReport && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {activeType === "full" ? "Relatório Inicial" : activeType === "managerial" ? "Relatório de Preparação" : "Relatório para a Luta"}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {activeReport.fighter?.name || "Atleta"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {activeType === "full"       && (
                  <FullReport
                    data={activeReport}
                    fighter={fighter}
                    opponent={opponentFighterBasic}
                    fighterRankEntry={fighterRankEntry}
                    opponentRankEntry={opponentRankEntry}
                  />
                )}
                {activeType === "managerial" && <ManagerialReport data={activeReport} fighter={fighter} opponent={opponentFighterBasic} />}
                {activeType === "coach"      && <CoachReport data={activeReport} />}
              </CardContent>
            </Card>
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Report sub-components ───────────────────────────────────────────────────

/** Banner que aparece no topo de TODO relatório com o CTA para análise personalizada. */
function PersonalizedAnalysisCTA() {
  return (
    <div
      className="relative overflow-hidden mb-6 p-5 border border-yellow-400/40 rounded-md"
      style={{
        background: "linear-gradient(135deg, #1a1500 0%, #000 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, transparent, transparent 12px, #FFD700 12px, #FFD700 13px)",
        }}
      />
      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div className="flex-1">
          <p className="font-heading text-xs uppercase tracking-[0.3em] text-yellow-400 mb-1">
            Análise Personalizada
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            Para uma análise personalizada — incluindo todas as métricas de scouting, preparação de camp e estratégia completa — entre em contato:
          </p>
        </div>
        <a
          href="mailto:scouting@rft.com.br"
          className="shrink-0 inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-heading font-bold text-xs uppercase tracking-widest px-5 py-3 transition-all"
        >
          scouting@rft.com.br
        </a>
      </div>
    </div>
  );
}

function FullReport({
  data,
  fighter,
  opponent,
  fighterRankEntry,
  opponentRankEntry,
}: {
  data: any;
  fighter?: any;
  opponent?: any | null;
  fighterRankEntry?: any;
  opponentRankEntry?: any;
}) {
  return (
    <div className="space-y-6">
      <PersonalizedAnalysisCTA />

      {/* Comparação lado a lado — exclusiva do Relatório Inicial */}
      {fighter && opponent && (
        <ComparisonPanel
          fighter={fighter}
          opponent={opponent}
          fighterRankEntry={fighterRankEntry}
          opponentRankEntry={opponentRankEntry}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.strengths && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Forças</h3>
            {data.strengths.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <ChevronRight className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{s}</p>
              </div>
            ))}
          </div>
        )}
        {data.weaknesses && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Vulnerabilidades</h3>
            {data.weaknesses.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <ChevronRight className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{w}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ManagerialReport({ data, fighter, opponent }: { data: any; fighter: any; opponent: any | null }) {
  const statusColor = (s: string) =>
    s === "green" ? "text-green-400" : s === "yellow" ? "text-yellow-400" : "text-red-400";

  function fmtPct(v: number | null | undefined) {
    return v != null ? `${Math.round(v * 100)}%` : "—";
  }
  function fmtStreak(streak: string | null | undefined, n: number | null | undefined) {
    if (!streak || !n) return "—";
    return streak === "W" ? `${n}V` : streak === "L" ? `${n}D` : "—";
  }

  // Side-by-side summary rows
  const summaryRows = [
    { label: "Record",       fVal: fighter ? `${fighter.wins}W-${fighter.losses}L-${fighter.draws ?? 0}D` : data.executiveSummary?.record ?? "—",
                             oVal: opponent ? `${opponent.wins}W-${opponent.losses}L-${opponent.draws ?? 0}D` : "—" },
    { label: "Win Rate",     fVal: fmtPct(fighter?.winRate   ?? null), oVal: fmtPct(opponent?.winRate ?? null) },
    { label: "Finish Rate",  fVal: fmtPct(fighter?.finishRate ?? null), oVal: fmtPct(opponent?.finishRate ?? null) },
    { label: "Sequência",    fVal: fmtStreak(fighter?.currentStreak, fighter?.currentStreakCount), oVal: fmtStreak(opponent?.currentStreak, opponent?.currentStreakCount) },
    { label: "Estilo",       fVal: (fighter as any)?.styleArchetype ?? data.executiveSummary?.styleProfile ?? "—",
                             oVal: (opponent as any)?.styleArchetype ?? "—" },
  ];

  // Side-by-side KPI rows
  const kpiRows = [
    {
      metric: "Taxa de Vitória", benchmark: "70%+",
      fVal: fmtPct(fighter?.winRate ?? null), fStatus: (fighter?.winRate ?? 0) >= 0.7 ? "green" : "yellow",
      oVal: fmtPct(opponent?.winRate ?? null), oStatus: opponent ? ((opponent.winRate ?? 0) >= 0.7 ? "green" : "yellow") : null,
    },
    {
      metric: "Taxa de Finalização", benchmark: "50%+",
      fVal: fmtPct(fighter?.finishRate ?? null), fStatus: (fighter?.finishRate ?? 0) >= 0.5 ? "green" : "yellow",
      oVal: fmtPct(opponent?.finishRate ?? null), oStatus: opponent ? ((opponent.finishRate ?? 0) >= 0.5 ? "green" : "yellow") : null,
    },
    {
      metric: "Experiência (lutas)", benchmark: "20+",
      fVal: fighter?.totalFightsPro != null ? String(fighter.totalFightsPro) : (data.executiveSummary ? `${data.executiveSummary.record?.split("W")[0] ?? "?"}` : "—"),
      fStatus: (fighter?.totalFightsPro ?? 0) >= 20 ? "green" : "yellow",
      oVal: opponent?.totalFightsPro != null ? String(opponent.totalFightsPro) : "—",
      oStatus: opponent ? ((opponent.totalFightsPro ?? 0) >= 20 ? "green" : "yellow") : null,
    },
  ];

  const opponentName = data.fighter ? (data as any).vsOpponent?.opponent ?? "Adversário" : "Adversário";

  return (
    <div className="space-y-6">
      <PersonalizedAnalysisCTA />

      {/* Radar Comparativo (sobreposto) */}
      <RadarOverlayPanel fighter={fighter} opponent={opponent} />

      {/* Probabilidade de vitória + tempo médio (XGBoost) */}
      <PreparationStatsPanel fighter={fighter} opponent={opponent} />

      {/* Executive summary — side by side */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resumo Executivo</h3>
        {/* Header row */}
        <div className="grid grid-cols-3 items-center mb-2">
          <div className="text-xs font-bold text-primary text-right pr-4 truncate">
            {fighter?.name?.split(" ").slice(-1)[0] ?? "Atleta"}
          </div>
          <div />
          <div className="text-xs font-bold text-orange-400 text-left pl-4 truncate">
            {opponent?.name?.split(" ").slice(-1)[0] ?? opponentName}
          </div>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          {summaryRows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 items-center py-2.5 px-1 ${i !== summaryRows.length - 1 ? "border-b border-border/40" : ""}`}>
              <div className="text-sm font-semibold text-primary text-right pr-4 truncate">{row.fVal}</div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">{row.label}</div>
              <div className="text-sm font-semibold text-orange-400 text-left pl-4 truncate">{row.oVal}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs — side by side */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">KPIs de Performance</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-4 items-center py-2 px-3 bg-secondary/60 border-b border-border/40">
            <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Métrica</div>
            <div className="text-[10px] font-bold text-primary text-center uppercase tracking-wider">
              {fighter?.name?.split(" ").slice(-1)[0] ?? "Atleta"}
            </div>
            <div className="text-[10px] font-bold text-orange-400 text-center uppercase tracking-wider">
              {opponent?.name?.split(" ").slice(-1)[0] ?? "Adversário"}
            </div>
            <div className="text-[10px] font-bold text-muted-foreground/60 text-right uppercase tracking-wider">Benchmark</div>
          </div>
          {kpiRows.map((kpi, i) => (
            <div key={i} className={`grid grid-cols-4 items-center py-3 px-3 ${i !== kpiRows.length - 1 ? "border-b border-border/30" : ""}`}>
              <div className="text-sm text-foreground">{kpi.metric}</div>
              <div className={`text-sm font-bold text-center ${statusColor(kpi.fStatus)}`}>{kpi.fVal}</div>
              <div className={`text-sm font-bold text-center ${kpi.oStatus ? statusColor(kpi.oStatus) : "text-muted-foreground/40"}`}>{kpi.oVal}</div>
              <div className="text-xs text-muted-foreground text-right">{kpi.benchmark}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic recommendations */}
      {data.strategicRecommendations && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recomendações Estratégicas</h3>
          {data.strategicRecommendations.map((rec: string, i: number) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{rec}</p>
            </div>
          ))}
          <div className="mt-4 p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/5">
            <p className="text-xs text-white/70 leading-relaxed">
              Para uma análise mais aprofundada e personalizada, incluindo scouting detalhado, preparação de camp e estratégia completa —{" "}
              <a href="mailto:scouting@rft.com.br" className="text-yellow-400 font-semibold hover:underline">
                entre em contato: scouting@rft.com.br
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Risk assessment */}
      {data.riskAssessment && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Avaliação de Risco</h3>
          <div className="p-4 rounded-lg bg-secondary border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-foreground capitalize">Nível: {data.riskAssessment.level}</span>
            </div>
            {data.riskAssessment.mainRisks?.map((risk: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">• {risk}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoachReport({ data }: { data: any }) {
  const tempoColor = (t: string) =>
    t === "high" ? "text-red-400" : t === "medium" ? "text-yellow-400" : "text-green-400";
  return (
    <div className="space-y-6">
      <PersonalizedAnalysisCTA />
      {data.coachSummary && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.coachSummary).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground capitalize">{key}</p>
                <p className="text-sm font-semibold text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.cornerCues && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cues de Corner</h3>
          <div className="flex flex-wrap gap-2">
            {data.cornerCues.map((cue: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-sm font-bold text-primary">{cue}</span>
            ))}
          </div>
        </div>
      )}
      {data.gameplan && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Gameplan</h3>
          <div className="p-4 rounded-lg bg-secondary border border-border mb-3">
            <p className="text-xs text-muted-foreground mb-1">Objetivo Principal</p>
            <p className="text-sm font-semibold text-foreground">{data.gameplan.primaryObjective}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-green-400 font-semibold uppercase mb-2">Condições de Vitória</p>
              {data.gameplan.winConditions?.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <ChevronRight className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{w}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-red-400 font-semibold uppercase mb-2">Evitar</p>
              {data.gameplan.avoidThese?.map((a: string, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <ChevronRight className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {data.roundByRound && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plano Round-by-Round</h3>
          <div className="space-y-2">
            {data.roundByRound.map((round: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary border border-border">
                <div className="w-12 text-center">
                  <p className="text-lg font-black text-primary">R{round.round}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{round.focus}</p>
                </div>
                <Badge variant="outline" className={`text-xs ${tempoColor(round.tempo)} border-current`}>
                  {round.tempo === "high" ? "Alta Intensidade" : round.tempo === "medium" ? "Média" : "Baixa"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Radar overlay para o Relatório de Preparação ────────────────────────────

function RadarOverlayPanel({ fighter, opponent }: { fighter: any; opponent: any | null }) {
  if (!fighter || !opponent) return null;
  const f1Radar = buildFighterRadar(fighter);
  const f2Radar = buildFighterRadar(opponent);
  const data = Object.keys(f1Radar).map((metric) => ({
    metric,
    [fighter.name]: (f1Radar as any)[metric],
    [opponent.name]: (f2Radar as any)[metric],
  }));
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Radar Comparativo</h3>
      <div className="rounded-xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="oklch(0.30 0.01 240)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.65 0.01 240)", fontSize: 11 }} />
            <Radar name={fighter.name} dataKey={fighter.name} stroke="#FFD700" fill="#FFD700" fillOpacity={0.35} strokeWidth={2} />
            <Radar name={opponent.name} dataKey={opponent.name} stroke="#FF3333" fill="#FF3333" fillOpacity={0.35} strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: 12, color: "oklch(0.85 0.01 240)" }} />
            <Tooltip {...TOOLTIP_STYLE} />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-white/40 mt-2 text-center">
          Métricas em escala 0–100. Sobreposição mostra forças relativas de cada atleta.
        </p>
      </div>
    </div>
  );
}

// ─── Estatísticas de preparação (probabilidade + tempo médio) ───────────────

function PreparationStatsPanel({ fighter, opponent }: { fighter: any; opponent: any | null }) {
  const predictMutation = usePredictMutation();
  const [pred, setPred] = useState<any>(null);

  useEffect(() => {
    if (fighter?.id && opponent?.id && !pred && !predictMutation.isPending) {
      predictMutation.mutate(
        {
          fighter1Id: fighter.id,
          fighter2Id: opponent.id,
          fighter1Name: fighter.name,
          fighter2Name: opponent.name,
        },
        { onSuccess: (data) => setPred(data) },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighter?.id, opponent?.id]);

  const fmtSec = (s: number | null | undefined) => {
    if (s == null || isNaN(s)) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")} min`;
  };
  const f1AvgTime = fighter?.avgFightTimeSeconds;
  const f2AvgTime = opponent?.avgFightTimeSeconds;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Probabilidade & Tempo de Luta</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border/40 border-b border-border/40">
          <div className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-yellow-400/70 mb-1">Tempo médio de luta</p>
            <p className="font-display text-2xl text-yellow-400 tracking-wider">{fmtSec(f1AvgTime)}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{fighter?.name}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-red-400/70 mb-1">Tempo médio de luta</p>
            <p className="font-display text-2xl text-red-400 tracking-wider">{fmtSec(f2AvgTime)}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{opponent?.name ?? "—"}</p>
          </div>
        </div>
        <div className="p-4">
          {predictMutation.isPending && <p className="text-sm text-white/50 text-center">Calculando predição com XGBoost…</p>}
          {predictMutation.isError && <p className="text-sm text-red-400 text-center">Falha ao calcular predição.</p>}
          {pred && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-yellow-400 font-bold w-32 truncate">{fighter?.name}</span>
                <div className="flex-1 h-3 bg-black/40 overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${(pred.fighter1WinProbability * 100).toFixed(1)}%` }} />
                </div>
                <span className="font-display text-base text-yellow-400 tracking-wider w-14 text-right">
                  {(pred.fighter1WinProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-400 font-bold w-32 truncate">{opponent?.name}</span>
                <div className="flex-1 h-3 bg-black/40 overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${(pred.fighter2WinProbability * 100).toFixed(1)}%` }} />
                </div>
                <span className="font-display text-base text-red-400 tracking-wider w-14 text-right">
                  {(pred.fighter2WinProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">KO/TKO</p>
                  <p className="text-sm font-bold text-orange-400">{((pred.probKoTko ?? 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Submissão</p>
                  <p className="text-sm font-bold text-orange-400">{((pred.probSubmission ?? 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Decisão</p>
                  <p className="text-sm font-bold text-teal-400">{((pred.probDecision ?? 0) * 100).toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-[10px] text-white/40 text-center mt-2">
                Predição via modelo XGBoost (AUC 0.82) — {pred.modelBreakdown?.[0]?.model ?? "ensemble"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
