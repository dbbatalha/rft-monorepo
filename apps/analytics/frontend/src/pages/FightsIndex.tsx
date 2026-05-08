import { trpc } from "@/lib/trpc";
import { staticTrpc } from "@/lib/data";
import { useLocation } from "wouter";
import { useState } from "react";
import { Swords, Search, ArrowLeft, ChevronRight } from "lucide-react";
import { Input } from "@rft/shared/ui/input";
import { Button } from "@rft/shared/ui/button";
import { Badge } from "@rft/shared/ui/badge";

const ORG_SHORT: Record<string, string> = {
  "UFC": "UFC",
  "ONE Championship": "ONE",
  "PFL": "PFL",
  "Jungle Fight": "Jungle",
  "RIZIN": "RIZIN",
  "LFA": "LFA",
  "Strikeforce": "SF",
  "Pride FC": "Pride",
  "WEC": "WEC",
  "KSW": "KSW",
  "Cage Warriors": "CW",
};

export default function FightsIndex() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: fighters = [], isLoading } = staticTrpc.fighters.listAlpha.useQuery();

  const filtered = fighters.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.nickname ?? "").toLowerCase().includes(q) ||
      (f.weightClass ?? "").toLowerCase().includes(q)
    );
  });

  const grouped: Record<string, typeof filtered> = {};
  for (const f of filtered) {
    const letter = f.name[0]?.toUpperCase() ?? "#";
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(f);
  }
  const letters = Object.keys(grouped).sort();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────── */}
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
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Swords className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Histórico de Lutas</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Carregando..." : `Selecione um atleta para ver o histórico completo de combates`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, apelido ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border focus:border-primary/40 h-10"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Loading skeleton ────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl shimmer" />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Swords className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum atleta encontrado para "{search}"</p>
          <button onClick={() => setSearch("")} className="text-xs text-primary mt-2 hover:underline">
            Limpar busca
          </button>
        </div>
      )}

      {/* ── Grouped list ────────────────────────────── */}
      {!isLoading &&
        letters.map((letter) => (
          <div key={letter}>
            {/* Letter header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-amber-400">{letter}</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground">{grouped[letter].length}</span>
            </div>

            {/* Fighter cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {grouped[letter].map((fighter) => {
                const initials = fighter.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <button
                    key={fighter.id}
                    onClick={() => setLocation(`/fights/${fighter.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-amber-500/30 hover:bg-card/80 transition-all text-left group"
                  >
                    {/* Initials avatar */}
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-amber-400">{initials}</span>
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm group-hover:text-amber-400 transition-colors truncate">
                        {fighter.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {fighter.nickname && (
                          <span className="text-[10px] text-muted-foreground truncate italic">
                            "{fighter.nickname}"
                          </span>
                        )}
                        {fighter.weightClass && (
                          <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground py-0 px-1.5 shrink-0">
                            {fighter.weightClass}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Record + Org */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-black text-sm">
                          <span className="text-green-400">{fighter.wins}</span>
                          <span className="text-muted-foreground/60">-</span>
                          <span className="text-red-400">{fighter.losses}</span>
                          {(fighter.draws ?? 0) > 0 && (
                            <span className="text-muted-foreground/60">-{fighter.draws}</span>
                          )}
                        </p>
                        {fighter.sourceOrg ? (
                          <p className="text-[10px] font-medium text-amber-400/80 truncate max-w-[80px]">
                            {ORG_SHORT[fighter.sourceOrg] ?? fighter.sourceOrg}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">UFC</p>
                        )}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
