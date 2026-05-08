import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Clock, Calendar } from "lucide-react";

const TODAS = "Todas";

const horarios = [
  // MMA Profissional
  { modalidade: "MMA Profissional", dias: "Seg, Qua e Sex", hora: "10h", professor: "Prof. Márcio Cromado", cor: "#FFD700" },
  { modalidade: "MMA Profissional", dias: "Ter e Qui", hora: "9h30", professor: "Prof. Rafael Vinícius", cor: "#FFD700" },
  { modalidade: "MMA Profissional", dias: "Ter e Qui", hora: "10h30", professor: "Prof. Márcio Cromado", cor: "#FFD700" },
  { modalidade: "MMA Profissional", dias: "Quartas", hora: "9h", professor: "Prof. Rafael Vinícius", cor: "#FFD700" },
  // Luta Livre
  { modalidade: "Luta Livre", dias: "Seg, Qua e Sex", hora: "10h", professor: "Prof. Márcio Cromado", cor: "#FF3333" },
  { modalidade: "Luta Livre", dias: "Seg, Qua e Sex", hora: "19h", professor: "Prof. Márcio Cromado", cor: "#FF3333" },
  { modalidade: "Luta Livre", dias: "Ter e Qui", hora: "17h", professor: "Prof. Márcio Cromado", cor: "#FF3333" },
  // Muay Thai / Kickboxing
  { modalidade: "Muay Thai / Kickboxing", dias: "Seg, Qua e Sex", hora: "7h", professor: "Prof. José Vitor Lobão", cor: "#FFD700" },
  { modalidade: "Muay Thai / Kickboxing", dias: "Ter e Qui", hora: "12h", professor: "Prof. Cris Rick · turma especial R$200", cor: "#FFD700" },
  { modalidade: "Muay Thai / Kickboxing", dias: "Ter e Qui", hora: "18h", professor: "Prof. Caio Ítalo", cor: "#FFD700" },
  { modalidade: "Muay Thai / Kickboxing", dias: "Seg, Qua e Sex", hora: "20h", professor: "Prof. Rafael Vinícius", cor: "#FFD700" },
  // Boxe
  { modalidade: "Boxe", dias: "Ter e Qui", hora: "7h", professor: "Prof. Carlston Harris", cor: "#FF3333" },
  { modalidade: "Boxe", dias: "Ter e Qui", hora: "12h", professor: "Prof. Cris Rick · turma especial R$200", cor: "#FF3333" },
  { modalidade: "Boxe", dias: "Seg, Qua e Sex", hora: "19h", professor: "Prof. Cris Rick", cor: "#FF3333" },
  { modalidade: "Boxe", dias: "Ter e Qui", hora: "19h", professor: "Prof. Jefferson Todinho", cor: "#FF3333" },
  // Jiu-Jitsu
  { modalidade: "Jiu-Jitsu", dias: "Seg, Qua e Sex", hora: "7h", professor: "Prof. Bruno Grillu", cor: "#FF3333" },
  { modalidade: "Jiu-Jitsu", dias: "Ter e Qui", hora: "6h", professor: "Prof. Diego Batalha", cor: "#FF3333" },
  { modalidade: "Jiu-Jitsu", dias: "Ter e Qui", hora: "19h", professor: "Prof. Bruno Grillu", cor: "#FF3333" },
  { modalidade: "Jiu-Jitsu", dias: "Sábados", hora: "10h", professor: "Prof. Bruno Grillu", cor: "#FF3333" },
  // Jiu-Jitsu Kids
  { modalidade: "Jiu-Jitsu Kids", dias: "Ter e Qui", hora: "9h", professor: "Prof. Andressa Romero", cor: "#FFD700" },
  { modalidade: "Jiu-Jitsu Kids", dias: "Ter e Qui", hora: "18h", professor: "Prof. Andressa Romero", cor: "#FFD700" },
];

const modalidades = [TODAS, "MMA Profissional", "Luta Livre", "Muay Thai / Kickboxing", "Boxe", "Jiu-Jitsu", "Jiu-Jitsu Kids"];

export default function HorariosSection() {
  const [filtro, setFiltro] = useState(TODAS);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const filtered = filtro === TODAS ? horarios : horarios.filter((h) => h.modalidade === filtro);

  // Group by modalidade for display
  const grouped: Record<string, typeof horarios> = {};
  filtered.forEach((h) => {
    if (!grouped[h.modalidade]) grouped[h.modalidade] = [];
    grouped[h.modalidade].push(h);
  });

  return (
    <section id="horarios" className="py-24 bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-yellow-400" />
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">Grade Semanal</span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            HORÁRIOS
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Encontre o horário ideal para você. Temos aulas de manhã, tarde e noite.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {modalidades.map((m) => (
            <button
              key={m}
              onClick={() => setFiltro(m)}
              className="font-heading text-sm uppercase tracking-wider px-4 py-2 transition-all duration-300"
              style={{
                background: filtro === m ? "#FFD700" : "transparent",
                color: filtro === m ? "#000" : "rgba(255,255,255,0.6)",
                border: filtro === m ? "1px solid #FFD700" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: filtro === m ? "0 0 15px rgba(250,204,21,0.4)" : "none",
              }}
            >
              {m}
            </button>
          ))}
        </motion.div>

        {/* Schedule Grid */}
        <motion.div
          key={filtro}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {Object.entries(grouped).map(([modalidade, aulas], gi) => {
            const cor = gi % 2 === 0 ? "#FFD700" : "#FF3333";
            return (
              <motion.div
                key={modalidade}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: gi * 0.05 }}
                className="overflow-hidden"
                style={{
                  background: "oklch(0.14 0.01 250)",
                  border: `1px solid ${cor}25`,
                }}
              >
                {/* Modalidade Header */}
                <div
                  className="px-6 py-3 flex items-center gap-3"
                  style={{ background: `${cor}15`, borderBottom: `1px solid ${cor}25` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: cor, boxShadow: `0 0 8px ${cor}` }} />
                  <span className="font-heading font-bold text-base uppercase tracking-wider" style={{ color: cor }}>
                    {modalidade}
                  </span>
                </div>

                {/* Aulas */}
                <div className="divide-y divide-white/5">
                  {aulas.map((aula, i) => (
                    <div
                      key={i}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <Calendar size={14} className="text-white/40 flex-shrink-0" />
                        <span className="text-white/80 text-sm font-medium">{aula.dias}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <Clock size={14} className="text-white/40 flex-shrink-0" />
                        <span className="font-heading font-bold text-lg" style={{ color: cor }}>
                          {aula.hora}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full" style={{ background: `${cor}60` }} />
                        <span className="text-white/60 text-sm">{aula.professor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-white/40 text-sm mb-4">
            Não encontrou o horário ideal? Entre em contato e encontramos a melhor opção para você.
          </p>
          <a
            href="https://wa.me/5521975371903"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-yellow-400 text-black font-heading font-bold text-sm uppercase tracking-wider px-8 py-3 hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-300"
          >
            Falar no WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}
