import { Toaster } from "@rft/shared/ui/sonner";
import { TooltipProvider } from "@rft/shared/ui/tooltip";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

// BASE_URL pode ser "/" (Cloudflare/domínio próprio) ou "/rft-monorepo/" (GH Pages).
// Wouter remove o prefixo automaticamente quando configurado em <Router base="...">.
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function PageTitle() {
  const [location] = useLocation();
  useEffect(() => {
    document.title = "RFT - Renovação Fight Team | Academia de Lutas em Botafogo, RJ";
  }, [location]);
  return null;
}

function Routes() {
  return (
    <Switch>
      <Route path="/"        component={Home} />
      <Route path="/404"     component={NotFound} />
      <Route                 component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <PageTitle />
          <WouterRouter base={BASE}>
            <Routes />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
