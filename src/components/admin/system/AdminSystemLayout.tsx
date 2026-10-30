import { Outlet } from "react-router-dom";
import { AdminSubSidebar, SubSidebarItem } from "@/components/admin/AdminSubSidebar";
import { ScrollText, AlertTriangle, ListOrdered, FileCheck2, Flag, Sliders } from "lucide-react";

const systemItems: SubSidebarItem[] = [
  {
    title: "Logs",
    url: "/admin/sistema/logs",
    icon: ScrollText,
    description: "Tráfego de API, IA & eventos",
  },
  {
    title: "Erros",
    url: "/admin/sistema/erros",
    icon: AlertTriangle,
    description: "Falhas & exceções agrupadas",
  },
  {
    title: "Filas & Jobs",
    url: "/admin/sistema/jobs",
    icon: ListOrdered,
    description: "Discagem, envios & workers",
  },
  {
    title: "Auditoria",
    url: "/admin/sistema/auditoria",
    icon: FileCheck2,
    description: "Rastro de ações administrativas",
  },
  {
    title: "Feature Flags",
    url: "/admin/sistema/feature-flags",
    icon: Flag,
    description: "Habilitação em tempo real",
  },
  {
    title: "Configurações",
    url: "/admin/sistema/configuracoes",
    icon: Sliders,
    description: "Parâmetros gerais da plataforma",
  },
];

export function AdminSystemLayout() {
  return (
    <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)] bg-background">
      <AdminSubSidebar
        title="Sistema"
        subtitle="Diagnóstico & Infra"
        icon={Sliders}
        items={systemItems}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
export default AdminSystemLayout;
