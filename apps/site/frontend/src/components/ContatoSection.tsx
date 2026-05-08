import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Send, CheckCircle, AlertCircle, User, Phone, Dumbbell } from "lucide-react";

const RFT_WHATSAPP = "5521975371903";

const modalidades = [
  "MMA Profissional",
  "Boxe",
  "Muay Thai / Kickboxing",
  "Jiu-Jitsu",
  "Jiu-Jitsu Kids",
  "Luta Livre",
  "Não sei ainda",
];

export default function ContatoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const [form, setForm] = useState({ name: "", phone: "", modality: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submitLead = { isPending: false };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.modality) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    const message = encodeURIComponent(
      `Olá, sou ${form.name}. Telefone: ${form.phone}. Tenho interesse em ${form.modality}.`,
    );
    window.open(`https://wa.me/${RFT_WHATSAPP}?text=${message}`, "_blank", "noopener,noreferrer");
    setSuccess(true);
    setForm({ name: "", phone: "", modality: "" });
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section id="contato" className="py-24 bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(250,204,21,0.5) 10px, rgba(250,204,21,0.5) 11px)`,
      }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl" ref={ref}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-px w-12 bg-yellow-400" />
              <span className="text-yellow-400 font-heading text-sm uppercase tracking-[0.3em]">Primeira Aula Grátis</span>
              <div className="h-px w-12 bg-yellow-400" />
            </div>
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-4">
              COMECE SUA <span style={{ color: "#FFD700", textShadow: "0 0 30px rgba(250,204,21,0.5)" }}>JORNADA</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Preencha o formulário e nossa equipe entrará em contato para agendar sua primeira aula experimental <strong className="text-yellow-400">gratuita</strong>.
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative overflow-hidden"
            style={{
              background: "oklch(0.14 0.01 250)",
              border: "1px solid rgba(250,204,21,0.2)",
              boxShadow: "0 0 40px rgba(250,204,21,0.05)",
            }}
          >
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400" />

            <div className="p-8 md:p-10">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={36} className="text-green-500" />
                  </div>
                  <h3 className="font-display text-3xl text-white mb-3">Mensagem Enviada!</h3>
                  <p className="text-white/60 text-base mb-6">
                    Recebemos seu contato! Nossa equipe entrará em contato em breve para agendar sua aula experimental gratuita.
                  </p>
                  <p className="text-yellow-400 text-sm font-heading uppercase tracking-wider">
                    Bem-vindo à família RFT!
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-6 text-white/40 text-sm hover:text-white/60 transition-colors"
                  >
                    Enviar outro contato
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-white/60 font-heading text-xs uppercase tracking-wider mb-2">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <User size={16} className="text-white/30" />
                      </div>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full bg-black/50 border border-white/10 text-white placeholder-white/20 pl-12 pr-4 py-4 font-inter text-sm focus:outline-none focus:border-yellow-400/50 transition-colors"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-white/60 font-heading text-xs uppercase tracking-wider mb-2">
                      Telefone / WhatsApp *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Phone size={16} className="text-white/30" />
                      </div>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="(21) 99999-9999"
                        className="w-full bg-black/50 border border-white/10 text-white placeholder-white/20 pl-12 pr-4 py-4 font-inter text-sm focus:outline-none focus:border-yellow-400/50 transition-colors"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      />
                    </div>
                  </div>

                  {/* Modality */}
                  <div>
                    <label className="block text-white/60 font-heading text-xs uppercase tracking-wider mb-2">
                      Modalidade de Interesse *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Dumbbell size={16} className="text-white/30" />
                      </div>
                      <select
                        value={form.modality}
                        onChange={(e) => handleChange("modality", e.target.value)}
                        className="w-full bg-black/50 border border-white/10 text-white pl-12 pr-4 py-4 font-inter text-sm focus:outline-none focus:border-yellow-400/50 transition-colors appearance-none cursor-pointer"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <option value="" disabled style={{ background: "#1a1a1a" }}>
                          Selecione uma modalidade
                        </option>
                        {modalidades.map((m) => (
                          <option key={m} value={m} style={{ background: "#1a1a1a" }}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 px-4 py-3">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitLead.isPending}
                    className="w-full group relative bg-yellow-400 text-black font-heading font-bold text-base uppercase tracking-wider py-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {submitLead.isPending ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Quero Minha Aula Grátis
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-yellow-300 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                  </button>

                  <p className="text-white/30 text-xs text-center">
                    Ao enviar, você concorda em receber contato da RFT. Não enviamos spam.
                  </p>
                </form>
              )}
            </div>
          </motion.div>

          {/* Alternative contact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-white/30 text-sm mb-3">Prefere falar diretamente?</p>
            <a
              href={`https://wa.me/5521975371903?text=Olá! Vim pelo site da RFT e gostaria de saber mais sobre as aulas.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-heading text-sm uppercase tracking-wider transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              (21) 97537-1903
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
