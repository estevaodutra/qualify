import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AdminLayout({ children }: { children?: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      {/* Sidebar Desktop Fixa na Altura da Tela */}
      <aside className="hidden md:flex h-full shrink-0">
        <AdminSidebar />
      </aside>

      {/* Sidebar Mobile em Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 h-full">
          <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Área Principal com Header Fixo e Main com Scroll Independente */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ImpersonationBanner />
        <AdminHeader onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-muted/10">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
