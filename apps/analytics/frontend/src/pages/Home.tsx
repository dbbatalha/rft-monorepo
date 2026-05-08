import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Users, Swords, Trophy, Shield, Activity, Target, Building2,
  ChevronRight, BarChart3, CalendarDays,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rft/shared/ui/dialog";
import { RftDiamond, RftCard, RftButton } from "@rft/shared/RftIcon";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";

export default function Home() {
  const [, setLocation] = useLocation();
  const [orgsOpen, setOrgsOpen] = useState(false);

  const { data: stats, isLoading } = staticTrpc.dashboard.stats.useQuery();
  const { data: organizations = [] } = staticTrpc.dashboard.organizations.useQuery();
  const { data: allFighters = [] } = staticTrpc.fighters.recent.useQuery();

  const seedMutation = trpc.fighters.seed.useMutation({ onSuccess: () => window.location.reload() });

  const features = [
    {
      icon: Users,
      title: "Perfil de Atletas",
      description: "Análise completa com métricas de performance, radar de habilidades e histórico.",
      path: "/fighters",
      gradient: "from-red-500/20 to-red-900/10",
      iconColor: "text-red-400",
      badge: isLoading ? "Carregando..." : `${stats?.totalFighters ?? 0} atletas`,
    },
    {
      icon: Swords,
      title: "Histórico de Lutas",
      description: "Todos os combates por atleta com método de finalização e análise por luta.",
      path: "/fights",
      gradient: "from-amber-500/20 to-amber-900/10",
      iconColor: "text-amber-400",
      badge: "2.974 lutas",
    },
    {
      icon: Target,
      title: "Preditor de Lutas",
      description: "Modelo de ML para prever resultados e calcular odds para qualquer matchup.",
      path: "/predictor",
      gradient: "from-orange-500/20 to-orange-900/10",
      iconColor: "text-orange-400",
      badge: "ML Model",
    },
    {
      icon: Shield,
      title: "Relatório de Scouting",
      description: "Relatórios completos, gerenciais ou para coaches com análise tática detalhada.",
      path: "/scouting",
      gradient: "from-teal-500/20 to-teal-900/10",
      iconColor: "text-teal-400",
      badge: "3 formatos",
    },
    {
      icon: BarChart3,
      title: "Analytics Avançado",
      description: "Visualizações interativas de métricas, tendências e comparações entre atletas.",
      path: "/advanced",
      gradient: "from-purple-500/20 to-purple-900/10",
      iconColor: "text-purple-400",
      badge: "Interativo",
    },
    {
      icon: CalendarDays,
      title: "Eventos Futuros",
      description: "Calendário oficial das próximas lutas e cards de UFC e principais eventos.",
      path: "/upcoming",
      gradient: "from-sky-500/20 to-sky-900/10",
      iconColor: "text-sky-400",
      badge: "Calendário",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── RFT Cross-link Banner ─────────────────────────── */}
      <a
        href="/"
        className="block relative overflow-hidden rounded-2xl border border-yellow-400/30 group transition-all hover:border-yellow-400/60"
        style={{
          background: "linear-gradient(135deg, #1a1500 0%, #000000 50%, #1a0000 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 12px, #FFD700 12px, #FFD700 13px)",
        }} />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 flex items-center justify-center shrink-0"
              style={{
                background: "#FFD700",
                clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
              }}
            >
              <Trophy className="h-6 w-6 text-black" />
            </div>
            <div>
              <div className="text-yellow-400 text-xs font-bold uppercase tracking-[0.3em] mb-1">
                Renovação Fight Team
              </div>
              <h3 className="text-white text-xl md:text-2xl font-black leading-tight">
                Vem treinar conosco no <span className="text-yellow-400">tatame</span>
              </h3>
              <p className="text-white/60 text-sm mt-1">
                MMA · Boxe · Muay Thai · Jiu-Jitsu · Luta Livre — Botafogo, RJ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-yellow-400 font-bold uppercase tracking-widest text-sm shrink-0 group-hover:gap-4 transition-all">
            Conheça a academia
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </a>

      {/* ── Hero ──────────────────────────────────────────── */}
      <RftCard variant="yellow" className="p-8">
        {/* Diagonal stripes background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 18px, #FFD700 18px, #FFD700 19px)",
        }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <img src="/imagens/rft-losango.png" alt="RFT" className="w-14 h-14 object-contain shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px w-8 bg-yellow-400" />
                  <span className="text-xs font-heading uppercase tracking-[0.3em] text-yellow-400">
                    Plataforma de Inteligência
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl tracking-wider leading-none mb-3">
                  <span className="text-yellow-400" style={{ textShadow: "0 0 30px rgba(250,204,21,0.4)" }}>MMA</span>{" "}
                  <span className="text-white">ANALYTICS</span>
                </h1>
                <p className="text-white/50 max-w-xl text-sm leading-relaxed">
                  Sistema completo de scouting, predição de lutas e análise de performance para atletas e organizações de MMA.
                </p>
              </div>
            </div>

            {stats?.totalFighters === 0 && (
              <RftButton
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                size="md"
              >
                {seedMutation.isPending ? "Carregando..." : "Carregar Dados"}
              </RftButton>
            )}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
            {[
              {
                label: "Atletas",
                value: isLoading ? "—" : stats?.totalFighters ?? 0,
                icon: Users,
                variant: "yellow" as const,
                onClick: () => setLocation("/fighters"),
              },
              {
                label: "Organizações",
                value: organizations.length || "—",
                icon: Trophy,
                variant: "red" as const,
                onClick: () => setOrgsOpen(true),
              },
              {
                label: "Lutas registradas",
                value: isLoading ? "—" : (stats as any)?.totalFights ?? "2.974",
                icon: Swords,
                variant: "yellow" as const,
                onClick: () => setLocation("/fights"),
              },
            ].map((kpi) => (
              <button
                key={kpi.label}
                onClick={kpi.onClick}
                className="flex items-center gap-3 p-3 border border-yellow-400/20 bg-black/40 hover:border-yellow-400/60 hover:bg-yellow-400/5 transition-all text-left group"
              >
                <FighterAvatarDiamond icon={kpi.icon} variant="rft" size="md" />
                <div className="min-w-0">
                  <p className="font-display text-2xl text-white leading-none tracking-wider">{kpi.value}</p>
                  <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-heading">{kpi.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </RftCard>

      {/* ── Organizations Dialog ───────────────────────────── */}
      <Dialog open={orgsOpen} onOpenChange={setOrgsOpen}>
        <DialogContent className="max-w-sm border border-yellow-400/30 bg-black">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FighterAvatarDiamond icon={Building2} variant="rft" size="sm" />
              <span className="font-display text-yellow-400 text-2xl tracking-wider">Organizações</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {organizations.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">Nenhuma organização encontrada</p>
            ) : (
              (organizations as { name: string; shortName: string | null }[]).map((org) => (
                <div key={org.name} className="flex items-center gap-3 px-3 py-2.5 bg-yellow-400/5 border border-yellow-400/20">
                  <Trophy className="h-4 w-4 text-yellow-400 shrink-0" />
                  <span className="font-heading uppercase tracking-wider text-white text-sm">{org.name}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Feature Grid ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-8 bg-yellow-400" />
          <h2 className="font-heading text-sm uppercase tracking-[0.3em] text-yellow-400">Módulos</h2>
          <div className="h-px flex-1 bg-yellow-400/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const isYellow = i % 2 === 0;
            const variant = isYellow ? "yellow" : "red";
            const accent = isYellow ? "#FFD700" : "#FF3333";
            return (
              <button
                key={feature.title}
                onClick={() => setLocation(feature.path)}
                className="relative overflow-hidden text-left transition-all duration-200 group"
                style={{
                  background: "oklch(0.14 0.01 250)",
                  border: `1px solid ${accent}30`,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <FighterAvatarDiamond icon={feature.icon} variant="rft" size="md" />
                    <span
                      className="text-[10px] font-heading uppercase tracking-widest px-2 py-1"
                      style={{ color: accent, border: `1px solid ${accent}40` }}
                    >
                      {feature.badge}
                    </span>
                  </div>
                  <h3
                    className="font-display text-xl tracking-wider text-white mb-2 group-hover:translate-x-0.5 transition-transform"
                    style={{ textShadow: `0 0 20px ${accent}30` }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">{feature.description}</p>
                  <div
                    className="flex items-center gap-1 mt-4 text-xs font-heading uppercase tracking-widest transition-colors"
                    style={{ color: accent }}
                  >
                    <span>Acessar</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
                <div
                  className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500"
                  style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fighters List ─────────────────────────────────── */}
      {allFighters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-px w-8 bg-yellow-400" />
              <h2 className="font-heading text-sm uppercase tracking-[0.3em] text-yellow-400">Atletas adicionados recentemente</h2>
              <div className="h-px flex-1 bg-yellow-400/20" />
            </div>
            <button
              onClick={() => setLocation("/fighters")}
              className="text-xs text-yellow-400/70 hover:text-yellow-400 transition-colors flex items-center gap-1 font-heading uppercase tracking-widest ml-3"
            >
              Ver todos
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {allFighters.slice(0, 20).map((fighter) => {
              const initials = fighter.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              const winRate = fighter.winRate ? (fighter.winRate * 100).toFixed(0) : null;
              return (
                <button
                  key={fighter.id}
                  onClick={() => setLocation(`/fighter/${fighter.id}`)}
                  className="flex items-center gap-3 p-3 border border-yellow-400/20 bg-black/40 hover:border-yellow-400/60 hover:bg-yellow-400/5 transition-all text-left group"
                >
                  {/* Avatar diamond */}
                  <FighterAvatarDiamond initials={initials} variant="rft" size="md" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display tracking-wider text-white text-base group-hover:text-yellow-400 transition-colors truncate">
                      {fighter.name}
                    </p>
                    <p className="text-[10px] text-white/40 truncate uppercase tracking-widest">
                      {fighter.nickname ? `"${fighter.nickname}"` : fighter.weightClass ?? ""}
                    </p>
                  </div>

                  {/* Record */}
                  <div className="text-right shrink-0">
                    <p className="font-display tracking-wider text-base">
                      <span className="text-yellow-400">{fighter.wins}</span>
                      <span className="text-white/30">-</span>
                      <span className="text-red-500">{fighter.losses}</span>
                      {(fighter.draws ?? 0) > 0 && <span className="text-white/30">-{fighter.draws}</span>}
                    </p>
                    {winRate && (
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{winRate}% vitórias</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      )}

      {/* ── Quick Start (empty state) ─────────────────────── */}
      {stats?.totalFighters === 0 && !seedMutation.isPending && (
        <div className="border border-yellow-400/30 bg-yellow-400/5 p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <FighterAvatarDiamond icon={Activity} variant="rft" size="lg" />
          </div>
          <h3 className="font-display text-3xl tracking-wider text-yellow-400 mb-2">COMECE AGORA</h3>
          <p className="text-sm text-white/50 mb-5 max-w-sm mx-auto">
            Carregue dados de exemplo para explorar todas as funcionalidades da plataforma.
          </p>
          <RftButton onClick={() => seedMutation.mutate()}>Carregar Dados</RftButton>
        </div>
      )}
    </div>
  );
}
