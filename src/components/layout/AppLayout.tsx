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
  const [mobileViewport, setMobileViewport] = useState<{ height: number; keyboardOpen: boolean } | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    let expandedHeight = Math.max(viewport?.height ?? 0, window.innerHeight);
    let frame = 0;
    let blurTimer = 0;
    let settleTimer = 0;
    let wasDesktop = window.innerWidth >= 768;

    const syncViewport = () => {
      if (window.innerWidth >= 768) {
        wasDesktop = true;
        setMobileViewport(null);
        return;
      }

      const height = viewport?.height ?? window.innerHeight;
      if (wasDesktop) expandedHeight = Math.max(height, window.innerHeight);
      wasDesktop = false;
      const visibleHeight = height + (viewport?.offsetTop ?? 0);
      const focused = document.activeElement;
      const isEditing = focused instanceof HTMLElement && (
        focused.matches("textarea, input:not([type=checkbox]):not([type=radio]):not([type=file])") || focused.isContentEditable
      );
      const keyboardHeight = Math.max(
        expandedHeight - height,
        window.innerHeight - height - (viewport?.offsetTop ?? 0),
      );
      const keyboardOpen = isEditing && keyboardHeight > 120;

      // iOS can keep the visual viewport short for a moment after the keyboard closes.
      // Keep the last full height until the viewport reports its restored size.
      const restoredHeight = keyboardHeight > 120
        ? expandedHeight
        : Math.max(visibleHeight, window.innerHeight);
      if (!isEditing && keyboardHeight <= 120) expandedHeight = restoredHeight;
      const next = {
        height: Math.round(keyboardOpen ? visibleHeight : restoredHeight),
        keyboardOpen,
      };
      setMobileViewport((current) => current?.height === next.height && current.keyboardOpen === next.keyboardOpen ? current : next);
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncViewport);
    };
    const handleBlur = () => {
      window.clearTimeout(blurTimer);
      window.clearTimeout(settleTimer);
      blurTimer = window.setTimeout(scheduleSync, 120);
      settleTimer = window.setTimeout(() => {
        scheduleSync();
        if (window.location.pathname.startsWith("/chat") && window.scrollY > 0) {
          window.scrollTo(0, 0);
        }
      }, 350);
    };
    const handleOrientationChange = () => {
      expandedHeight = window.innerHeight;
      scheduleSync();
    };

    scheduleSync();
    viewport?.addEventListener("resize", scheduleSync);
    viewport?.addEventListener("scroll", scheduleSync);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", handleOrientationChange);
    document.addEventListener("focusin", scheduleSync);
    document.addEventListener("focusout", handleBlur);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(blurTimer);
      window.clearTimeout(settleTimer);
      viewport?.removeEventListener("resize", scheduleSync);
      viewport?.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", handleOrientationChange);
      document.removeEventListener("focusin", scheduleSync);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  const chatKeyboardOpen = isChat && mobileViewport?.keyboardOpen === true;

  return (
    <SidebarProvider defaultOpen>
      <div
        className="relative flex h-[100dvh] w-full max-w-full overflow-x-hidden overflow-y-hidden bg-background md:min-h-[100dvh]"
        style={mobileViewport ? { height: mobileViewport.height } : undefined}
      >
        {/* System Sidebar */}
        <AppSidebar />

        <div className={`relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden ${isQuizEditor ? "" : `pt-[max(env(safe-area-inset-top),32px)] ${chatKeyboardOpen ? "pb-0" : "pb-[calc(64px+env(safe-area-inset-bottom))]"} md:pt-0 md:pb-0`}`}>
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
