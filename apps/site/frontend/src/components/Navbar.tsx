import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Modalidades", href: "#modalidades" },
  { label: "Professores", href: "#professores" },
  { label: "Horários", href: "#horarios" },
  { label: "Planos", href: "#planos" },
  { label: "Galeria", href: "#galeria" },
  { label: "Localização", href: "#localizacao" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/95 backdrop-blur-md border-b border-yellow-400/20 shadow-lg shadow-black/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="#hero"
            onClick={(e) => { e.preventDefault(); handleNavClick("#hero"); }}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <img
                src="/imagens/rft-losango.png"
                alt="RFT"
                className="w-10 h-10 md:w-12 md:h-12 object-contain group-hover:drop-shadow-[0_0_12px_rgba(250,204,21,0.6)] transition-all duration-300"
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-yellow-400 font-display text-xl md:text-2xl leading-none tracking-wider">
                RENOVAÇÃO
              </div>
              <div className="text-white/70 text-xs tracking-[0.3em] uppercase">
                Fight Team
              </div>
            </div>
          </a>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className="text-white/80 hover:text-yellow-400 font-heading text-sm uppercase tracking-wider transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <a
              href="#contato"
              onClick={(e) => { e.preventDefault(); handleNavClick("#contato"); }}
              className="bg-yellow-400 text-black font-heading font-bold text-sm uppercase tracking-wider px-6 py-2.5 hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-300"
            >
              Matricule-se
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-black/98 border-t border-yellow-400/20"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  className="text-white/80 hover:text-yellow-400 font-heading text-base uppercase tracking-wider py-2 border-b border-white/10 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#contato"
                onClick={(e) => { e.preventDefault(); handleNavClick("#contato"); }}
                className="mt-2 bg-yellow-400 text-black font-heading font-bold text-sm uppercase tracking-wider px-6 py-3 text-center hover:bg-yellow-300 transition-colors"
              >
                Matricule-se
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
