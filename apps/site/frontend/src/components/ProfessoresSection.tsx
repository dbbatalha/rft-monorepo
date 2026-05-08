import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Award, Star, Shield, Trophy, Instagram, Twitter, ChevronLeft, ChevronRight, Bath, Wind, Dumbbell, GraduationCap } from "lucide-react";
import { rftAthleteLink, RFT_SOCIALS } from "@rft/shared/rftAthletes";
import { asset } from "@/lib/url";

const TEAM_PHOTO_1 = asset("/imagens/luta-livre/turma_lle.jpeg");
const BJJ_PHOTO = asset("/imagens/jiu-jitsu/turma_bruno.jpeg");
const BOXING_PHOTO = asset("/imagens/cromado/cromado_1.jpg");
const BRUNO_PHOTO = asset("/imagens/bruno/bruno_1.jpg");

const ATHLETE_ORDER = [1, 2, 3, 4, 13, 14, 15, 5, 6, 7, 8, 9, 10, 11, 12];
const athletePhotos = ATHLETE_ORDER.map((n) =>
  asset(`/imagens/atletas/atleta_${String(n).padStart(2, "0")}.jpeg`)
);

const academiaFeatures = [
  {
    icon: Wind,
    title: "Espaço amplo e arejado",
    desc: "Tatame extenso, ventilado e bem iluminado, mesmo com as turmas mais cheias, sem perder conforto.",
  },
  {
    icon: Dumbbell,
    title: "Equipamentos de primeira linha",
    desc: "Sacos pesados, focos, manoplas, luvas de boxe, ataduras, cordas, halteres, anilhas e peso livre — tudo o que você precisa pra treinar como atleta profissional.",
  },
  {
    icon: Bath,
    title: "Estrutura completa: cantina, vestiários e descanso",
    desc: "Cantina dentro da academia, dois vestiários (masculino e feminino) com banheiro integrado e área de descanso — você se hidrata, come algo e cuida do pós-treino sem sair do espaço.",
  },
  {
    icon: GraduationCap,
    title: "Professores que competem",
    desc: "A maioria dos coaches da RFT são atletas reais, com cartel ativo e didática refinada — você aprende com quem ainda sobe pra lutar.",
  },
];

const headCoaches = [
  {
    nome: "Prof. Márcio Cromado",
    titulo: "Head Coach de MMA & Luta Livre / NO GI",
    descricao:
      "Referência internacional no MMA, Márcio Cromado é o principal coach da RFT. Com vasta experiência em competições de alto nível, formou campeões e guia atletas profissionais rumo ao topo.",
    conquistas: ["Head Coach MMA", "Luta Livre / NO GI Expert", "Formador de Campeões"],
    cor: "#FFD700",
    foto: BOXING_PHOTO,
  },
  {
    nome: "Prof. Bruno Grillu",
    titulo: "Head Coach de Jiu-Jitsu",
    descricao:
      "Faixa-preta competidor e referência no Jiu-Jitsu na RFT. Bruno Grillu lidera as aulas de jiu-jitsu da academia, formando alunos do iniciante ao competidor de alto nível com técnica refinada e didática apurada.",
    conquistas: ["Head Coach Jiu-Jitsu", "Faixa-Preta", "Competidor Internacional"],
    cor: "#FFD700",
    foto: BRUNO_PHOTO,
  },
];

const organizacoes = [
  { sigla: "UFC", cor: "#FFD700", atletas: ["Carlston Lindsay Harris"] },
  { sigla: "LFA", cor: "#FF3333", atletas: ["Jefferson Nascimento"] },
  { sigla: "Centurion", cor: "#FFD700", atletas: ["Caio Italo"] },
  { sigla: "Jungle Fight", cor: "#FF3333", atletas: ["Brena Cardoso", "Yasmim Guimarães"] },
  { sigla: "Invicta", cor: "#FFD700", atletas: ["Andressa Romero"] },
  { sigla: "MAC", cor: "#FF3333", atletas: ["Raiane Vinuto"] },
  { sigla: "FFC", cor: "#FFD700", atletas: ["Walleska Karoline"] },
];

