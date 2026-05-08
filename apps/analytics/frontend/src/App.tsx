import { Toaster } from "@rft/shared/ui/sonner";
import { TooltipProvider } from "@rft/shared/ui/tooltip";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardLayout from "@/components/DashboardLayout";
import ScoutingHome from "@/pages/Home";
import FightersList from "@/pages/FightersList";
import FighterProfile from "@/pages/FighterProfile";
import FightsIndex from "@/pages/FightsIndex";
import FightHistory from "@/pages/FightHistory";
import Predictor from "@/pages/Predictor";
import Analytics from "@/pages/Analytics";
import ScoutingReport from "@/pages/ScoutingReport";
import Contact from "@/pages/Contact";
import Rankings from "@/pages/Rankings";
import UpcomingEvents from "@/pages/UpcomingEvents";
import NotFound from "@/pages/NotFound";

const wrap = (Component: React.ComponentType<any>) => (props: any) => (
  <DashboardLayout>
    <Component {...props} />
  </DashboardLayout>
);

function PageTitle() {
  const [location] = useLocation();
  useEffect(() => {
    document.title = "MMA Analytics by RFT — Scouting & Predições";
  }, [location]);
  return null;
}

function Routes() {
  return (
    <Switch>
      <Route path="/"                  component={wrap(ScoutingHome)} />
      <Route path="/fighters"          component={wrap(FightersList)} />
      <Route path="/fighter/:id"       component={wrap(FighterProfile)} />
      <Route path="/fights"            component={wrap(FightsIndex)} />
      <Route path="/fights/:id"        component={wrap(FightHistory)} />
      <Route path="/predictor"         component={wrap(Predictor)} />
      <Route path="/scouting"          component={wrap(ScoutingReport)} />
      <Route path="/advanced"          component={wrap(Analytics)} />
      <Route path="/rankings"          component={wrap(Rankings)} />
      <Route path="/upcoming"          component={wrap(UpcomingEvents)} />
      <Route path="/contact"           component={wrap(Contact)} />
      <Route                           component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <PageTitle />
        <WouterRouter base="/analytics">
          <Routes />
        </WouterRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
