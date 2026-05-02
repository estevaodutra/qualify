import { Bot } from "lucide-react";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { EmptyState } from "@/components/dispatch";

export default function URACampaigns() {
  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="telefonia" type="URA" />
      
      <div>
        <h1 className="text-2xl font-bold">Campanhas de URA</h1>
        <p className="text-muted-foreground">Fluxo de áudio interativo com DTMF</p>
      </div>

      <EmptyState
        icon={Bot}
        title="Em breve"
        description="Este tipo de campanha ainda está em desenvolvimento e estará disponível em breve."
      />
    </div>
  );
}
