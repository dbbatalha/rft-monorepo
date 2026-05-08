import { useState, useEffect } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { usePredictMutation } from "@/lib/predict";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Button } from "@rft/shared/ui/button";
import { Badge } from "@rft/shared/ui/badge";
import { Progress } from "@rft/shared/ui/progress";
import {
  CalendarDays, Zap, ArrowLeft, RefreshCw,
  MapPin, Target, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";
import { translateWeightClass, weightClassTooltip } from "@rft/shared/weightClasses";

type BoutResult = {
  fighter1WinProbability: number;
  fighter2WinProbability: number;
  predictedWinner: string;
  confidence: number;
  probKoTko: number;
  probSubmission: number;
  probDecision: number;
  fighter1KoProb: number;
  fighter1SubProb: number;
  fighter1DecProb: number;
  fighter2KoProb: number;
  fighter2SubProb: number;
  fighter2DecProb: number;
};

type BoutState = {
  fighter1: string;
  fighter2: string;
  weightClass: string;
  result: BoutResult | null;
  loading: boolean;
  expanded: boolean;
};

type EventState = {
  name: string;
  date: string;
  location: string;
  url: string;
  bouts: BoutState[];
  expanded: boolean;
};

function MethodBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const ORG_OPTIONS = [
  { key: "ufc",          label: "UFC" },
  { key: "jungle-fight", label: "Jungle Fight" },
  { key: "lfa",          label: "LFA" },
  { key: "one",          label: "ONE" },
  { key: "pfl",          label: "PFL" },
] as const;

export default function UpcomingEvents() {
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<EventState[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("ufc");

  const { data: rawEvents, isLoading, error, refetch } = staticTrpc.events.upcoming.useQuery(
    { org: selectedOrg },
    { staleTime: 5 * 60 * 1000, retry: 1 }
  );

  const { data: allFighters = [] } = staticTrpc.fighters.list.useQuery();
  const predictMutation = usePredictMutation();

  // Infinite scroll — 3 events per batch
  const { visibleCount: visibleEventCount, sentinelRef: eventSentinelRef, hasMore: eventHasMore } =
    useInfiniteScroll(events.length, 3, events.length);

  // Initialise event states when data arrives
  useEffect(() => {
    if (!rawEvents) return;
    setEvents(rawEvents.map((ev) => ({
      ...ev,
      expanded: true,
      bouts: ev.bouts.map((b) => ({ ...b, result: null, loading: false, expanded: false })),
    })));
  }, [rawEvents]);

  const predictBout = async (evIdx: number, boutIdx: number) => {
    const bout = events[evIdx].bouts[boutIdx];
    setEvents((prev) => {
      const next = [...prev];
      next[evIdx] = { ...next[evIdx], bouts: [...next[evIdx].bouts] };
      next[evIdx].bouts[boutIdx] = { ...bout, loading: true };
      return next;
    });

    try {
      const f1 = allFighters.find((f) => f.name.toLowerCase().includes(bout.fighter1.toLowerCase().split(" ").slice(-1)[0]));
      const f2 = allFighters.find((f) => f.name.toLowerCase().includes(bout.fighter2.toLowerCase().split(" ").slice(-1)[0]));
      const result = await predictMutation.mutateAsync({
        fighter1Id: f1?.id || 1,
        fighter2Id: f2?.id,
        fighter1Name: f1?.name || bout.fighter1,
        fighter2Name: f2?.name || bout.fighter2,
      }) as unknown as BoutResult;

      setEvents((prev) => {
        const next = [...prev];
        next[evIdx] = { ...next[evIdx], bouts: [...next[evIdx].bouts] };
        next[evIdx].bouts[boutIdx] = { ...bout, result, loading: false };
        return next;
      });
    } catch {
      setEvents((prev) => {
        const next = [...prev];
        next[evIdx] = { ...next[evIdx], bouts: [...next[evIdx].bouts] };
        next[evIdx].bouts[boutIdx] = { ...bout, loading: false };
        return next;
      });
      toast.error(`Erro ao prever ${bout.fighter1} vs ${bout.fighter2}`);
    }
  };

  const predictAllEvent = (evIdx: number) => {
    events[evIdx].bouts.forEach((b, boutIdx) => {
      if (!b.result && !b.loading) predictBout(evIdx, boutIdx);
    });
  };

  const toggleExpand = (evIdx: number) => {
    setEvents((prev) => prev.map((ev, i) => i === evIdx ? { ...ev, expanded: !ev.expanded } : ev));
  };

  const toggleBout = (evIdx: number, boutIdx: number) => {
    const bout = events[evIdx].bouts[boutIdx];
    const willExpand = !bout.expanded;
    setEvents((prev) => {
      const next = [...prev];
      next[evIdx] = { ...next[evIdx], bouts: [...next[evIdx].bouts] };
      next[evIdx].bouts[boutIdx] = { ...bout, expanded: willExpand };
      return next;
    });
    if (willExpand && !bout.result && !bout.loading) {
      predictBout(evIdx, boutIdx);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-500 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />Voltar
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FighterAvatarDiamond icon={CalendarDays} variant="rft" size="md" />
              <h1 className="text-xl font-black tracking-tight text-foreground">Eventos Futuros — Predições</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Cards dos próximos eventos buscados em tempo real (UFC via ufcstats.com, demais via Tapology), com predições do modelo ML.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}
            className="border-border hover:border-primary/40 hover:text-primary shrink-0">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar
          </Button>
        </div>
      </div>

      {/* ── Org selector ──────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {ORG_OPTIONS.map((org) => (
          <button
            key={org.key}
            onClick={() => setSelectedOrg(org.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              selectedOrg === org.key
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-card border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
            }`}
          >
            {org.label}
          </button>
        ))}
      </div>

      {/* ── Loading ──────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl shimmer h-48" />
          ))}
          <p className="text-center text-xs text-muted-foreground animate-pulse">
            Buscando próximos eventos…
          </p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────── */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Não foi possível buscar os eventos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique a conexão com internet. O ufcstats.com pode estar temporariamente indisponível.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-3 h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1.5" />Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* ── Events ───────────────────────────────────── */}
      {events.slice(0, visibleEventCount).map((ev, evIdx) => {
        const doneCount = ev.bouts.filter((b) => b.result).length;
        const pendingCount = ev.bouts.filter((b) => !b.result && !b.loading).length;

        return (
          <div key={ev.url} className="space-y-3">
            {/* Event header */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-foreground">{ev.name}</h2>
                    {ev.date && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 text-xs font-heading uppercase tracking-wider">
                        <CalendarDays className="h-3.5 w-3.5" />{ev.date}
                      </span>
                    )}
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                      {ev.bouts.length} lutas
                    </Badge>
                    {doneCount > 0 && (
                      <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]">
                        {doneCount}/{ev.bouts.length} previstos
                      </Badge>
                    )}
                  </div>
                  {ev.location && (
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />{ev.location}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pendingCount > 0 && (
                    <Button size="sm" onClick={() => predictAllEvent(evIdx)}
                      className="h-8 text-xs bg-primary hover:bg-primary/90">
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      Prever todas ({pendingCount})
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(evIdx)}
                    className="h-8 w-8 p-0 text-muted-foreground">
                    {ev.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Card a confirmar (PFL etc — quando o scrape só pega listing sem bouts) */}
            {ev.expanded && ev.bouts.length === 0 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground font-medium">Card a confirmar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O evento foi anunciado, mas as lutas ainda não foram divulgadas pelo organizador.
                      Voltaremos a buscar automaticamente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bouts */}
            {ev.expanded && ev.bouts.map((bout, boutIdx) => {
              const r = bout.result;
              const f1Wins = r ? r.fighter1WinProbability > r.fighter2WinProbability : null;
              const winner = r ? (f1Wins ? bout.fighter1 : bout.fighter2) : null;
              const koProb   = r ? (f1Wins ? r.fighter1KoProb  : r.fighter2KoProb)  : 0;
              const subProb  = r ? (f1Wins ? r.fighter1SubProb : r.fighter2SubProb) : 0;
              const decProb  = r ? (f1Wins ? r.fighter1DecProb : r.fighter2DecProb) : 0;

              return (
                <Card key={boutIdx} className="border-border bg-card overflow-hidden">
                  {/* Bout row — clickable to expand/collapse */}
                  <button
                    onClick={() => toggleBout(evIdx, boutIdx)}
                    className="w-full flex items-center gap-2 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors text-left"
                  >
                    <span className="text-[10px] font-black text-muted-foreground/40 shrink-0">
                      #{ev.bouts.length - boutIdx}
                    </span>
                    {bout.weightClass && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-border/60 text-muted-foreground py-0 px-1.5 shrink-0"
                        title={weightClassTooltip(bout.weightClass)}
                      >
                        {translateWeightClass(bout.weightClass)}
                      </Badge>
                    )}
                    <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                      <span className="font-bold text-red-400 text-sm truncate text-right">{bout.fighter1}</span>
                      <span className="text-xs text-muted-foreground/50 font-black shrink-0">vs</span>
                      <span className="font-bold text-amber-400 text-sm truncate">{bout.fighter2}</span>
                    </div>
                    <div className="shrink-0 text-muted-foreground/40">
                      {bout.loading
                        ? <RefreshCw className="h-5 w-5 animate-spin" />
                        : bout.expanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                    </div>
                  </button>

                  {/* Prediction result */}
                  {bout.expanded && r && (
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                        {/* Winner & confidence */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vencedor previsto</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className={`font-black text-sm ${f1Wins ? "text-red-400" : "text-amber-400"}`}>{winner}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] w-fit ${
                              r.confidence >= 0.65
                                ? "border-green-500/30 text-green-400"
                                : r.confidence >= 0.4
                                ? "border-amber-500/30 text-amber-400"
                                : "border-red-500/30 text-red-400"
                            }`}
                          >
                            {r.confidence >= 0.65 ? "Alta confiança" : r.confidence >= 0.4 ? "Moderada" : "Baixa"} — {(r.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>

                        {/* Win probabilities */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prob. de vitória</p>
                          <div className="space-y-1.5">
                            <div>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-red-400 truncate">{bout.fighter1.split(" ").slice(-1)[0]}</span>
                                <span className="text-red-400 font-bold ml-2 shrink-0">{(r.fighter1WinProbability * 100).toFixed(0)}%</span>
                              </div>
                              <Progress value={r.fighter1WinProbability * 100} className="h-1.5 [&>div]:bg-red-500" />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-amber-400 truncate">{bout.fighter2.split(" ").slice(-1)[0]}</span>
                                <span className="text-amber-400 font-bold ml-2 shrink-0">{(r.fighter2WinProbability * 100).toFixed(0)}%</span>
                              </div>
                              <Progress value={r.fighter2WinProbability * 100} className="h-1.5 [&>div]:bg-amber-500" />
                            </div>
                          </div>
                        </div>

                        {/* Method probabilities */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Método — <span className={f1Wins ? "text-red-400" : "text-amber-400"}>{winner?.split(" ").slice(-1)[0]}</span> vence
                          </p>
                          <div className="space-y-1.5">
                            <MethodBar label="KO / TKO"   pct={koProb  * 100} color="#f97316" />
                            <MethodBar label="Submission" pct={subProb * 100} color="#a78bfa" />
                            <MethodBar label="Decisão"    pct={decProb * 100} color="#2dd4bf" />
                          </div>
                        </div>
                      </div>

                      {/* Overall method strip */}
                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-4 flex-wrap text-xs">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Método geral:</span>
                        <span><span className="text-orange-400 font-bold">{(r.probKoTko * 100).toFixed(0)}%</span> <span className="text-muted-foreground">KO/TKO</span></span>
                        <span><span className="text-violet-400 font-bold">{(r.probSubmission * 100).toFixed(0)}%</span> <span className="text-muted-foreground">Sub.</span></span>
                        <span><span className="text-teal-400 font-bold">{(r.probDecision * 100).toFixed(0)}%</span> <span className="text-muted-foreground">Decisão</span></span>
                      </div>
                    </CardContent>
                  )}

                  {/* Loading */}
                  {bout.expanded && bout.loading && (
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Calculando ensemble de 6 modelos…
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })}

      {/* Sentinel */}
      <div ref={eventSentinelRef} className="py-4 flex justify-center">
        {eventHasMore && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-75" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-150" />
          </div>
        )}
      </div>

      {/* Disclaimer */}
      {events.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Predições baseadas em análise estatística de dados históricos. Não constituem conselho de apostas. Aposte com responsabilidade.
          </p>
        </div>
      )}
    </div>
  );
}
