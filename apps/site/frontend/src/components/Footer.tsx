import { MapPin, Phone, Instagram, MessageCircle } from "lucide-react";

const modalidades = ["MMA Profissional", "Luta Livre", "Muay Thai / Kickboxing", "Boxe", "Jiu-Jitsu", "Jiu-Jitsu Kids"];

export default function Footer() {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/imagens/rft-losango.png" alt="RFT" className="w-12 h-12 object-contain" />
              <div>
                <div className="text-yellow-400 font-display text-xl leading-none tracking-wider">RENOVAÇÃO</div>
                <div className="text-white/50 text-xs tracking-[0.3em] uppercase">Fight Team</div>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Academia de artes marciais de alto nível em Botafogo, Rio de Janeiro. Formando campeões desde o início.
            </p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/5521975371903"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-green-600/20 border border-green-600/30 flex items-center justify-center hover:bg-green-600/30 transition-colors"
              >
                <MessageCircle size={16} className="text-green-400" />
              </a>
              <a
                href="https://instagram.com/rftbrasil"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @rftbrasil"
                className="flex items-center gap-2 h-9 px-3 bg-pink-600/20 border border-pink-600/30 hover:bg-pink-600/30 transition-colors"
              >
                <Instagram size={16} className="text-pink-400" />
                <span className="text-pink-200 text-xs font-heading uppercase tracking-wider">@rftbrasil</span>
              </a>
              <a
                href="https://instagram.com/rft_botafogo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @rft_botafogo"
                className="flex items-center gap-2 h-9 px-3 bg-pink-600/20 border border-pink-600/30 hover:bg-pink-600/30 transition-colors"
              >
                <Instagram size={16} className="text-pink-400" />
                <span className="text-pink-200 text-xs font-heading uppercase tracking-wider">@rft_botafogo</span>
              </a>
            </div>
          </div>

          {/* Modalidades */}
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-[0.2em] text-yellow-400 mb-4">
              Modalidades
            </h4>
            <ul className="space-y-2">
              {modalidades.map((m) => (
                <li key={m}>
                  <button
                    onClick={() => scrollTo("#modalidades")}
                    className="text-white/40 hover:text-white/70 text-sm transition-colors text-left"
                  >
                    {m}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-[0.2em] text-yellow-400 mb-4">
              Navegação
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Professores", id: "#professores" },
                { label: "Horários", id: "#horarios" },
                { label: "Planos", id: "#planos" },
                { label: "Galeria", id: "#galeria" },
                { label: "Localização", id: "#localizacao" },
                { label: "Contato", id: "#contato" },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollTo(link.id)}
                    className="text-white/40 hover:text-white/70 text-sm transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-[0.2em] text-yellow-400 mb-4">
              Contato
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-white/40 text-sm">
                  Rua General Polidoro, 83<br />
                  Botafogo, Rio de Janeiro - RJ
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-yellow-400 flex-shrink-0" />
                <a
                  href="https://wa.me/5521975371903"
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  (21) 97537-1903
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © 2025 RFT - Renovação Fight Team. Todos os direitos reservados.
          </p>
          <p className="text-white/20 text-xs">
            Rua General Polidoro, 83 — Botafogo, RJ
          </p>
        </div>
      </div>
    </footer>
  );
}
