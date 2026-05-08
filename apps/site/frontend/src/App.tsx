import { Toaster } from "@rft/shared/ui/sonner";
import { TooltipProvider } from "@rft/shared/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

function PageTitle() {
  const [location] = useLocation();
  useEffect(() => {
    document.title = "RFT - Renovação Fight Team | Academia de Lutas em Botafogo, RJ";
  }, [location]);
  return null;
}

function Router() {
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
