import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AdminLayout({ children }: { children?: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background w-full">
      {/* Sidebar Desktop Fixa */}
      <aside className="hidden md:flex shrink-0">
        <AdminSidebar />
      </aside>

      {/* Sidebar Mobile em Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Conteúdo Principal + Header Global */}
      <div className="flex-1 flex flex-col min-w-0">
        <ImpersonationBanner />
        <AdminHeader onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 flex flex-col overflow-auto bg-muted/10">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
