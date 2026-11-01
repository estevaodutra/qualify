// src/components/layout/AppLayout.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageSquare, GitBranch, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { ImpersonationBanner } from "../admin/ImpersonationBanner";
import { useCallQueue } from "@/hooks/useCallQueue";
import { ChatExpressDock } from "@/components/chat/express/ChatExpressDock";
import { CallFloatingLauncher } from "@/components/call/CallFloatingLauncher";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { NotificationPopupManager } from "../notifications/NotificationPopupManager";

function MobileBottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const items = [
    { label: "Home", path: "/", icon: Home },
    { label: "Chat", path: "/chat", icon: MessageSquare },
    { label: "Pipelines", path: "/pipelines", icon: GitBranch },
  ];
  return (
    <nav aria-label="Navegação principal mobile" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 h-14">
        {items.map(({ label, path, icon: Icon }) => {
          const active = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <button key={path} type="button" onClick={() => navigate(path)}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold min-w-0", active ? "text-[#5856D6] bg-[#EEF0FD]" : "text-slate-500")}>
              <Icon aria-hidden="true" className="w-5 h-5" />{label}
            </button>
          );
        })}
        <button type="button" onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500"
          aria-label="Abrir menu completo da Qualify">
          <Menu aria-hidden="true" className="w-5 h-5" />Menu
        </button>
      </div>
    </nav>
  );
}

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Global queue tick loop — runs on all pages
  useCallQueue({ globalLoop: true });
  const location = useLocation();

  // Check if current route is Quiz Editor, Chat, or Criafy Hub
  const isQuizEditor = location.pathname.startsWith("/quiz/") && location.pathname !== "/quiz";
  const isChat = location.pathname.startsWith("/chat");
  const isCriafyHub = location.pathname === "/criafy";

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-[100dvh] w-full bg-background relative overflow-hidden">
        {/* System Sidebar */}
        <AppSidebar />

        <div className="flex flex-1 flex-col relative z-10 min-w-0 h-[100dvh] overflow-hidden">
          <ImpersonationBanner />
          {!isQuizEditor && <AppHeader />}
          {!isQuizEditor && <InstanceStatusBanner />}
          <NotificationPopupManager />
          <main className={
            isQuizEditor
              ? "flex-1 overflow-hidden p-0 h-[100dvh]"
              : isCriafyHub
              ? "flex-1 overflow-hidden p-0 h-[calc(100dvh-60px-var(--mobile-nav-height,56px)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-60px)]"
              : isChat
              ? "flex-1 overflow-hidden p-0 md:p-4 h-[calc(100dvh-60px)]"
              : "flex-1 overflow-auto p-3.5 md:p-8 scrollbar-thin pb-[calc(56px+env(safe-area-inset-bottom)+16px)] md:pb-8"
          }>
            {children || <Outlet />}
          </main>
        </div>

        {!isQuizEditor && <MobileBottomNavigation />}
        {!isQuizEditor && <CallFloatingLauncher />}
        {!isQuizEditor && <ChatExpressDock />}
        {!isQuizEditor && <PwaInstallPrompt />}
      </div>
    </SidebarProvider>
  );
}
