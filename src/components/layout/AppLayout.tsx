// src/components/layout/AppLayout.tsx
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { ImpersonationBanner } from "../admin/ImpersonationBanner";
import { useCallQueue } from "@/hooks/useCallQueue";
import { ChatExpressDock } from "@/components/chat/express/ChatExpressDock";
import { WebphoneDock } from "@/components/webphone/WebphoneDock";
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
  const [keyboardViewportHeight, setKeyboardViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    let expandedHeight = viewport?.height ?? window.innerHeight;
    let frame = 0;
    let blurTimer = 0;

    const syncViewport = () => {
      if (window.innerWidth >= 768) {
        setKeyboardViewportHeight(null);
        return;
      }

      const height = viewport?.height ?? window.innerHeight;
      const focused = document.activeElement;
      const isEditing = focused instanceof HTMLElement && (
        focused.matches("textarea, input:not([type=checkbox]):not([type=radio]):not([type=file])") || focused.isContentEditable
      );
      const keyboardHeight = Math.max(
        expandedHeight - height,
        window.innerHeight - height - (viewport?.offsetTop ?? 0),
      );
      if (!isEditing && keyboardHeight > 120) return;
      const isOpen = isEditing && keyboardHeight > 120;

      if (!isEditing) expandedHeight = height;
      setKeyboardViewportHeight(isOpen ? Math.round(height + (viewport?.offsetTop ?? 0)) : null);
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncViewport);
    };
    const handleBlur = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(scheduleSync, 120);
    };

    scheduleSync();
    viewport?.addEventListener("resize", scheduleSync);
    viewport?.addEventListener("scroll", scheduleSync);
    window.addEventListener("resize", scheduleSync);
    document.addEventListener("focusin", scheduleSync);
    document.addEventListener("focusout", handleBlur);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(blurTimer);
      viewport?.removeEventListener("resize", scheduleSync);
      viewport?.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("focusin", scheduleSync);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  const chatKeyboardOpen = isChat && keyboardViewportHeight !== null;

  return (
    <SidebarProvider defaultOpen>
      <div
        className={`flex w-full max-w-full bg-background relative overflow-x-hidden overflow-y-hidden ${chatKeyboardOpen ? "" : "min-h-[100dvh]"}`}
        style={chatKeyboardOpen ? { height: keyboardViewportHeight } : undefined}
      >
        {/* System Sidebar */}
        <AppSidebar />

        <div className={`flex flex-1 flex-col relative z-10 min-w-0 ${chatKeyboardOpen ? "h-full" : "h-[100dvh]"} overflow-hidden ${isQuizEditor ? "" : `pt-[max(env(safe-area-inset-top),32px)] ${chatKeyboardOpen ? "pb-0" : "pb-[calc(64px+env(safe-area-inset-bottom))]"} md:pt-0 md:pb-0`}`}>
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
        {!isQuizEditor && <WebphoneDock />}
        {!isQuizEditor && <ChatExpressDock />}
        {!isQuizEditor && <PwaInstallPrompt />}
        {!isQuizEditor && !chatKeyboardOpen && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
