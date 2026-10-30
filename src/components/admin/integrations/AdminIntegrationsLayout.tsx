import { Outlet } from "react-router-dom";
import { AdminSubSidebar, SubSidebarItem } from "@/components/admin/AdminSubSidebar";
import { Sparkles, Workflow, Radio, Zap, Plug } from "lucide-react";

const integrationItems: SubSidebarItem[] = [
  {
    title: "OpenAI",
    url: "/admin/integracoes/openai",
    icon: Sparkles,
    description: "Credencial única & LLM",
  },
  {
    title: "Meta / Instagram",
    url: "/admin/integracoes/meta",
    icon: Workflow,
    description: "Criafy, Graph API & tokens",
  },
  {
    title: "WhatsApp",
    url: "/admin/integracoes/whatsapp",
    icon: Radio,
    description: "Instâncias, QR codes & filas",
  },
  {
    title: "Webhooks",
    url: "/admin/integracoes/webhooks",
    icon: Zap,
    description: "Endpoints, eventos & retries",
  },
  {
    title: "Outras Integrações",
    url: "/admin/integracoes/outras",
    icon: Plug,
    description: "Telefonia, URAs & Gateways",
  },
];

export function AdminIntegrationsLayout() {
  return (
    <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)] bg-background">
      <AdminSubSidebar
        title="Integrações"
        subtitle="Gateways & Provedores"
        icon={Plug}
        items={integrationItems}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
export default AdminIntegrationsLayout;
