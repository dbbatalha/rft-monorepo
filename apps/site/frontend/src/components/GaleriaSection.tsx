import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

const fotos = [
  {
    src: "/imagens/mma/47a9e710-44c1-11f1-93cd-1bbb4d4c542c.jpg",
    alt: "Equipe RFT - Treino Completo",
    categoria: "Equipe",
  },
  {
    src: "/imagens/mma/mma_0.jpeg",
    alt: "Treino de MMA na RFT",
    categoria: "MMA",
  },
  {
    src: "/imagens/luta-livre/turma_lle.jpeg",
    alt: "Turma de Luta Livre — Prof. Márcio Cromado",
    categoria: "Luta Livre",
  },
  {
    src: "/imagens/jiu-jitsu/turma_bruno.jpeg",
    alt: "Turma de Jiu-Jitsu — Prof. Bruno Grillu",
    categoria: "Jiu-Jitsu",
  },
  {
    src: "/imagens/jiu-jitsu/turma_diego.jpeg",
    alt: "Turma de Jiu-Jitsu — Prof. Diego Batalha",
    categoria: "Jiu-Jitsu",
    objectPosition: "center 60%",
  },
  {
    src: "/imagens/jiu-jitsu/turma_bruno_diego.jpeg",
    alt: "Turma de Jiu-Jitsu — Bruno e Diego",
    categoria: "Jiu-Jitsu",
    objectPosition: "center 35%",
  },
  {
    src: "/imagens/boxe/boxe_1.jpg",
    alt: "Turma de Boxe na RFT",
    categoria: "Boxe",
  },
  {
    src: "/imagens/muay-thai/muay_thai_1.jpeg",
    alt: "Turma de Muay Thai na RFT",
    categoria: "Muay Thai",
  },
];

export default function GaleriaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex((i) => (i !== null ? (i - 1 + fotos.length) % fotos.length : null));
  const nextPhoto = () => setLightboxIndex((i) => (i !== null ? (i + 1) % fotos.length : null));

  return (
    <section id="galeria" className="py-24 bg-black relative overflow-hidden">
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
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">Nossa Academia</span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            GALERIA
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Conheça o ambiente, a equipe e a energia que fazem da RFT um lugar único.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fotos.map((foto, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative group cursor-pointer overflow-hidden"
              style={{
                aspectRatio: i === 0 || i === 2 ? "3/4" : "3/4",
                gridRow: i === 0 ? "span 1" : "span 1",
              }}
              onClick={() => openLightbox(i)}
            >
              <img
                src={foto.src}
                alt={foto.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                style={{
                  minHeight: "250px",
                  objectPosition: (foto as any).objectPosition ?? "center",
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
              {/* Zoom icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 bg-yellow-400/90 flex items-center justify-center">
                  <ZoomIn size={20} className="text-black" />
                </div>
              </div>
              {/* Category tag */}
              <div className="absolute top-3 left-3 bg-black/70 border border-yellow-400/30 px-2 py-1">
                <span className="text-yellow-400 font-heading text-xs uppercase tracking-wider">{foto.categoria}</span>
              </div>
              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black to-transparent">
                <p className="text-white text-sm font-medium">{foto.alt}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              onClick={closeLightbox}
            >
              <X size={20} className="text-white" />
            </button>

            {/* Prev */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-yellow-400/20 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            >
              <ChevronLeft size={24} className="text-white" />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fotos[lightboxIndex].src}
                alt={fotos[lightboxIndex].alt}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-heading text-sm uppercase tracking-wider">
                  {fotos[lightboxIndex].alt}
                </p>
                <p className="text-yellow-400 text-xs mt-1">
                  {lightboxIndex + 1} / {fotos.length}
                </p>
              </div>
            </motion.div>

            {/* Next */}
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-yellow-400/20 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            >
              <ChevronRight size={24} className="text-white" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: i === lightboxIndex ? "#FFD700" : "rgba(255,255,255,0.3)",
                    transform: i === lightboxIndex ? "scale(1.5)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
