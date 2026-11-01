// src/components/layout/AppLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
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
import { MobileBottomNav } from "./MobileBottomNav";

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
      <div className="flex min-h-[100dvh] w-full max-w-full bg-background relative overflow-x-hidden overflow-y-hidden">
        {/* System Sidebar */}
        <AppSidebar />

        <div className={`flex flex-1 flex-col relative z-10 min-w-0 h-[100dvh] overflow-hidden ${isQuizEditor ? "" : "pt-[max(env(safe-area-inset-top),32px)] pb-[calc(64px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0"}`}>
          <ImpersonationBanner />
          {!isQuizEditor && <AppHeader />}
          {!isQuizEditor && <InstanceStatusBanner />}
          <NotificationPopupManager />
          <main className={
            isQuizEditor
              ? "flex-1 overflow-hidden p-0 h-[100dvh]"
              : isCriafyHub
              ? "flex-1 overflow-hidden p-0 min-h-0"
              : isChat
              ? "flex-1 overflow-hidden p-0 md:p-4 min-h-0"
              : "flex-1 overflow-x-hidden overflow-y-auto p-3.5 md:p-8 scrollbar-thin min-h-0"
          }>
            {children || <Outlet />}
          </main>
        </div>

        {!isQuizEditor && <CallFloatingLauncher />}
        {!isQuizEditor && <ChatExpressDock />}
        {!isQuizEditor && <PwaInstallPrompt />}
        {!isQuizEditor && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
