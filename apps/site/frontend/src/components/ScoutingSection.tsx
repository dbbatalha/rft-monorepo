import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BarChart3, Target, Trophy, Brain, ChevronRight } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Scouting de Adversários",
    desc: "Análise técnica e tática profunda. Pontos fortes, fracos e plano de jogo personalizado.",
  },
  {
    icon: BarChart3,
    title: "Estatísticas Avançadas",
    desc: "Per-fight strikes, takedowns, controle, golpes por região do corpo. Dados do UFC/LFA.",
  },
  {
    icon: Brain,
    title: "Preditor com IA",
    desc: "Modelo de machine learning treinado em milhares de lutas. Probabilidades + odds.",
  },
  {
    icon: Trophy,
    title: "Rankings Oficiais",
    desc: "Rankings UFC oficiais por categoria + base de campeões e desafiantes.",
  },
];

export default function ScoutingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="scouting"
      className="py-24 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #000000 100%)",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

      {/* Yellow diagonal accent */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 20px, #FFD700 20px, #FFD700 21px)",
      }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-yellow-400" />
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">
              MMA Analytics by RFT
            </span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            SERVIÇOS DE{" "}
            <span
              style={{
                color: "#FFD700",
                textShadow: "0 0 30px rgba(250,204,21,0.5)",
              }}
            >
              SCOUTING
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Plataforma de análise e inteligência para atletas, treinadores e managers de MMA.
            Tecnologia de ponta direto da RFT.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              className="relative p-6 group"
              style={{
                background: "oklch(0.14 0.01 250)",
                border: "1px solid rgba(255,215,0,0.2)",
              }}
            >
              <div className="w-12 h-12 rotate-45 flex items-center justify-center mb-6 ml-1 bg-yellow-400 border-2 border-black rounded-md">
                <f.icon size={22} className="-rotate-45 text-black" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-xl text-white mb-2 tracking-wide">
                {f.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              <div
                className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500"
                style={{ background: "linear-gradient(90deg, #FFD700, transparent)" }}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <a
            href={`${import.meta.env.BASE_URL}analytics/`}
            className="inline-flex items-center gap-3 px-8 py-4 font-heading uppercase tracking-widest text-black transition-all hover:gap-5"
            style={{
              background: "#FFD700",
              boxShadow: "0 0 30px rgba(255,215,0,0.3)",
            }}
          >
            Acessar MMA Analytics
            <ChevronRight size={20} />
          </a>
          <p className="text-white/40 text-xs mt-4 tracking-wider">
            Plataforma completa · Atletas · Lutas · Predições · Rankings
          </p>
        </motion.div>
      </div>
    </section>
  );
}
