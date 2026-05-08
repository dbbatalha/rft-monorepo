import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { usePredictMutation } from "@/lib/predict";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Button } from "@rft/shared/ui/button";
import { Input } from "@rft/shared/ui/input";
import { Label } from "@rft/shared/ui/label";
import { Badge } from "@rft/shared/ui/badge";
import { Progress } from "@rft/shared/ui/progress";
import {
  Target,
  TrendingUp,
  DollarSign,
  Zap,
  RefreshCw,
  ChevronRight,
  Brain,
  Activity,
  Swords,
  BarChart3,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

type ModelBreakdownItem = {
  model: string;
  f1Prob: number;
  f2Prob: number;
  weight: number;
};

type PredictionResult = {
  fighter1WinProbability: number;
  fighter2WinProbability: number;
  predictedWinner: string;
  confidence: number;
  fighter1DecimalOdds: number;
  fighter2DecimalOdds: number;
  fighter1AmericanOdds: number;
  fighter2AmericanOdds: number;
  keyFactors: string[];
  // Finish method probabilities
  probKoTko: number;
  probSubmission: number;
  probDecision: number;
  fighter1KoProb: number;
  fighter1SubProb: number;
  fighter1DecProb: number;
  fighter2KoProb: number;
  fighter2SubProb: number;
  fighter2DecProb: number;
  // Model breakdown
  modelBreakdown: ModelBreakdownItem[];
};

const MEN_DIVISIONS = [
  "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
  "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
];
const WOMEN_DIVISIONS = [
  "Atomweight", "Women's Strawweight", "Women's Flyweight",
  "Women's Bantamweight", "Women's Featherweight", "Women's Lightweight",
];

function divisionsApart(wc1?: string | null, wc2?: string | null): number {
  if (!wc1 || !wc2) return 0; // unknown: allow
  const m1 = MEN_DIVISIONS.indexOf(wc1), m2 = MEN_DIVISIONS.indexOf(wc2);
  if (m1 >= 0 && m2 >= 0) return Math.abs(m1 - m2);
  const w1 = WOMEN_DIVISIONS.indexOf(wc1), w2 = WOMEN_DIVISIONS.indexOf(wc2);
  if (w1 >= 0 && w2 >= 0) return Math.abs(w1 - w2);
  return 999; // cross-gender: not allowed
}

const MODEL_COLORS: Record<string, string> = {
  "Elo Rating (FiveThirtyEight)": "#f59e0b",
  "Logistic Regression": "#2dd4bf",
  "Decision Tree": "#10b981",
  "Random Forest": "#8b5cf6",
  "XGBoost": "#f97316",
  "Neural Network (MLP)": "#a78bfa",
};

const MODEL_SHORT: Record<string, string> = {
  "Elo Rating (FiveThirtyEight)": "Elo",
  "Logistic Regression": "LR",
  "Decision Tree": "DT",
  "Random Forest": "RF",
  "XGBoost": "XGB",
  "Neural Network (MLP)": "NN",
};

type Fighter = {
  id: number;
  name: string;
  nickname?: string | null;
  weightClass?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
};

function FighterAutocomplete({
  value,
  onChange,
  placeholder,
  accentClass,
  allFighters,
  recentFighters,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  accentClass: string;
  allFighters: Fighter[];
  recentFighters: Fighter[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = value.trim().length === 0
    ? recentFighters
    : allFighters
        .filter((f) => {
          const q = value.toLowerCase();
          const nameWords = f.name.toLowerCase().split(" ");
          return (
            nameWords.some((w) => w.startsWith(q)) ||
            (f.nickname && f.nickname.toLowerCase().startsWith(q))
          );
        })
        .slice(0, 10);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`bg-input border-border text-foreground ${accentClass}`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {value.trim().length === 0 && (
            <p className="text-xs text-muted-foreground px-3 pt-2.5 pb-1 uppercase tracking-wider font-semibold border-b border-border">
              Lutadores recentes
            </p>
          )}
          {suggestions.map((f) => (
            <button
              key={f.id}
              onMouseDown={() => { onChange(f.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-4"
            >
              <div>
                <span className="text-sm text-foreground font-medium">{f.name}</span>
                {f.nickname && (
                  <span className="text-xs text-muted-foreground ml-1.5">"{f.nickname}"</span>
                )}
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

export default function Predictor() {
  const [, setLocation] = useLocation();
  const [fighter1Name, setFighter1Name] = useState("");
  const [fighter2Name, setFighter2Name] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);

  const { data: fighters = [] } = staticTrpc.fighters.list.useQuery();
  const { data: recentFighters = [] } = staticTrpc.fighters.recent.useQuery();

  const resolvedF1 = useMemo(
    () => fighters.find((f) => f.name.toLowerCase() === fighter1Name.toLowerCase())
       ?? fighters.find((f) => f.name.toLowerCase().includes(fighter1Name.toLowerCase())),
    [fighters, fighter1Name]
  );
  const resolvedF2 = useMemo(
    () => fighters.find((f) => f.name.toLowerCase() === fighter2Name.toLowerCase())
       ?? fighters.find((f) => f.name.toLowerCase().includes(fighter2Name.toLowerCase())),
    [fighters, fighter2Name]
  );

  const allowedF2Fighters = useMemo(
    () => resolvedF1?.weightClass
      ? fighters.filter((f) => f.id !== resolvedF1.id && divisionsApart(resolvedF1.weightClass, f.weightClass) <= 1)
      : fighters,
    [fighters, resolvedF1]
  );

  const isCompatible = useMemo(
    () => divisionsApart(resolvedF1?.weightClass, resolvedF2?.weightClass) <= 1,
    [resolvedF1, resolvedF2]
  );

  const predictMutation = usePredictMutation({
    onSuccess: (data) => {
      setResult(data as unknown as PredictionResult);
      toast.success("Predição calculada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao calcular predição.");
    },
  });

  const handlePredict = () => {
    if (!fighter1Name.trim() || !fighter2Name.trim()) {
      toast.error("Preencha os nomes dos dois atletas.");
      return;
    }
    if (resolvedF1 && resolvedF2 && !isCompatible) {
      toast.error(
        `Categorias incompatíveis: ${resolvedF1.weightClass} vs ${resolvedF2.weightClass}. ` +
        "Apenas a mesma divisão, uma acima ou uma abaixo são permitidas."
      );
      return;
    }

    const f1 = resolvedF1 ?? fighters?.find((f) => f.name.toLowerCase().includes(fighter1Name.toLowerCase()));
    const f2 = resolvedF2 ?? fighters?.find((f) => f.name.toLowerCase().includes(fighter2Name.toLowerCase()));

    predictMutation.mutate({
      fighter1Id: f1?.id || 1,
      fighter2Id: f2?.id,
      fighter1Name: f1?.name || fighter1Name,
      fighter2Name: f2?.name || fighter2Name,
    });
  };

  const formatAmericanOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.7) return { label: "Alta Confiança", color: "text-emerald-400" };
    if (conf >= 0.4) return { label: "Confiança Moderada", color: "text-yellow-400" };
    return { label: "Baixa Confiança", color: "text-rose-400" };
  };

  const methodChartData = result
    ? [
        { name: "KO/TKO", prob: parseFloat((result.probKoTko * 100).toFixed(1)), fill: "#f97316" },
        { name: "Submission", prob: parseFloat((result.probSubmission * 100).toFixed(1)), fill: "#a78bfa" },
        { name: "Decisão", prob: parseFloat((result.probDecision * 100).toFixed(1)), fill: "#2dd4bf" },
      ]
    : [];

  const modelChartData = result?.modelBreakdown.map((m) => ({
    model: MODEL_SHORT[m.model] || m.model,
    fullName: m.model,
    f1: parseFloat((m.f1Prob * 100).toFixed(1)),
    f2: parseFloat((m.f2Prob * 100).toFixed(1)),
    color: MODEL_COLORS[m.model] || "#6b7280",
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-yellow-400 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />

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
              <FighterAvatarDiamond icon={Target} variant="rft" size="md" />
              <h1 className="text-xl font-black tracking-tight text-foreground">Preditor de Lutas</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Ensemble de 6 modelos de ML: Elo Rating, Logistic Regression, Decision Tree, Random Forest, XGBoost e Neural Network
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Configurar Matchup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Atleta 1 (Vermelho)</Label>
              <FighterAutocomplete
                value={fighter1Name}
                onChange={setFighter1Name}
                placeholder="Buscar atleta..."
                accentClass="border-amber-500/30"
                allFighters={fighters}
                recentFighters={recentFighters}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground">
                Atleta 2 (Amarelo)
                {resolvedF1?.weightClass && (
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    — mesma divisão ou ±1: {resolvedF1.weightClass}
                  </span>
                )}
              </Label>
              <FighterAutocomplete
                value={fighter2Name}
                onChange={setFighter2Name}
                placeholder="Buscar atleta..."
                accentClass="border-yellow-400/40"
                allFighters={resolvedF1 ? allowedF2Fighters : fighters}
                recentFighters={
                  resolvedF1
                    ? recentFighters.filter((f) => divisionsApart(resolvedF1.weightClass, f.weightClass) <= 1)
                    : recentFighters
                }
              />
            </div>
          </div>

          {/* Weight class incompatibility warning */}
          {resolvedF1 && resolvedF2 && !isCompatible && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">
                <span className="font-semibold">{resolvedF1.name}</span> ({resolvedF1.weightClass}) e{" "}
                <span className="font-semibold">{resolvedF2.name}</span> ({resolvedF2.weightClass}) estão em
                categorias incompatíveis. Apenas a mesma divisão ou ±1 divisão são permitidas.
              </p>
            </div>
          )}

          <Button
            onClick={handlePredict}
            disabled={predictMutation.isPending || (!!resolvedF1 && !!resolvedF2 && !isCompatible)}
            className="mt-4 bg-primary hover:bg-primary/90 w-full md:w-auto"
          >
            {predictMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Calculando 6 modelos...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Calcular Predição (Ensemble)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Winner Banner */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Vencedor Previsto (Ensemble)</p>
                  <h2 className="text-3xl font-black text-primary">{result.predictedWinner}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm font-semibold ${getConfidenceLabel(result.confidence).color}`}>
                      {getConfidenceLabel(result.confidence).label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({(result.confidence * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-black text-amber-400">{(result.fighter1WinProbability * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{fighter1Name.split(" ")[0]}</p>
                  </div>
                  <div className="text-muted-foreground font-bold text-xl self-center">vs</div>
                  <div>
                    <p className="text-2xl font-black text-yellow-400">{(result.fighter2WinProbability * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{fighter2Name.split(" ")[0]}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Probability Bars */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Probabilidades de Vitória
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-amber-400">{fighter1Name}</span>
                  <span className="text-sm font-bold text-amber-400">
                    {(result.fighter1WinProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={result.fighter1WinProbability * 100} className="h-3 [&>div]:bg-amber-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-yellow-400">{fighter2Name}</span>
                  <span className="text-sm font-bold text-yellow-400">
                    {(result.fighter2WinProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={result.fighter2WinProbability * 100} className="h-3 [&>div]:bg-yellow-400" />
              </div>
            </CardContent>
          </Card>

          {/* Model Breakdown + Finish Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Breakdown */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Breakdown por Modelo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.modelBreakdown.map((m) => {
                  const color = MODEL_COLORS[m.model] || "#6b7280";
                  const shortName = MODEL_SHORT[m.model] || m.model;
                  const f1Wins = m.f1Prob > m.f2Prob;
                  return (
                    <div key={m.model} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-medium text-foreground">{m.model}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-border text-muted-foreground">
                            {(m.weight * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <span className="text-xs font-bold" style={{ color }}>
                          {f1Wins ? fighter1Name.split(" ")[0] : fighter2Name.split(" ")[0]}
                        </span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="rounded-l-full bg-amber-500/70 transition-all"
                          style={{ width: `${m.f1Prob * 100}%` }}
                        />
                        <div
                          className="rounded-r-full bg-yellow-400 transition-all"
                          style={{ width: `${m.f2Prob * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{(m.f1Prob * 100).toFixed(1)}%</span>
                        <span>{(m.f2Prob * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Finish Method Probabilities */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  Método de Finalização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall method chart */}
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(v: number) => [`${v}%`, "Probabilidade"]}
                      />
                      <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
                        {methodChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-fighter method breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por Atleta</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        name: fighter1Name.split(" ")[0],
                        color: "text-amber-400",
                        ko: result.fighter1KoProb,
                        sub: result.fighter1SubProb,
                        dec: result.fighter1DecProb,
                      },
                      {
                        name: fighter2Name.split(" ")[0],
                        color: "text-yellow-400",
                        ko: result.fighter2KoProb,
                        sub: result.fighter2SubProb,
                        dec: result.fighter2DecProb,
                      },
                    ].map((f) => (
                      <div key={f.name} className="space-y-1.5 bg-secondary/30 rounded-lg p-3">
                        <p className={`text-xs font-bold ${f.color}`}>{f.name} vence por:</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">KO/TKO</span>
                            <span className="font-semibold text-orange-400">{(f.ko * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Submission</span>
                            <span className="font-semibold text-violet-400">{(f.sub * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Decisão</span>
                            <span className="font-semibold text-yellow-400">{(f.dec * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Odds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                fighter: fighter1Name,
                decimal: result.fighter1DecimalOdds,
                american: result.fighter1AmericanOdds,
                prob: result.fighter1WinProbability,
                color: "text-amber-400",
                borderColor: "border-amber-500/20",
              },
              {
                fighter: fighter2Name,
                decimal: result.fighter2DecimalOdds,
                american: result.fighter2AmericanOdds,
                prob: result.fighter2WinProbability,
                color: "text-yellow-400",
                borderColor: "border-yellow-400/30",
              },
            ].map((odds) => (
              <Card key={odds.fighter} className={`border ${odds.borderColor} bg-card`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className={`h-4 w-4 ${odds.color}`} />
                    <p className="font-semibold text-foreground">{odds.fighter}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className={`text-xl font-black ${odds.color}`}>{odds.decimal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Decimal</p>
                    </div>
                    <div>
                      <p className={`text-xl font-black ${odds.color}`}>{formatAmericanOdds(odds.american)}</p>
                      <p className="text-xs text-muted-foreground">Americano</p>
                    </div>
                    <div>
                      <p className={`text-xl font-black ${odds.color}`}>{(odds.prob * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Probabilidade</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Key Factors */}
          {result.keyFactors && result.keyFactors.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Fatores Determinantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.keyFactors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{factor}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              As predições são baseadas em análise estatística de dados históricos e não constituem conselho de apostas.
              Os modelos são aproximações matemáticas e não garantem resultados. Aposte com responsabilidade.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
