import { Outlet } from "react-router-dom";
import { AdminSubSidebar, SubSidebarItem } from "@/components/admin/AdminSubSidebar";
import { FileText, Tag, Image, ShieldAlert, Sparkles } from "lucide-react";

const contentItems: SubSidebarItem[] = [
  {
    title: "Templates Globais",
    url: "/admin/conteudo/templates",
    icon: FileText,
    description: "Modelos oficiais de mensagens",
  },
  {
    title: "Categorias",
    url: "/admin/conteudo/categorias",
    icon: Tag,
    description: "Segmentação de mercado & Skills",
  },
  {
    title: "Assets Globais",
    url: "/admin/conteudo/assets",
    icon: Image,
    description: "Mídias & logotipos oficiais",
  },
  {
    title: "Regras da Plataforma",
    url: "/admin/conteudo/regras",
    icon: ShieldAlert,
    description: "Compliance, anti-spam & taxas",
  },
];

export function AdminContentLayout() {
  return (
    <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)] bg-background">
      <AdminSubSidebar
        title="Conteúdo & Operação"
        subtitle="Recursos Oficiais Qualify"
        icon={FileText}
        items={contentItems}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
export default AdminContentLayout;
