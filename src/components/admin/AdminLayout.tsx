import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { AdminSidebar } from "./AdminSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children?: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden relative">
      {/* Sidebar Desktop Fixa na Altura Total da Tela */}
      <aside className="hidden md:flex h-full shrink-0">
        <AdminSidebar />
      </aside>

      {/* Sidebar Mobile em Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 h-full">
          <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Botão de Menu Flutuante para Dispositivos Móveis */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg bg-white/90 backdrop-blur border-slate-200 shadow-md text-slate-700"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Conteúdo Principal — Topbar Removida, Ocupando 100% da Área Útil */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ImpersonationBanner />

        <main className="flex-1 overflow-y-auto bg-muted/10">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
