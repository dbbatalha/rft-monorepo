import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { getFlagEmoji } from "@rft/shared/flagEmoji";
import { useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Badge } from "@rft/shared/ui/badge";
import { Button } from "@rft/shared/ui/button";
import { Trophy, Crown, ArrowLeft, Building2 } from "lucide-react";
import { FighterAvatarDiamond } from "@rft/shared/FighterAvatarDiamond";
import { translateWeightClass, weightClassTooltip } from "@rft/shared/weightClasses";

const CLASS_COLORS: Record<string, string> = {
  "Flyweight": "from-sky-500/20 to-sky-600/10",
  "Bantamweight": "from-teal-500/20 to-teal-600/10",
  "Featherweight": "from-indigo-500/20 to-indigo-600/10",
  "Lightweight": "from-violet-500/20 to-violet-600/10",
  "Welterweight": "from-purple-500/20 to-purple-600/10",
  "Middleweight": "from-fuchsia-500/20 to-fuchsia-600/10",
  "Light Heavyweight": "from-rose-500/20 to-rose-600/10",
  "Heavyweight": "from-orange-500/20 to-orange-600/10",
  "Women's Strawweight": "from-pink-500/20 to-pink-600/10",
  "Women's Flyweight": "from-pink-400/20 to-pink-500/10",
  "Women's Bantamweight": "from-rose-400/20 to-rose-500/10",
  "Women's Featherweight": "from-orange-400/20 to-orange-500/10",
};

