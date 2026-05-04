import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { useCallQueue } from "@/hooks/useCallQueue";

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Global queue tick loop — runs on all pages
  useCallQueue({ globalLoop: true });

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background relative overflow-hidden">
        {/* Design Clean e Solid */}

        <AppSidebar />

        <div className="flex flex-1 flex-col relative z-10 min-w-0">
          <AppHeader />
          <InstanceStatusBanner />
          <main className="flex-1 overflow-auto p-5 md:p-8 scrollbar-thin">
            {children}
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
