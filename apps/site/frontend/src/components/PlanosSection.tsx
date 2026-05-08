import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Crown, Percent, MessageCircle, Package, Layers } from "lucide-react";
import { asset } from "@/lib/url";

const WHATSAPP_NUMBER = "5521975371903";

type Pacote = {
  id: string;
  nome: string;
  badges: string[];
  valor: string;
  destaque?: string;
};

const pacotesFechados: Pacote[] = [
  {
    id: "grappling",
    nome: "Pacote Grappling",
    badges: ["LL Livre", "JJ Livre"],
    valor: "R$ 550",
    destaque: "LL + JJ liberados",
  },
  {
    id: "strike",
    nome: "Pacote Strike",
    badges: ["Boxe Livre", "Muay Thai Livre"],
    valor: "R$ 500",
    destaque: "Boxe + Muay Thai liberados",
  },
  {
    id: "grappling-strike",
    nome: "Grappling + Strike",
    badges: ["JJ Livre", "LL Livre", "Boxe Livre", "Muay Thai Livre"],
    valor: "R$ 650",
    destaque: "Pacote completo — todas as modalidades liberadas",
  },
];

const pacotesCombinados: Pacote[] = [
  { id: "p1", nome: "Pacote 1", badges: ["Luta Livre — Livre", "Strike 2×/sem"], valor: "R$ 550" },
  { id: "p2", nome: "Pacote 2", badges: ["Luta Livre — Livre", "Strike 3×/sem"], valor: "R$ 585" },
  { id: "p3", nome: "Pacote 3", badges: ["Strike 2×/sem", "JJ 3×/sem"], valor: "R$ 485" },
  { id: "p4", nome: "Pacote 4", badges: ["Strike 2×/sem", "JJ 2×/sem"], valor: "R$ 460" },
  { id: "p5", nome: "Pacote 5", badges: ["Strike 3×/sem", "JJ 3×/sem"], valor: "R$ 515" },
  { id: "p6", nome: "Pacote 6", badges: ["Strike 3×/sem", "JJ 2×/sem"], valor: "R$ 490" },
];

