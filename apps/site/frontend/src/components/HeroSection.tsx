import { motion } from "framer-motion";
import { ChevronDown, Shield, Trophy, Users } from "lucide-react";
import { asset } from "@/lib/url";

const TEAM_PHOTO = asset("/imagens/mma/477c4760-44c1-11f1-93cd-1bbb4d4c542c.jpg");

const stats = [
  { icon: Trophy, value: "LFA", label: "Campeão" },
  { icon: Shield, value: "UFC", label: "Atletas" },
  { icon: Users, value: "6+", label: "Modalidades" },
];

export default function HeroSection() {
  const scrollToModalities = () => {
    document.querySelector("#modalidades")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToContact = () => {
    document.querySelector("#contato")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{
        background: "linear-gradient(-45deg, #0a0a0a, #1a0800, #0a0a0f, #0d0d00)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 15s ease infinite",
      }}
    >
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${TEAM_PHOTO})`,
          backgroundPosition: "center 30%",
        }}
      />
      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />

      {/* Neon grid lines */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(oklch(0.84 0.18 95 / 0.3) 1px, transparent 1px),
          linear-gradient(90deg, oklch(0.84 0.18 95 / 0.3) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />

      {/* Diagonal accent line */}
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-20"
        style={{
          background: "linear-gradient(135deg, transparent 50%, oklch(0.84 0.18 95 / 0.15) 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-20 pb-16">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 px-4 py-2 mb-6"
          >
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-yellow-400 font-heading text-xs uppercase tracking-[0.3em]">
              Botafogo, Rio de Janeiro
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none mb-2">
              <span className="text-white">RENOVAÇÃO</span>
            </h1>
            <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none mb-6"
              style={{
                color: "oklch(0.84 0.18 95)",
                textShadow: "0 0 30px oklch(0.84 0.18 95 / 0.6), 0 0 60px oklch(0.84 0.18 95 / 0.3)",
              }}
            >
              FIGHT TEAM
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-white/70 text-lg md:text-xl font-inter max-w-xl mb-10 leading-relaxed"
          >
            Treine com campeões. Transforme sua vida. A academia de artes marciais mais completa do Rio de Janeiro, com atletas do <strong className="text-yellow-400">UFC</strong> e o campeão do <strong className="text-yellow-400">LFA</strong>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={scrollToContact}
              className="group relative bg-yellow-400 text-black font-heading font-bold text-lg uppercase tracking-wider px-10 py-4 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(250,204,21,0.6)]"
            >
              <span className="relative z-10">Comece Sua Jornada</span>
              <div className="absolute inset-0 bg-yellow-300 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            </button>
            <button
              onClick={scrollToModalities}
              className="border-2 border-white/30 text-white font-heading font-bold text-lg uppercase tracking-wider px-10 py-4 hover:border-yellow-400 hover:text-yellow-400 transition-all duration-300"
            >
              Ver Modalidades
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex flex-wrap gap-8 mt-14 pt-8 border-t border-white/10"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/30 rotate-45 flex items-center justify-center">
                  <stat.icon size={18} className="text-yellow-400 -rotate-45" />
                </div>
                <div>
                  <div className="text-yellow-400 font-display text-2xl leading-none">{stat.value}</div>
                  <div className="text-white/50 text-xs uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
        onClick={scrollToModalities}
      >
        <span className="text-white/40 text-xs uppercase tracking-[0.3em]">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="text-yellow-400" size={24} />
        </motion.div>
      </motion.div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