export default function ProfessoresSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const galleryRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="professores"
      className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #000000 0%, #0d0d00 50%, #000000 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-px w-12 bg-yellow-400" />
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">
              Prova de Sucesso
            </span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            TREINE COM{" "}
            <span style={{ color: "#FFD700", textShadow: "0 0 30px rgba(250,204,21,0.5)" }}>
              CAMPEÕES
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Atletas profissionais da RFT em ação no UFC, LFA, Centurion, Jungle Fight, Invicta, MAC e FFC.
            Quando você treina aqui, está no mesmo tatame que os melhores.
          </p>
        </motion.div>

        {/* UFC Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative mb-12 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1500, #0d0d00)",
            border: "1px solid rgba(255,215,0,0.4)",
            boxShadow: "0 0 30px rgba(250,204,21,0.15)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,215,0,0.4) 10px, rgba(255,215,0,0.4) 11px)",
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-yellow-400 border-2 border-black rounded-md rotate-45 flex items-center justify-center">
                <span className="text-black font-display text-lg -rotate-45 font-bold tracking-wider italic">UFC</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em] mb-2">
                Nível Mundial
              </div>
              <h3 className="font-display text-3xl md:text-4xl text-white mb-2">
                ATLETAS DO UFC NA RFT
              </h3>
              <p className="text-white/60 text-base max-w-2xl">
                A Renovação Fight Team é reconhecida por formar e abrigar atletas que competem no UFC —
                o maior evento de MMA do planeta. Treinar aqui significa estar no mesmo tatame que os melhores do mundo.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Head Coaches — Cromado (MMA / Luta Livre / NO GI) + Bruno Grillu (Jiu-Jitsu) */}
        <div className="space-y-8 mb-12">
          {headCoaches.map((coach, idx) => (
            <motion.div
              key={coach.nome}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + idx * 0.1 }}
              className="relative overflow-hidden group"
              style={{
                background: "oklch(0.14 0.01 250)",
                border: `2px solid ${coach.cor}40`,
                boxShadow: `0 0 30px ${coach.cor}10`,
              }}
            >
              <div className="relative w-full h-[520px] md:h-[680px] overflow-hidden">
                <img
                  src={coach.foto}
                  alt={coach.nome}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute top-4 left-4">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{ background: `${coach.cor}20`, border: `1px solid ${coach.cor}` }}
                  >
                    <Shield size={14} style={{ color: coach.cor }} />
                    <span
                      className="font-heading text-xs uppercase tracking-wider"
                      style={{ color: coach.cor }}
                    >
                      {coach.titulo}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h3
                    className="font-display text-3xl md:text-4xl text-white mb-4 tracking-wider"
                    style={{ textShadow: `0 0 20px ${coach.cor}40` }}
                  >
                    {coach.nome}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-5">{coach.descricao}</p>
                  <div className="flex flex-wrap gap-2">
                    {coach.conquistas.map((c) => (
                      <span
                        key={c}
                        className="text-xs font-heading uppercase tracking-wider px-3 py-1"
                        style={{
                          color: coach.cor,
                          background: `${coach.cor}10`,
                          border: `1px solid ${coach.cor}30`,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${coach.cor}, transparent)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* Atletas por Organização */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={20} className="text-yellow-400" />
            <h3 className="font-heading text-yellow-400 text-sm uppercase tracking-[0.3em]">
              Atletas RFT em Competição
            </h3>
            <div className="h-px flex-1 bg-yellow-400/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {organizacoes.map((org, i) => (
              <motion.div
                key={org.sigla}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
                className="relative overflow-hidden group"
                style={{
                  background: "oklch(0.14 0.01 250)",
                  border: `1px solid ${org.cor}40`,
                }}
              >
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ background: `${org.cor}10`, borderBottom: `1px solid ${org.cor}30` }}
                >
                  <div className="flex items-center gap-2">
                    <Award size={14} style={{ color: org.cor }} />
                    <span
                      className="font-heading text-sm uppercase tracking-[0.2em]"
                      style={{ color: org.cor }}
                    >
                      {org.sigla}
                    </span>
                  </div>
                  <span className="text-white/30 text-xs">
                    {org.atletas.length} atleta{org.atletas.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="p-4 space-y-3">
                  {org.atletas.map((a) => {
                    const socials = RFT_SOCIALS[a] ?? {};
                    return (
                      <li key={a} className="text-white/80 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rotate-45 shrink-0" style={{ background: org.cor }} />
                          <a
                            href={rftAthleteLink(a)}
                            className="hover:text-yellow-400 hover:underline transition-colors"
                            title={`Ver perfil de ${a} no MMA Analytics`}
                          >
                            {a}
                          </a>
                        </div>
                        {(socials.instagram || socials.twitter) && (
                          <div className="flex items-center gap-2 ml-4 mt-1.5">
                            {socials.instagram && (
                              <a
                                href={`https://instagram.com/${socials.instagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block rounded-lg overflow-hidden hover:scale-110 transition-transform"
                                aria-label={`Instagram de ${a}`}
                                title={`@${socials.instagram}`}
                              >
                                <svg
                                  width="32"
                                  height="32"
                                  viewBox="0 0 32 32"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <defs>
                                    <radialGradient id={`ig-grad-${a}`} cx="30%" cy="107%" r="150%">
                                      <stop offset="0%"   stopColor="#fdf497" />
                                      <stop offset="5%"   stopColor="#fdf497" />
                                      <stop offset="45%"  stopColor="#fd5949" />
                                      <stop offset="60%"  stopColor="#d6249f" />
                                      <stop offset="90%"  stopColor="#285AEB" />
                                    </radialGradient>
                                  </defs>
                                  <rect width="32" height="32" rx="8" fill={`url(#ig-grad-${a})`} />
                                  <rect
                                    x="7" y="7" width="18" height="18" rx="5"
                                    fill="none" stroke="#fff" strokeWidth="2"
                                  />
                                  <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2" />
                                  <circle cx="22" cy="10" r="1.2" fill="#fff" />
                                </svg>
                              </a>
                            )}
                            {socials.twitter && (
                              <a
                                href={`https://twitter.com/${socials.twitter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 hover:scale-110 transition-transform"
                                aria-label={`Twitter de ${a}`}
                                title={`@${socials.twitter}`}
                              >
                                <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                  <path
                                    d="M24.5 11.4c-.6.3-1.3.5-2 .6.7-.4 1.3-1.1 1.5-1.9-.7.4-1.4.7-2.2.8-.6-.7-1.5-1.1-2.5-1.1-1.9 0-3.4 1.5-3.4 3.4 0 .3 0 .5.1.8-2.8-.1-5.3-1.5-7-3.5-.3.5-.5 1.1-.5 1.7 0 1.2.6 2.2 1.5 2.8-.6 0-1.1-.2-1.6-.4 0 1.6 1.2 3 2.7 3.3-.3.1-.6.1-.9.1-.2 0-.4 0-.6-.1.4 1.3 1.7 2.3 3.2 2.3-1.2.9-2.6 1.5-4.2 1.5h-.7c1.5.9 3.3 1.5 5.2 1.5 6.2 0 9.6-5.2 9.6-9.6v-.4c.7-.5 1.3-1.1 1.8-1.8z"
                                    fill="#fff"
                                  />
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div
                  className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500"
                  style={{ background: `linear-gradient(90deg, ${org.cor}, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA — Siga os atletas nas redes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="relative overflow-hidden mb-12 p-6 md:p-8 text-center"
          style={{
            background: "linear-gradient(135deg, #1a1500 0%, #000 50%, #1a0000 100%)",
            border: "1px solid rgba(255,215,0,0.3)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 12px, #FFD700 12px, #FFD700 13px)",
            }}
          />
          <div className="relative">
            <h3 className="font-display text-2xl md:text-3xl tracking-wider text-white mb-2">
              SIGA NOSSOS ATLETAS NAS{" "}
              <span style={{ color: "#FFD700", textShadow: "0 0 20px rgba(250,204,21,0.4)" }}>REDES</span>
            </h3>
            <p className="text-white/60 text-sm max-w-xl mx-auto mb-5">
              Acompanhe a jornada dos lutadores RFT, treinos, bastidores e próximas lutas — apoie quem representa a academia no octógono.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://instagram.com/rftbrasil"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600/20 border border-pink-500/40 text-pink-200 hover:bg-pink-600/30 transition-colors font-heading text-xs uppercase tracking-widest"
              >
                <Instagram size={14} />
                @rftbrasil
              </a>
              <a
                href="https://instagram.com/rft_botafogo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600/20 border border-pink-500/40 text-pink-200 hover:bg-pink-600/30 transition-colors font-heading text-xs uppercase tracking-widest"
              >
                <Instagram size={14} />
                @rft_botafogo
              </a>
            </div>
          </div>
        </motion.div>

        {/* Galeria de Atletas — carrossel horizontal scroll-snap */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-5">
            <Trophy size={20} className="text-yellow-400" />
            <h3 className="font-heading text-yellow-400 text-sm uppercase tracking-[0.3em]">
              Nossos atletas em ação
            </h3>
            <div className="h-px flex-1 bg-yellow-400/20" />
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => galleryRef.current?.scrollBy({ left: -480, behavior: "smooth" })}
                className="w-9 h-9 flex items-center justify-center border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.scrollBy({ left: 480, behavior: "smooth" })}
                className="w-9 h-9 flex items-center justify-center border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                aria-label="Próximo"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <p className="text-white/50 text-sm max-w-2xl mb-5">
            Bastidores, treinos e momentos de competição. A galeria mostra a rotina dos atletas profissionais que treinam todo dia ao seu lado no tatame.
          </p>
          <div
            ref={galleryRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-3 scrollbar-thin"
            style={{ scrollPaddingLeft: 0 }}
          >
            {athletePhotos.map((photo, i) => (
              <div
                key={photo}
                className="snap-start shrink-0 w-64 sm:w-72 md:w-80 h-80 sm:h-96 relative overflow-hidden group"
                style={{ border: "1px solid rgba(255,215,0,0.2)" }}
              >
                <img
                  src={photo}
                  alt={`Atleta RFT — ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 text-[10px] font-heading uppercase tracking-widest text-yellow-400/80">
                  RFT · {String(i + 1).padStart(2, "0")} / {athletePhotos.length}
                </div>
                <div className="absolute inset-0 border border-yellow-400/0 group-hover:border-yellow-400/40 transition-all duration-300 pointer-events-none" />
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-3 md:hidden">← arraste para o lado →</p>
        </motion.div>

        {/* Espaço da Academia */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-5">
            <Award size={20} className="text-yellow-400" />
            <h3 className="font-heading text-yellow-400 text-sm uppercase tracking-[0.3em]">
              O Espaço da RFT
            </h3>
            <div className="h-px flex-1 bg-yellow-400/20" />
          </div>

          <div
            className="relative overflow-hidden p-6 md:p-10 mb-6"
            style={{
              background: "linear-gradient(135deg, oklch(0.14 0.01 250), #000)",
              border: "1px solid rgba(255,215,0,0.25)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, transparent, transparent 14px, rgba(255,215,0,0.4) 14px, rgba(255,215,0,0.4) 15px)",
              }}
            />
            <div className="relative">
              <h4 className="font-display text-3xl md:text-4xl text-white tracking-wider mb-4">
                ESTRUTURA QUE{" "}
                <span style={{ color: "#FFD700", textShadow: "0 0 20px rgba(250,204,21,0.4)" }}>
                  ACOMPANHA
                </span>{" "}
                A VONTADE DO ALUNO
              </h4>
              <p className="text-white/60 text-base leading-relaxed max-w-3xl">
                A Renovação Fight Team foi montada para treinos pesados: tatame amplo, equipamentos completos
                e professores que ainda sobem pra lutar. Aqui você não treina <em>como</em> atleta — você treina
                <em> ao lado</em> deles. Do iniciante ao profissional, todo aluno encontra ambiente, técnica e
                estrutura no mesmo nível dos times que disputam UFC, LFA e Centurion.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {academiaFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="relative overflow-hidden p-5 md:p-6 group"
                  style={{
                    background: "oklch(0.14 0.01 250)",
                    border: "1px solid rgba(255,215,0,0.2)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 shrink-0 rotate-45 flex items-center justify-center"
                      style={{
                        background: "rgba(255,215,0,0.12)",
                        border: "1px solid rgba(255,215,0,0.4)",
                      }}
                    >
                      <Icon size={18} className="-rotate-45 text-yellow-400" />
                    </div>
                    <div>
                      <h5 className="font-display text-lg text-white tracking-wider mb-1">
                        {f.title}
                      </h5>
                      <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 h-px w-0 bg-yellow-400 group-hover:w-full transition-all duration-500"
                  />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Team Photos Row (academia em ação) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {[TEAM_PHOTO_1, BJJ_PHOTO].map((photo, i) => (
            <div key={i} className="relative overflow-hidden group h-64">
              <img
                src={photo}
                alt="Equipe RFT"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="text-yellow-400 font-heading text-sm uppercase tracking-wider">
                  {i === 0 ? "Equipe RFT em Ação" : "Jiu-Jitsu de Alto Nível"}
                </div>
              </div>
              <div className="absolute inset-0 border border-yellow-400/0 group-hover:border-yellow-400/30 transition-all duration-300" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
