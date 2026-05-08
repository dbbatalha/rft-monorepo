import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Phone, Clock, MessageCircle, Navigation, Instagram } from "lucide-react";

const WHATSAPP_NUMBER = "5521975371903";
const ENDERECO = "Rua General Polidoro, 83 - Botafogo, Rio de Janeiro, RJ";

const infos = [
  {
    icon: MapPin,
    titulo: "Endereço",
    conteudo: "Rua General Polidoro, 83\nBotafogo, Rio de Janeiro - RJ",
    cor: "#FFD700",
  },
  {
    icon: Phone,
    titulo: "Telefone / WhatsApp",
    conteudo: "(21) 97537-1903",
    cor: "#FF3333",
    link: `https://wa.me/${WHATSAPP_NUMBER}`,
  },
  {
    icon: Clock,
    titulo: "Funcionamento",
    conteudo: "Segunda a Sexta: 6h às 21h\nSábados: 9h às 12h",
    cor: "#FFD700",
  },
  {
    icon: Instagram,
    titulo: "Instagram",
    conteudo: "@rftbrasil\n@rft_botafogo",
    cor: "#FF3333",
    link: "https://instagram.com/rftbrasil",
  },
];

export default function LocalizacaoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const openMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ENDERECO)}`,
      "_blank"
    );
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Vim pelo site da RFT e gostaria de saber mais sobre as aulas.`,
      "_blank"
    );
  };

  return (
    <section id="localizacao" className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #000 0%, #0a0500 50%, #000 100%)" }}
    >
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
            <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">Como Chegar</span>
            <div className="h-px w-12 bg-yellow-400" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
            LOCALIZAÇÃO
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Estamos no coração de Botafogo, de fácil acesso por metrô, ônibus ou carro.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {infos.map((info) => (
              <div
                key={info.titulo}
                className="p-5 flex items-start gap-4 transition-all duration-300 hover:border-yellow-400/30"
                style={{
                  background: "oklch(0.14 0.01 250)",
                  border: `1px solid ${info.cor}20`,
                }}
              >
                <div className="w-10 h-10 rotate-45 flex items-center justify-center flex-shrink-0 bg-yellow-400 border-2 border-black rounded-md">
                  <info.icon size={18} className="-rotate-45 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-heading text-sm uppercase tracking-wider mb-1" style={{ color: info.cor }}>
                    {info.titulo}
                  </div>
                  {info.link ? (
                    <a
                      href={info.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/80 text-sm hover:text-yellow-400 transition-colors whitespace-pre-line"
                    >
                      {info.conteudo}
                    </a>
                  ) : (
                    <p className="text-white/80 text-sm whitespace-pre-line">{info.conteudo}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={openWhatsApp}
                className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-heading font-bold text-sm uppercase tracking-wider py-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                <MessageCircle size={18} />
                Falar no WhatsApp
              </button>
              <button
                onClick={openMaps}
                className="w-full flex items-center justify-center gap-3 bg-transparent border border-yellow-400/40 text-yellow-400 font-heading font-bold text-sm uppercase tracking-wider py-4 hover:bg-yellow-400/10 hover:border-yellow-400 transition-all duration-300"
              >
                <Navigation size={18} />
                Como Chegar
              </button>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 overflow-hidden"
            style={{
              border: "1px solid rgba(250,204,21,0.2)",
              boxShadow: "0 0 30px rgba(250,204,21,0.05)",
              minHeight: "400px",
            }}
          >
            <iframe
              title="RFT - Renovação Fight Team"
              src={`https://www.google.com/maps?q=${encodeURIComponent(ENDERECO)}&z=16&output=embed`}
              width="100%"
              height="400"
              style={{ border: 0, display: "block", minHeight: 400 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
