import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ModalidadesSection from "@/components/ModalidadesSection";
import ProfessoresSection from "@/components/ProfessoresSection";
import HorariosSection from "@/components/HorariosSection";
import PlanosSection from "@/components/PlanosSection";
import GaleriaSection from "@/components/GaleriaSection";
import LocalizacaoSection from "@/components/LocalizacaoSection";
import ContatoSection from "@/components/ContatoSection";
import ScoutingSection from "@/components/ScoutingSection";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <HeroSection />
      <ModalidadesSection />
      <ProfessoresSection />
      <HorariosSection />
      <PlanosSection />
      <GaleriaSection />
      <ScoutingSection />
      <LocalizacaoSection />
      <ContatoSection />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
