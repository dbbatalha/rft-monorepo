import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@rft/shared/ui/card";
import { Button } from "@rft/shared/ui/button";
import { Input } from "@rft/shared/ui/input";
import { Label } from "@rft/shared/ui/label";
import { Badge } from "@rft/shared/ui/badge";
import { Textarea } from "@rft/shared/ui/textarea";
import {
  MessageSquare,
  Shield,
  Users,
  CheckCircle,
  Zap,
  Target,
} from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  {
    icon: Shield,
    title: "Dados Verificados",
    description: "Métricas coletadas de múltiplas fontes: UFC Stats, Tapology, Sherdog e MMA Decisions",
  },
  {
    icon: Target,
    title: "6 Modelos de Predição",
    description: "Elo Rating, Logistic Regression, Decision Tree, Random Forest, XGBoost e Neural Network",
  },
  {
    icon: Users,
    title: "Qualquer Atleta",
    description: "Análise de atletas de UFC, ONE Championship, PFL, LFA e outras organizações",
  },
  {
    icon: Zap,
    title: "Máxima Eficiência",
    description: "Cada relatório é finalizado priorizando profundidade técnica e precisão",
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    athleteName: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const WHATSAPP_NUMBER = "5521969179229"; // +55 21 96917-9229

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.athleteName) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    const lines = [
      "*Solicitação de Relatório RFT Scouting*",
      "",
      `*Nome:* ${formData.name}`,
      formData.organization ? `*Organização / Equipe:* ${formData.organization}` : null,
      `*Atleta a analisar:* ${formData.athleteName}`,
      // (tipo de relatório removido — pacotes não são mais selecionados no form)
      formData.message ? `*Mensagem:* ${formData.message}` : null,
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSubmitted(true);
    toast.success("Abrindo WhatsApp para finalizar o envio...");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-primary/30 text-primary px-3 py-1">
          Serviço Exclusivo
        </Badge>
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Relatórios de Scouting Profissional
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          Análise técnica aprofundada de atletas de MMA para coaches, managers, promotores e analistas.
          Desenvolvido com dados reais e modelos de predição avançados.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="border-border bg-card text-center p-4">
            <feature.icon className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground mb-1">{feature.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* Contact Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Solicitar Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-foreground">Solicitação Recebida!</h3>
                <p className="text-sm text-muted-foreground">
                  Confirme a mensagem no WhatsApp e retornaremos com os detalhes do relatório.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitted(false)}
                  className="mt-2"
                >
                  Nova Solicitação
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">
                    Nome <span className="text-primary">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Seu nome"
                    className="bg-input border-border text-foreground text-sm h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">Organização / Equipe</Label>
                  <Input
                    value={formData.organization}
                    onChange={(e) => handleChange("organization", e.target.value)}
                    placeholder="UFC, ONE Championship, PFL, academia..."
                    className="bg-input border-border text-foreground text-sm h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">
                    Atleta a ser analisado <span className="text-primary">*</span>
                  </Label>
                  <Input
                    value={formData.athleteName}
                    onChange={(e) => handleChange("athleteName", e.target.value)}
                    placeholder="Nome do atleta (ex: Michael Chiesa)"
                    className="bg-input border-border text-foreground text-sm h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">Mensagem adicional</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    placeholder="Contexto da análise, adversário específico, prazo desejado..."
                    className="bg-input border-border text-foreground text-sm resize-none"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-500/90 text-white">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar pelo WhatsApp
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Sua mensagem será aberta no WhatsApp para confirmar o envio.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Como Funciona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { step: "01", title: "Solicite o Relatório", desc: "Preencha o formulário com o nome do atleta e o tipo de análise desejada." },
                { step: "02", title: "Coleta de Dados", desc: "Coletamos dados de múltiplas fontes: UFC Stats, Tapology, Sherdog e MMA Decisions." },
                { step: "03", title: "Análise e Modelagem", desc: "Aplicamos 6 modelos de predição e análise técnica profunda." },
                { step: "04", title: "Entrega do PDF", desc: "Relatório(s) finalizado(s) com máxima eficiência, profundidade técnica e precisão." },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="text-xs font-black text-primary w-7 shrink-0 mt-0.5">{item.step}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Confidencialidade Garantida</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os relatórios são tratados com sigilo absoluto. Os dados dos atletas e
                estratégias analisadas não são compartilhados com terceiros.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
