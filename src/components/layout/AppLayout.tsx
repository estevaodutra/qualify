// src/components/layout/AppLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { ImpersonationBanner } from "../admin/ImpersonationBanner";
import { useCallQueue } from "@/hooks/useCallQueue";
import { ChatExpressDock } from "@/components/chat/express/ChatExpressDock";

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Global queue tick loop — runs on all pages
  useCallQueue({ globalLoop: true });
  const location = useLocation();

  // Check if current route is Quiz Editor or Chat
  const isQuizEditor = location.pathname.startsWith("/quiz/") && location.pathname !== "/quiz";
  const isChat = location.pathname.startsWith("/chat");

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background relative overflow-hidden">
        {/* System Sidebar */}
        <AppSidebar />

        <div className="flex flex-1 flex-col relative z-10 min-w-0 h-screen overflow-hidden">
          <ImpersonationBanner />
          {!isQuizEditor && <AppHeader />}
          {!isQuizEditor && <InstanceStatusBanner />}
          <main className={
            isQuizEditor
              ? "flex-1 overflow-hidden p-0 h-screen"
              : isChat
              ? "flex-1 overflow-hidden p-3 md:p-4 h-[calc(100vh-60px)]"
              : "flex-1 overflow-auto p-5 md:p-8 scrollbar-thin"
          }>
            {children || <Outlet />}
          </main>
        </div>

        {!isQuizEditor && <ChatExpressDock />}
      </div>
    </SidebarProvider>
  );
}