function whatsappLink(pacote: Pacote) {
  const msg =
    `Olá! Tenho interesse no ${pacote.nome} (${pacote.badges.join(" + ")}) — ${pacote.valor}/mês. ` +
    `Pode me passar mais informações?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

const tabela = [
  {
    grupo: "Luta Livre",
    cor: "#FFD700",
    linhas: [
      { plano: "Valor único — todos os horários", preco: "R$ 375" },
    ],
  },
  {
    grupo: "Muay Thai / Boxe",
    cor: "#FF3333",
    linhas: [
      { plano: "2x por semana", preco: "R$ 240" },
      { plano: "3x por semana", preco: "R$ 275" },
      { plano: "Livre (todos os horários da modalidade)", preco: "R$ 350" },
    ],
  },
  {
    grupo: "Jiu-Jitsu",
    cor: "#FFD700",
    linhas: [
      { plano: "2x por semana", preco: "R$ 275" },
      { plano: "3x por semana", preco: "R$ 300" },
      { plano: "Livre (todos os horários da modalidade)", preco: "R$ 350" },
    ],
  },
  {
    grupo: "Jiu-Jitsu Kids",
    cor: "#FF3333",
    linhas: [
      { plano: "2x por semana", preco: "R$ 240" },
    ],
  },
];

const destaques = [
  {
    icon: Crown,
    titulo: "Acesso Total RFT",
    valor: "R$ 600",
    desc: "Todas as modalidades, todos os horários, plano livre completo.",
    cor: "#FFD700",
  },
  {
    icon: Percent,
    titulo: "Turma Especial 12h",
    valor: "R$ 200",
    desc: "Turmas do Prof. Cris Rick às 12h, somente Terças e Quintas — Boxe e Muay Thai com preço especial.",
    cor: "#FF3333",
  },
];

const regras = [
  "O aluno deve escolher uma turma específica para treinar.",
  "Para treinar a mesma modalidade com professores diferentes, é necessário optar pelo plano Livre.",
  "Combo de mais de uma modalidade: 10% de desconto sobre a soma dos planos.",
  "Plano família (pais e filhos, marido e mulher): 10% de desconto.",
];

export default function PlanosSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const scrollToContact = () => {
    document.querySelector("#contato")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="planos"
      className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #000 0%, #0a0500 50%, #000 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-yellow-400" />
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">
              Investimento
            </span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            PLANOS E{" "}
            <span style={{ color: "#FFD700", textShadow: "0 0 30px rgba(250,204,21,0.5)" }}>
              PREÇOS
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Tabela de valores por modalidade. Combinações com desconto e plano família disponíveis.
          </p>
        </motion.div>

        {/* Tabela por modalidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {tabela.map((g, i) => (
            <motion.div
              key={g.grupo}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative overflow-hidden"
              style={{
                background: "oklch(0.14 0.01 250)",
                border: `1px solid ${g.cor}30`,
              }}
            >
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ background: `${g.cor}10`, borderBottom: `1px solid ${g.cor}30` }}
              >
                <h3 className="font-display text-2xl tracking-wider text-white">{g.grupo}</h3>
                <div className="h-2 w-2" style={{ background: g.cor }} />
              </div>
              <div className="divide-y divide-white/5">
                {g.linhas.map((l) => (
                  <div
                    key={l.plano}
                    className="px-6 py-4 flex items-center justify-between gap-4"
                  >
                    <span className="text-white/70 text-sm">{l.plano}</span>
                    <span
                      className="font-display text-2xl tracking-wider"
                      style={{ color: g.cor }}
                    >
                      {l.preco}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="absolute bottom-0 left-0 h-0.5 w-full"
                style={{ background: `linear-gradient(90deg, ${g.cor}, transparent)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* Destaques: Total RFT + Turma especial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {destaques.map((d, i) => (
            <motion.div
              key={d.titulo}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="relative p-8 overflow-hidden"
              style={{
                background:
                  d.cor === "#FFD700"
                    ? "linear-gradient(135deg, #1a1500 0%, #000 100%)"
                    : "linear-gradient(135deg, #1a0000 0%, #000 100%)",
                border: `2px solid ${d.cor}`,
                boxShadow: `0 0 30px ${d.cor}30`,
              }}
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rotate-45 flex items-center justify-center shrink-0 bg-yellow-400 border-2 border-black rounded-md">
                  <d.icon size={26} className="-rotate-45 text-black" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <div
                    className="font-heading text-xs uppercase tracking-[0.3em] mb-2"
                    style={{ color: d.cor }}
                  >
                    {d.titulo}
                  </div>
                  <div
                    className="font-display text-5xl tracking-wider mb-2"
                    style={{ color: "#fff", textShadow: `0 0 20px ${d.cor}40` }}
                  >
                    {d.valor}
                    <span className="text-white/40 text-base ml-2">/mês</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{d.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Pacotes Fechados ───────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Package size={18} className="text-yellow-400" />
            <h3 className="font-heading text-yellow-400 text-sm uppercase tracking-[0.3em]">
              Pacotes Fechados
            </h3>
            <div className="h-px flex-1 bg-yellow-400/20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pacotesFechados.map((p, i) => {
              const isYellow = i % 2 === 0;
              const accent = isYellow ? "#FFD700" : "#FF3333";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="relative p-6 flex flex-col overflow-hidden group"
                  style={{
                    background: isYellow
                      ? "linear-gradient(135deg, #1a1500 0%, #000 100%)"
                      : "linear-gradient(135deg, #1a0000 0%, #000 100%)",
                    border: `2px solid ${accent}`,
                    boxShadow: `0 0 30px ${accent}20`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={asset("/imagens/rft-losango.png")}
                      alt="RFT"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <h4
                      className="font-display text-2xl tracking-wider text-white leading-tight"
                      style={{ textShadow: `0 0 20px ${accent}40` }}
                    >
                      {p.nome}
                    </h4>
                  </div>

                  {p.destaque && (
                    <p className="text-white/60 text-sm mb-4">{p.destaque}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-5">
                    {p.badges.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] font-heading uppercase tracking-widest px-2 py-1"
                        style={{ color: accent, border: `1px solid ${accent}40`, background: `${accent}10` }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <div
                      className="font-display text-4xl tracking-wider mb-4"
                      style={{ color: accent, textShadow: `0 0 20px ${accent}40` }}
                    >
                      {p.valor}
                      <span className="text-white/40 text-sm ml-2 font-inter tracking-normal">/mês</span>
                    </div>
                    <a
                      href={whatsappLink(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-heading font-bold text-xs uppercase tracking-[0.2em] py-3 transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                    >
                      <MessageCircle size={14} />
                      Falar no WhatsApp
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Pacotes Combinados ─────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Layers size={18} className="text-yellow-400" />
            <h3 className="font-heading text-yellow-400 text-sm uppercase tracking-[0.3em]">
              Pacotes Combinados
            </h3>
            <div className="h-px flex-1 bg-yellow-400/20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pacotesCombinados.map((p, i) => {
              const accent = i % 2 === 0 ? "#FFD700" : "#FF3333";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.05 }}
                  className="relative p-5 flex flex-col overflow-hidden"
                  style={{
                    background: "oklch(0.14 0.01 250)",
                    border: `1px solid ${accent}40`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                  />
                  <div className="flex items-center justify-between mb-3">
                    <h4
                      className="font-display text-xl tracking-wider"
                      style={{ color: accent }}
                    >
                      {p.nome}
                    </h4>
                    <div
                      className="w-3 h-3 rotate-45"
                      style={{ background: accent }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.badges.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] font-heading uppercase tracking-widest px-2 py-0.5 text-white/70 border border-white/15"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-end justify-between mt-auto gap-3">
                    <div
                      className="font-display text-3xl tracking-wider leading-none"
                      style={{ color: accent }}
                    >
                      {p.valor}
                      <span className="text-white/40 text-xs ml-1 font-inter tracking-normal">/mês</span>
                    </div>
                    <a
                      href={whatsappLink(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Falar no WhatsApp sobre ${p.nome}`}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white font-heading font-bold text-[10px] uppercase tracking-widest px-3 py-2 transition-all shrink-0"
                    >
                      <MessageCircle size={12} />
                      WhatsApp
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="text-white/30 text-xs mt-4 text-center">
            * Pacotes combinados exigem turma fixa para Strike e/ou Jiu-Jitsu.
          </p>
        </div>

        {/* Aulas Particulares — fallback de horário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55 }}
          className="relative overflow-hidden mt-12 mb-12"
          style={{
            background: "linear-gradient(135deg, oklch(0.14 0.01 250), #000000)",
            border: "1px solid rgba(255,215,0,0.35)",
            boxShadow: "0 0 30px rgba(255,215,0,0.10)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(255,215,0,0.5) 12px, rgba(255,215,0,0.5) 13px)",
            }}
          />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5">
            <div
              className="w-14 h-14 shrink-0 bg-yellow-400 border-2 border-black rotate-45 flex items-center justify-center"
            >
              <span className="-rotate-45 text-black font-display text-lg font-bold tracking-wider">1:1</span>
            </div>
            <div className="flex-1">
              <div className="text-yellow-400 font-heading text-xs uppercase tracking-[0.3em] mb-2">
                Não achou um horário que cabe?
              </div>
              <h3 className="font-display text-2xl md:text-3xl text-white tracking-wider mb-2">
                AULAS PARTICULARES
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Caso nenhum dos horários da grade funcione para você, oferecemos
                <span className="text-yellow-400"> aulas particulares</span> com qualquer um dos professores
                — a combinação de horário, frequência e valor é feita diretamente entre você, o professor e a
                academia. Ideal para atletas em preparação, alunos com agenda apertada ou quem busca atenção
                individualizada.
              </p>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                "Olá! Tenho interesse em aulas particulares na RFT. Pode me passar os detalhes?"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 bg-yellow-400 text-black font-heading font-bold text-xs uppercase tracking-[0.25em] px-5 py-3 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all"
            >
              Falar com a equipe
            </a>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <button
            onClick={scrollToContact}
            className="bg-yellow-400 text-black font-heading font-bold text-sm uppercase tracking-[0.3em] px-10 py-4 hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-all duration-300"
          >
            Montar meu plano
          </button>
          <div className="text-white/30 text-xs mt-4 space-y-1">
            <p>Primeira aula experimental gratuita — fale com a equipe para combinações personalizadas.</p>
            {regras.map((r) => (
              <p key={r}>* {r}</p>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
