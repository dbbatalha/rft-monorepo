import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { asset } from "@/lib/url";

const modalidades = [
  {
    id: "mma",
    nome: "MMA Profissional",
    descricao: "Artes marciais mistas com treinamento de alto nível. Técnicas de striking, grappling e wrestling integradas.",
    cor: "#FFD700",
    flyer: asset("/imagens/flyer/47b4bc80-44c1-11f1-93cd-1bbb4d4c542c.jpg"),
    professores: ["Prof. Márcio Cromado", "Prof. Rafael Vinícius"],
    horarios: "Seg/Qua/Sex 10h | Ter/Qui 9:30h e 10:30h",
    plano: "A combinar",
    destaque: true,
  },
  {
    id: "luta-livre",
    nome: "Luta Livre",
    descricao: "A luta livre brasileira. Técnicas de wrestling, quedas e finalizações sem kimono.",
    cor: "#FF3333",
    flyer: asset("/imagens/flyer/47b4bc80-44c1-11f1-93cd-1bbb4d4c542c.jpg"),
    professores: ["Prof. Márcio Cromado"],
    horarios: "Seg/Qua/Sex 10h e 19h | Ter/Qui 17h",
    plano: "Valor único — R$375 (todos os horários)",
    destaque: false,
  },
  {
    id: "muay-thai",
    nome: "Muay Thai / Kickboxing",
    descricao: "A arte das oito armas. Socos, chutes, joelhadas e cotoveladas para defesa pessoal e competição.",
    cor: "#FFD700",
    flyer: asset("/imagens/flyer/47b4bc80-44c1-11f1-93cd-1bbb4d4c542c.jpg"),
    professores: ["Prof. José Vitor Lobão", "Prof. Cris Rick (12h)", "Prof. Rafael Vinícius", "Prof. Caio Ítalo"],
    horarios: "Seg/Qua/Sex 7h e 20h | Ter/Qui 12h e 18h",
    plano: "2x R$240 · 3x R$275 · Livre R$350",
    destaque: false,
  },
  {
    id: "boxe",
    nome: "Boxe",
    descricao: "A arte nobre do boxe com professores experientes. Técnica, condicionamento e sparring.",
    cor: "#FF3333",
    flyer: asset("/imagens/flyer/47b4bc80-44c1-11f1-93cd-1bbb4d4c542c.jpg"),
    professores: ["Prof. Cris Rick", "Prof. Carlston Harris", "Prof. Jefferson Todinho"],
    horarios: "Seg/Qua/Sex 19h | Ter/Qui 7h, 12h e 19h",
    plano: "2x R$240 · 3x R$275 · Livre R$350",
    destaque: false,
  },
  {
    id: "jiu-jitsu",
    nome: "Jiu-Jitsu",
    descricao: "A arte suave que domina o chão. Técnicas de finalização, imobilização e defesa pessoal.",
    cor: "#FFD700",
    flyer: asset("/imagens/flyer/47b4bc80-44c1-11f1-93cd-1bbb4d4c542c.jpg"),
    professores: ["Prof. Bruno Grillu", "Prof. Diego Batalha"],
    horarios: "Seg/Qua/Sex 7h | Ter/Qui 6h e 19h | Sáb 10h",
    plano: "2x R$275 · 3x R$300 · Livre R$350",
    destaque: false,
  },
  {
    id: "jiu-jitsu-kids",
    nome: "Jiu-Jitsu Kids",
    descricao: "Programa especial para crianças. Disciplina, respeito e autoconfiança através das artes marciais.",
    cor: "#FF3333",
    flyer: asset("/imagens/flyer/47b4bc80-44c1-11f1-93cd-1bbb4d4c542c.jpg"),
    professores: ["Prof. Andressa Romero"],
    horarios: "Ter/Qui 9h e 18h",
    plano: "2x na semana — R$240",
    destaque: false,
  },
];

function ModalidadeCard({ mod, index }: { mod: typeof modalidades[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const scrollToContact = () => {
    document.querySelector("#contato")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-pointer overflow-hidden"
      style={{
        background: "oklch(0.14 0.01 250)",
        border: `1px solid ${hovered ? mod.cor + "60" : "oklch(0.22 0.01 250)"}`,
        boxShadow: hovered ? `0 0 20px ${mod.cor}30, 0 8px 30px rgba(0,0,0,0.5)` : "none",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      {/* Flyer Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={mod.flyer}
          alt={mod.nome}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Destaque badge */}
        {mod.destaque && (
          <div className="absolute top-3 right-3 bg-yellow-400 text-black font-heading font-bold text-xs uppercase px-3 py-1 tracking-wider">
            Destaque
          </div>
        )}

        {/* Modalidade name overlay */}
        <div className="absolute bottom-3 left-4">
          <h3 className="font-display text-2xl text-white leading-none"
            style={{ textShadow: `0 0 20px ${mod.cor}80` }}
          >
            {mod.nome}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-white/60 text-sm leading-relaxed mb-4">{mod.descricao}</p>

        {/* Professores */}
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: mod.cor }}>
            Professores
          </div>
          <div className="flex flex-wrap gap-1">
            {mod.professores.map((p) => (
              <span key={p} className="text-white/70 text-xs bg-white/5 px-2 py-0.5 border border-white/10">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Horários */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: mod.cor }}>
            Horários
          </div>
          <div className="text-white/60 text-xs">{mod.horarios}</div>
        </div>

        {/* Plano */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-0.5">A partir de</div>
            <div className="font-heading font-bold text-lg" style={{ color: mod.cor }}>
              {mod.plano}
            </div>
          </div>
          <button
            onClick={scrollToContact}
            className="flex items-center gap-1 text-xs font-heading uppercase tracking-wider px-4 py-2 transition-all duration-300"
            style={{
              border: `1px solid ${mod.cor}60`,
              color: mod.cor,
              background: hovered ? `${mod.cor}15` : "transparent",
            }}
          >
            Inscrever <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
        style={{
          width: hovered ? "100%" : "0%",
          background: mod.cor,
          boxShadow: `0 0 10px ${mod.cor}`,
        }}
      />
    </motion.div>
  );
}

export default function ModalidadesSection() {
  const titleRef = useRef(null);
  const titleInView = useInView(titleRef, { once: true });

  return (
    <section id="modalidades" className="py-24 bg-black relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 10px, oklch(0.84 0.18 95 / 0.5) 10px, oklch(0.84 0.18 95 / 0.5) 11px)`,
      }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        {/* Section Header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-yellow-400" />
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">
              Nossas Artes
            </span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            MODALIDADES
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Escolha sua arte marcial e comece sua transformação. Temos a modalidade certa para cada objetivo.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modalidades.map((mod, i) => (
            <ModalidadeCard key={mod.id} mod={mod} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
