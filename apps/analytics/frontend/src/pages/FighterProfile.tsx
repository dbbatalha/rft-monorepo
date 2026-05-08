import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { useParams, useLocation, useSearch } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Badge } from "@rft/shared/ui/badge";
import { Button } from "@rft/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rft/shared/ui/tabs";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ArrowLeft, User, TrendingUp, Shield, Zap, Target, Award,
  CheckCircle2, XCircle, Swords, AlertTriangle, Building2,
  Calendar, ChevronDown, ChevronUp, Activity, Crown,
} from "lucide-react";

// ── Fight-history helpers ────────────────────────────────────────────────────

function FightNotes({ notes }: { notes: unknown }) {
  if (!notes || !Array.isArray(notes) || notes.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      {notes.map((note, i) => (
        <p key={i} className="text-xs text-muted-foreground italic">• {String(note)}</p>
      ))}
    </div>
  );
}

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
      <StatBar label="Golpes Sig." f1={stat.f1SigStrikesLanded} f2={stat.f2SigStrikesLanded} />
      <StatBar label="Golpes Totais" f1={stat.f1TotalStrikesLanded} f2={stat.f2TotalStrikesLanded} />
      <StatBar label="Takedowns" f1={stat.f1TakedownsLanded} f2={stat.f2TakedownsLanded} />
      <StatBar label="Ctrl. (seg)" f1={stat.f1ControlTimeSeconds} f2={stat.f2ControlTimeSeconds} />
      {(stat.f1Knockdowns ?? 0) + (stat.f2Knockdowns ?? 0) > 0 && (
        <StatBar label="Knockdowns" f1={stat.f1Knockdowns} f2={stat.f2Knockdowns} />
      )}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: "Cabeça", f1: stat.f1HeadLanded, f2: stat.f2HeadLanded },
          { label: "Corpo",  f1: stat.f1BodyLanded,  f2: stat.f2BodyLanded },
          { label: "Perna",  f1: stat.f1LegLanded,   f2: stat.f2LegLanded },
        ].map(({ label, f1, f2 }) => (
          <div key={label} className="text-center bg-muted/10 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
            <p className="text-xs font-semibold text-primary">{f1 ?? 0} <span className="text-muted-foreground">–</span> <span className="text-orange-400">{f2 ?? 0}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function FighterProfile() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const tabParam = new URLSearchParams(search).get("tab");
  const initialTab =
    tabParam === "historico" || tabParam === "atleta" ? tabParam : "atleta";
  const fighterId = parseInt(params.id || "1");
  const [expandedStats, setExpandedStats] = useState<Set<number>>(new Set());

  const { data: fighter, isLoading } = staticTrpc.fighters.getById.useQuery({ id: fighterId });
  const { data: fights = [] } = staticTrpc.fights.byFighter.useQuery({ fighterId });

  const fightIds = fights.map((f) => f.id);
  const { data: statsRaw } = staticTrpc.fights.stats.useQuery({ fightIds }, { enabled: fightIds.length > 0 });
  const statsMap = new Map((statsRaw ?? []).map((s: any) => [s.fightId, s]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse">Carregando perfil...</div>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Atleta não encontrado.</p>
        <Button onClick={() => setLocation("/fighters")} variant="outline">Voltar</Button>
      </div>
    );
  }

  const strengths    = (fighter.strengths    as string[]) || [];
  const weaknesses   = (fighter.weaknesses   as string[]) || [];
  const primaryBases = (fighter.primaryBases as string[]) || [];
  const howHeWins    = (fighter.howHeWins    as string[]) || [];
  const howHeLoses   = (fighter.howHeLoses   as string[]) || [];

  const wins        = fighter.wins        || 0;
  const koWins      = fighter.koTkoWins   || 0;
  const subWins     = fighter.submissionWins || 0;
  const decWins     = fighter.decisionWins || 0;
  const winRate     = fighter.winRate     || 0;
  const finishRate  = fighter.finishRate  || 0;
  const subWinRate  = fighter.submissionWinRate || 0;
  const totalFights = fighter.totalFightsPro || 1;
  const streakCount = fighter.currentStreakCount || 0;
  const streakIsWin = fighter.currentStreak === "W";

  const koRate      = wins > 0 ? koWins / wins : 0;
  const striking    = Math.round(Math.min(koRate * 1.5 + winRate * 0.4, 1) * 100);
  const grappling   = Math.round(Math.min(subWinRate * 1.4 + winRate * 0.3, 1) * 100);
  const finishing   = Math.round(finishRate * 100);
  const experience  = Math.round(Math.min(totalFights / 35, 1) * 100);
  const consistency = Math.round(Math.min(winRate * 0.7 + (streakIsWin ? streakCount / 10 : 0) * 0.3, 1) * 100);
  const decisionGame = Math.round(wins > 0 ? Math.min((decWins / wins) * 100 * 1.2, 100) : 50);

  const radarData = [
    { subject: "Striking",    A: Math.max(striking,    5) },
    { subject: "Grappling",   A: Math.max(grappling,   5) },
    { subject: "Finalização", A: Math.max(finishing,   5) },
    { subject: "Experiência", A: Math.max(experience,  5) },
    { subject: "Consistência",A: Math.max(consistency, 5) },
    { subject: "Decisão",     A: Math.max(decisionGame,5) },
  ];

  const PIE_COLORS = {
    "Submissão": "oklch(0.70 0.18 150)",
    "KO/TKO":   "oklch(0.56 0.22 25)",
    "Decisão":  "oklch(0.75 0.18 65)",
  };

  const winBreakdown = [
    { name: "Submissão", value: subWins, color: PIE_COLORS["Submissão"] },
    { name: "KO/TKO",   value: koWins,  color: PIE_COLORS["KO/TKO"]   },
    { name: "Decisão",  value: decWins, color: PIE_COLORS["Decisão"]  },
  ].filter((d) => d.value > 0);

  const initials = fighter.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  // The DB sometimes stores the fighter's primary org in `promotion` for every fight,
  // even when the fight happened in another promotion. The real promotion is in `event`
  // (e.g. "Shooto Brazil 113 - ...", "MAC 1 - ...", "FK MMA - Favela Kombat 37").
  // Extract the org name from the event prefix when available.
  function derivePromotion(promotion: string | null, event: string | null): string {
    if (event) {
      const cleaned = event.trim();
      const dashIdx = cleaned.search(/\s+[-–]\s+/);
      const head = (dashIdx > 0 ? cleaned.slice(0, dashIdx) : cleaned).trim();
      const m = head.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.&\s]*?)(?:\s+\d.*)?$/);
      if (m) {
        const candidate = m[1].trim();
        if (candidate.length >= 2) return candidate;
      }
    }
    return promotion || "Sem organização";
  }

  const orgMap = new Map<string, { total: number; wins: number; losses: number; draws: number; ko: number; sub: number; dec: number }>();
  for (const f of fights) {
    const org = derivePromotion(f.promotion, f.event);
    if (!orgMap.has(org)) orgMap.set(org, { total: 0, wins: 0, losses: 0, draws: 0, ko: 0, sub: 0, dec: 0 });
    const entry = orgMap.get(org)!;
    entry.total++;
    if (f.result === "win") {
      entry.wins++;
      if (f.methodCategory === "KO_TKO")         entry.ko++;
      else if (f.methodCategory === "SUBMISSION") entry.sub++;
      else if (f.methodCategory === "DECISION")   entry.dec++;
    } else if (f.result === "loss") entry.losses++;
    else entry.draws++;
  }
  const orgRows = Array.from(orgMap.entries()).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.total - a.total);

  const methodData = Object.entries(
    fights.reduce((acc, f) => {
      const m = f.methodCategory || "OTHER";
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace("_", "/"), value }));

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

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* ── Fighter header ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-500 to-transparent" />

        <div className="relative p-6 flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/fighters")}
            className="shrink-0 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <FighterAvatarDiamond initials={initials} variant="rft" size="lg" className="!w-14 !h-14" />
            {fighter.isChampion === 1 && (
              <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-tight">
                {fighter.name}
              </h1>
              {fighter.isChampion === 1 && (
                <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 py-0 px-1.5 shrink-0">
                  CAMPEÃO
                </Badge>
              )}
            </div>
            {fighter.nickname && <p className="text-primary/70 italic text-sm">"{fighter.nickname}"</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {fighter.weightClass && (
                <Badge className="bg-primary/15 text-primary border-primary/25 text-xs">{fighter.weightClass}</Badge>
              )}
              {fighter.styleArchetype && (
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">{fighter.styleArchetype}</Badge>
              )}
              {fighter.nationality && <span className="text-xs text-muted-foreground">{fighter.nationality}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <Tabs key={initialTab} defaultValue={initialTab} className="w-full">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-xl">
          <TabsTrigger value="historico" className="rounded-lg text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Swords className="h-3.5 w-3.5 mr-1.5" />Histórico ({fights.length})
          </TabsTrigger>
          <TabsTrigger value="atleta" className="rounded-lg text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <User className="h-3.5 w-3.5 mr-1.5" />Atleta
          </TabsTrigger>
          <TabsTrigger value="scouting" onClick={() => setLocation(`/scouting?fighterId=${fighterId}`)} className="rounded-lg text-sm data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">
            <Shield className="h-3.5 w-3.5 mr-1.5" />Scouting
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Atleta ─────────────────────────────── */}
        <TabsContent value="atleta" className="mt-5 space-y-5">

          {/* Record strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Record Profissional", value: `${fighter.wins}-${fighter.losses}-${fighter.draws}`, sub: `${totalFights} lutas`, color: "text-foreground" },
              { label: "Taxa de Vitória",      value: fighter.winRate ? `${(fighter.winRate * 100).toFixed(0)}%` : "N/A", sub: `${wins} vitórias`, color: "text-green-400" },
              { label: "Taxa de Finalização",  value: fighter.finishRate ? `${(fighter.finishRate * 100).toFixed(0)}%` : "N/A", sub: `${koWins + subWins} finalizações`, color: "text-amber-400" },
              { label: "Sequência Atual",       value: streakCount > 0 ? `${streakCount}${streakIsWin ? "W" : "L"}` : "N/A", sub: streakIsWin ? "vitórias seguidas" : "derrotas seguidas", color: streakIsWin ? "text-green-400" : "text-red-400" },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-4">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Physical Profile */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Perfil Físico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Altura",       value: fighter.heightCm  ? `${fighter.heightCm} cm`  : "N/A" },
                  { label: "Envergadura",  value: fighter.reachCm   ? `${fighter.reachCm} cm`   : "N/A" },
                  { label: "Peso",         value: fighter.weightKg  ? `${fighter.weightKg} kg`  : "N/A" },
                  { label: "Stance",       value: fighter.stance    || "N/A" },
                  { label: "Equipe",       value: fighter.primaryTeam || "N/A" },
                  { label: "Nacionalidade",value: fighter.nationality || "N/A" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
                {primaryBases.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {primaryBases.map((base) => <Badge key={base} variant="secondary" className="text-xs">{base}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Radar */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Target className="h-3.5 w-3.5" /> Perfil de Habilidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="oklch(0.22 0.005 240)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 10 }} />
                    <Radar name="Habilidades" dataKey="A" stroke="oklch(0.56 0.22 25)" fill="oklch(0.56 0.22 25)" fillOpacity={0.25} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Award className="h-3.5 w-3.5" /> Distribuição de Vitórias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {winBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={winBreakdown} cx="50%" cy="50%" innerRadius={36} outerRadius={65} dataKey="value">
                          {winBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "oklch(0.11 0.005 240)", border: "1px solid oklch(0.20 0.005 240)", borderRadius: "8px", fontSize: "11px" }} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px", color: "oklch(0.55 0.01 240)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {winBreakdown.map((item) => (
                        <div key={item.name} className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-lg font-black" style={{ color: item.color }}>{item.value}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[190px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de vitória</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Maior sequência de vitórias", value: fighter.longestWinStreak || 0, icon: TrendingUp },
              { label: "Vitórias por submissão",       value: subWins, icon: Shield },
              { label: "Vitórias por KO/TKO",          value: koWins,  icon: Zap },
              { label: "Total de lutas pro",            value: fighter.totalFightsPro || 0, icon: Target },
            ].map((stat) => (
              <Card key={stat.label} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="mb-3">
                    <FighterAvatarDiamond icon={stat.icon} variant="rft" size="sm" />
                  </div>
                  <p className="text-2xl font-black text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Style Analysis */}
          {(strengths.length > 0 || weaknesses.length > 0 || howHeWins.length > 0 || howHeLoses.length > 0) && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-4 w-0.5 bg-primary rounded-full" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Análise de Estilo</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strengths.length > 0 && (
                  <Card className="border-l-2 border-l-green-500 border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-green-400 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Pontos Fortes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {weaknesses.length > 0 && (
                  <Card className="border-l-2 border-l-red-500 border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2"><XCircle className="h-3.5 w-3.5" /> Vulnerabilidades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {weaknesses.map((w, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground leading-relaxed">{w}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {howHeWins.length > 0 && (
                  <Card className="border-l-2 border-l-teal-500 border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-teal-400 flex items-center gap-2"><Swords className="h-3.5 w-3.5" /> Como Vence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {howHeWins.map((w, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-teal-500/5 border border-teal-500/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground leading-relaxed">{w}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {howHeLoses.length > 0 && (
                  <Card className="border-l-2 border-l-amber-500 border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" /> Como Perde</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {howHeLoses.map((l, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground leading-relaxed">{l}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Org breakdown */}
          {orgRows.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-4 w-0.5 bg-primary rounded-full" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lutas por Organização</h2>
              </div>
              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <div className="grid grid-cols-7 gap-2 px-4 py-2.5 border-b border-border bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-2">Organização</div>
                    <div className="text-center">Lutas</div>
                    <div className="text-center text-green-400">V</div>
                    <div className="text-center text-red-400">D</div>
                    <div className="text-center text-muted-foreground">E</div>
                    <div className="text-center">% Vit.</div>
                  </div>
                  {orgRows.map((row, i) => {
                    const pct = row.total > 0 ? Math.round((row.wins / row.total) * 100) : 0;
                    return (
                      <div key={row.name} className={`grid grid-cols-7 gap-2 px-4 py-3 items-center text-sm ${i < orgRows.length - 1 ? "border-b border-border/50" : ""}`}>
                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Building2 className="h-3 w-3 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground truncate">{row.name}</span>
                        </div>
                        <div className="text-center font-black text-foreground">{row.total}</div>
                        <div className="text-center font-bold text-green-400">{row.wins}</div>
                        <div className="text-center font-bold text-red-400">{row.losses}</div>
                        <div className="text-center text-muted-foreground">{row.draws}</div>
                        <div className="text-center">
                          <span className={`font-bold text-xs ${pct >= 60 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Histórico de Lutas ─────────────────── */}
        <TabsContent value="historico" className="mt-5 space-y-5">

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total de Lutas", value: fights.length, color: "text-foreground" },
              { label: "Vitórias",       value: fights.filter((f) => f.result === "win").length,  color: "text-green-400" },
              { label: "Derrotas",       value: fights.filter((f) => f.result === "loss").length, color: "text-red-400" },
              { label: "Finalizações",   value: fights.filter((f) => f.result === "win" && f.methodCategory !== "DECISION").length, color: "text-orange-400" },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Method Chart */}
          {methodData.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Distribuição por Método</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
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
              Todas as Lutas ({fights.length})
            </h2>
            <div className="space-y-2">
              {fights.map((fight) => {
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
                          <p className="text-xs text-muted-foreground mt-0.5">{derivePromotion(fight.promotion, fight.event)}</p>
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
                      <FightNotes notes={fight.notes} />
                      {stat && isExpanded && (
                        <FightStatsPanel stat={stat} fighterName={fighter.name} opponentName={fight.opponent} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {fights.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">Sem histórico de lutas disponível</div>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
