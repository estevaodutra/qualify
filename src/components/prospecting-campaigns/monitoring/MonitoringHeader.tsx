import { ArrowLeft, MapPin, Search, Calendar, Bot, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/prospecting-status";
import type { ProspectingCampaign } from "@/hooks/useProspectingCampaigns";

interface MonitoringHeaderProps {
  campaign: ProspectingCampaign;
  automationName?: string;
  instanceName?: string;
}

export function MonitoringHeader({ campaign, automationName, instanceName }: MonitoringHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/prospeccao")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{campaign.name}</h2>
        <Badge className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 border ${STATUS_COLORS[campaign.status]}`}>
          {STATUS_LABELS[campaign.status]}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 ml-12 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> {campaign.searchTerms}</span>
        {campaign.places && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {campaign.places}</span>}
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> {format(new Date(campaign.createdAt), "dd MMM yyyy", { locale: ptBR })}
        </span>
        {automationName && <span className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> {automationName}</span>}
        {instanceName && <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> {instanceName}</span>}
      </div>
    </div>
  );
}