export default function Rankings() {
  const [, setLocation] = useLocation();
  const [selectedOrg, setSelectedOrg] = useState<string>("UFC");

  const { data: orgs = [], isLoading: orgsLoading } = staticTrpc.dashboard.organizations.useQuery();
  const { data: rankingOrgsArr = [] } = staticTrpc.dashboard.rankingOrganizations.useQuery();
  const rankingOrgsSet = new Set((rankingOrgsArr as string[]).map((o) => o.toLowerCase()));
  const { data: rankings = [], isLoading: rankingsLoading } =
    staticTrpc.fighters.rankings.useQuery({ org: selectedOrg });

  const isLoading = orgsLoading || rankingsLoading;

  // Dedupe orgs by name and prefer ones with data
  const SHORT_OVERRIDE: Record<string, string> = {
    "Jungle Fight": "Jungle Fight",
    "Centurion": "Centurion",
    "Centurion Fight Union": "Centurion",
    "JF": "Jungle Fight",
    "CFU": "Centurion",
  };
  const ORG_ORDER = ["UFC", "Jungle Fight", "LFA", "ONE Championship", "ONE", "PFL", "Samurai"];
  const orgRank = (name: string) => {
    const i = ORG_ORDER.findIndex((o) => o.toLowerCase() === name.toLowerCase());
    return i === -1 ? 999 : i;
  };
  const orgList = (orgs as { name: string; shortName: string | null }[])
    .filter((o) => rankingOrgsSet.size === 0 || rankingOrgsSet.has(o.name.toLowerCase()))
    .map((o) => ({
      ...o,
      shortName: SHORT_OVERRIDE[o.name] ?? SHORT_OVERRIDE[o.shortName ?? ""] ?? o.shortName,
    }))
    .sort((a, b) => {
      const ra = orgRank(a.name);
      const rb = orgRank(b.name);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

  // Infinite scroll — 6 weight-class cards per batch, reset when org changes
  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll(rankings.length, 6, selectedOrg);
  const visibleRankings = rankings.slice(0, visibleCount);

  const header = (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-500 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
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
            <FighterAvatarDiamond icon={Trophy} variant="rft" size="md" />
            <h1 className="text-xl font-black tracking-tight text-foreground">Rankings por Organização</h1>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {header}

      {/* Org selector */}
      <div className="flex flex-wrap gap-2">
        {orgsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full shimmer" />
          ))
        ) : (
          orgList.map((org) => (
            <button
              key={org.name}
              onClick={() => setSelectedOrg(org.name)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedOrg === org.name
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-card border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
              }`}
            >
              <Building2 className="h-3 w-3" />
              {org.shortName ?? org.name}
            </button>
          ))
        )}
      </div>

      {/* Rankings grid */}
      {rankingsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleRankings.map(({ weightClass, fighters }: { weightClass: string; fighters: any[] }) => {
            const gradient = CLASS_COLORS[weightClass] || "from-gray-500/20 to-gray-600/10";
            const champion = fighters.find((f: any) => f.isChampion === 1);
            const interim  = fighters.find((f: any) => f.isInterim === 1);
            const ranked   = fighters.filter((f: any) => f.rank >= 1).sort((a: any, b: any) => a.rank - b.rank);
            const isEmpty  = fighters.length === 0;

            const FighterRow = ({ f, label }: { f: any; label: React.ReactNode }) => {
              const inner = (
                <div className="flex items-center gap-3 w-full">
                  {label}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground truncate text-sm">{f.name}</p>
                      {getFlagEmoji(f.nationality) && (
                        <span title={f.nationality} className="text-sm leading-none shrink-0">{getFlagEmoji(f.nationality)}</span>
                      )}
                    </div>
                    {f.nickname && (
                      <p className="text-[10px] text-muted-foreground">"{f.nickname}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {f.wins != null ? (
                      <p className="text-sm font-semibold text-foreground">
                        {f.wins}W-{f.losses}L{(f.draws ?? 0) > 0 ? `-${f.draws}D` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50">—</p>
                    )}
                    {f.winRate != null && (
                      <p className="text-[10px] text-muted-foreground">
                        {(f.winRate * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              );
              return f.id ? (
                <button
                  onClick={() => setLocation(`/fighter/${f.id}`)}
                  className="w-full px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors text-left"
                >
                  {inner}
                </button>
              ) : (
                <div className="w-full px-4 py-2.5 border-b border-border/50 last:border-0 text-left">
                  {inner}
                </div>
              );
            };

            return (
              <Card key={weightClass} className="border-border bg-card overflow-hidden">
                <CardHeader className={`pb-3 bg-gradient-to-r ${gradient}`}>
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground" title={weightClassTooltip(weightClass)}>
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    {translateWeightClass(weightClass)}
                    <Badge variant="outline" className="ml-auto text-xs border-border text-muted-foreground">
                      {ranked.length > 0 ? `Top ${ranked.length}` : "sem dados"}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  {isEmpty ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                      Sem dados para esta divisão
                    </div>
                  ) : (
                    <>
                      {/* Campeão */}
                      {champion && (
                        <div className="border-b border-yellow-500/20">
                          {champion.id ? (
                            <button
                              onClick={() => setLocation(`/fighter/${champion.id}`)}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors text-left"
                            >
                              <div
                                title="Campeão"
                                className="flex items-center justify-center w-7 h-7 rotate-45 rounded-md bg-yellow-400 border border-yellow-500 shrink-0"
                              >
                                <Crown className="h-3.5 w-3.5 text-black -rotate-45" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-foreground truncate">{champion.name}</p>
                                  {getFlagEmoji(champion.nationality) && (
                                    <span title={champion.nationality} className="text-sm leading-none shrink-0">{getFlagEmoji(champion.nationality)}</span>
                                  )}
                                  <Badge className="text-[9px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 py-0 px-1 shrink-0">
                                    CAMPEÃO
                                  </Badge>
                                </div>
                                {champion.nickname && <p className="text-xs text-muted-foreground">"{champion.nickname}"</p>}
                              </div>
                              <div className="text-right shrink-0">
                                {champion.wins != null && (
                                  <p className="text-sm font-bold text-yellow-400">
                                    {champion.wins}W-{champion.losses}L{(champion.draws ?? 0) > 0 ? `-${champion.draws}D` : ""}
                                  </p>
                                )}
                                {champion.winRate != null && (
                                  <p className="text-xs text-muted-foreground">{(champion.winRate * 100).toFixed(1)}%</p>
                                )}
                              </div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10">
                              <div
                                title="Campeão"
                                className="flex items-center justify-center w-7 h-7 rotate-45 rounded-md bg-yellow-400 border border-yellow-500 shrink-0"
                              >
                                <Crown className="h-3.5 w-3.5 text-black -rotate-45" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-foreground">{champion.name}</p>
                                  {getFlagEmoji(champion.nationality) && (
                                    <span title={champion.nationality} className="text-sm leading-none shrink-0">{getFlagEmoji(champion.nationality)}</span>
                                  )}
                                  <Badge className="text-[9px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 py-0 px-1">CAMPEÃO</Badge>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Interino */}
                          {interim && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-orange-500/5 border-t border-orange-500/10">
                              <div
                                title="Campeão Interino"
                                className="flex items-center justify-center w-7 h-7 rotate-45 rounded-md bg-orange-400 border border-orange-500 shrink-0"
                              >
                                <Crown className="h-3 w-3 text-black -rotate-45" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-foreground truncate">{interim.name}</p>
                                  {getFlagEmoji(interim.nationality) && (
                                    <span title={interim.nationality} className="text-sm leading-none shrink-0">{getFlagEmoji(interim.nationality)}</span>
                                  )}
                                  <Badge className="text-[9px] bg-orange-500/15 text-orange-400 border-orange-500/25 py-0 px-1 shrink-0">
                                    INTERINO
                                  </Badge>
                                </div>
                              </div>
                              {interim.wins != null && (
                                <p className="text-sm text-orange-400 shrink-0">{interim.wins}W-{interim.losses}L</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rankeados #1–#15 */}
                      <div>
                        {ranked.map((fighter: any) => (
                          <FighterRow
                            key={fighter.name}
                            f={fighter}
                            label={
                              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-muted-foreground">#{fighter.rank}</span>
                              </div>
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sentinel */}
      {!isLoading && (
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
