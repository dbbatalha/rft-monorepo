import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Button } from "@rft/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rft/shared/ui/tabs";
import { ArrowLeft, Calendar, User, ChevronDown, ChevronUp, Activity, Swords, Shield } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

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
        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Estatísticas da Luta</span>
        <span className="text-orange-400">{opponentName.split(" ")[0]}</span>
      </div>
      <StatBar label="Golpes Sig."   f1={stat.f1SigStrikesLanded}   f2={stat.f2SigStrikesLanded} />
      <StatBar label="Golpes Totais" f1={stat.f1TotalStrikesLanded} f2={stat.f2TotalStrikesLanded} />
      <StatBar label="Takedowns"     f1={stat.f1TakedownsLanded}    f2={stat.f2TakedownsLanded} />
      <StatBar label="Ctrl. (seg)"   f1={stat.f1ControlTimeSeconds} f2={stat.f2ControlTimeSeconds} />
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

export default function FightHistory() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [expandedStats, setExpandedStats] = useState<Set<number>>(new Set());
  const fighterId = parseInt(params.id || "1");

  const { data: fighter } = staticTrpc.fighters.getById.useQuery({ id: fighterId });
  const { data: fights, isLoading } = staticTrpc.fights.byFighter.useQuery({ fighterId });

  const fightIds = fights?.map((f) => f.id) ?? [];
  const { data: statsRaw } = staticTrpc.fights.stats.useQuery({ fightIds }, { enabled: fightIds.length > 0 });
  const statsMap = new Map((statsRaw ?? []).map((s: any) => [s.fightId, s]));

  const methodData = fights
    ? Object.entries(
        fights.reduce((acc, f) => {
          const method = f.methodCategory || "OTHER";
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name: name.replace("_", "/"), value }))
    : [];

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

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-500 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/fights")}
            className="shrink-0 hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground">{fighter?.name ?? "Atleta"}</h1>
            {fighter && (
              <p className="text-xs text-muted-foreground">
                {fighter.wins}W-{fighter.losses}L-{fighter.draws}D
                {fighter.weightClass && ` • ${fighter.weightClass}`}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/fighter/${fighterId}`)}
              className="text-xs text-muted-foreground hover:text-primary">
              Ver perfil completo
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-xl">
          <TabsTrigger value="historico" className="rounded-lg text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Swords className="h-3.5 w-3.5 mr-1.5" />Histórico de Lutas
          </TabsTrigger>
          <TabsTrigger value="scouting" onClick={() => setLocation(`/scouting?fighterId=${fighterId}`)} className="rounded-lg text-sm data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">
            <Shield className="h-3.5 w-3.5 mr-1.5" />Scouting
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Histórico ───────────────────────────── */}
        <TabsContent value="historico" className="mt-5 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total de Lutas", value: fights?.length || 0, color: "text-foreground" },
              { label: "Vitórias",   value: fights?.filter((f) => f.result === "win").length || 0,  color: "text-green-400" },
              { label: "Derrotas",   value: fights?.filter((f) => f.result === "loss").length || 0, color: "text-red-400" },
              { label: "Finalizações", value: fights?.filter((f) => f.result === "win" && f.methodCategory !== "DECISION").length || 0, color: "text-orange-400" },
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
              Todas as Lutas ({fights?.length || 0})
            </h2>
            {isLoading ? (
              <div className="text-muted-foreground animate-pulse py-8 text-center">Carregando lutas...</div>
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
                        <FightNotes notes={fight.notes} />
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

      </Tabs>
    </div>
  );
}
