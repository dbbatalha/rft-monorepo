import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@rft/shared/ui/sidebar";
import { useIsMobile } from "@/hooks/scouting/useMobile";
import {
  LayoutDashboard, PanelLeft, Users,
  Mail, BarChart3, Target, Trophy, CalendarDays,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { asset } from "@/lib/url";

// Paths são internos ao Router (base="/" no App.tsx) — sem o prefixo /analytics.
const menuItems = [
  { icon: LayoutDashboard, label: "Home",                path: "/" },
  { icon: Users,           label: "Atletas",            path: "/fighters" },
  { icon: Trophy,          label: "Rankings",           path: "/rankings" },
  { icon: Target,          label: "Preditor de Lutas",  path: "/predictor" },
  { icon: CalendarDays,    label: "Eventos Futuros",    path: "/upcoming" },
  { icon: BarChart3,       label: "Advanced Analytics", path: "/advanced" },
  { icon: Mail,            label: "Contratar Scouting", path: "/contact" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border" disableTransition={isResizing}>

          {/* ── Header ──────────────────────────────── */}
          <SidebarHeader className="p-0">
            {/* Red accent line */}
            <div className="h-0.5 bg-gradient-to-r from-primary via-amber-500 to-primary/20" />

            <div className="flex items-center gap-3 px-3 py-3">
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-sidebar-accent transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                {isCollapsed
                  ? <img src={asset("/imagens/rft-losango.png")} alt="RFT" className="w-7 h-7 object-contain" />
                  : <PanelLeft className="h-4 w-4 text-muted-foreground" />
                }
              </button>

              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <img src={asset("/imagens/rft-losango.png")} alt="RFT" className="w-8 h-8 object-contain shrink-0" />
                  <div className="min-w-0">
                    <p className="font-display tracking-wider text-sm text-yellow-400 leading-tight">MMA ANALYTICS</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-[0.25em]">by RFT</p>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="mx-3 mb-2 h-px bg-sidebar-border" />
            )}
          </SidebarHeader>

          {/* ── Navigation ──────────────────────────── */}
          <SidebarContent className="gap-0 px-2">
            {!isCollapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">
                Navegação
              </p>
            )}
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-heading uppercase tracking-widest text-xs relative
                        ${isActive
                          ? "bg-yellow-400/10 text-yellow-400 border-l-2 border-yellow-400"
                          : "text-white/60 hover:text-yellow-400 hover:bg-yellow-400/5 border-l-2 border-transparent"
                        }`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-yellow-400" : ""}`} strokeWidth={2.5} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-13 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
              <img src={asset("/imagens/rft-losango.png")} alt="RFT" className="w-7 h-7 object-contain" />
              <span className="text-sm font-display tracking-wider text-yellow-400">
                {activeMenuItem?.label ?? "MMA ANALYTICS"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-5">{children}</main>
        <footer className="border-t border-border bg-card/40 px-5 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <p>© 2025 RFT - Renovação Fight Team. Todos os direitos reservados.</p>
            <p>Rua General Polidoro, 83 — Botafogo, RJ</p>
          </div>
        </footer>
      </SidebarInset>
    </>
  );
}
