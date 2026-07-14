import { Checkbox } from "@/components/ui/checkbox";
import { Lead } from "@/types/crm.types";
import { cn, formatPhone } from "@/lib/utils";
import { LeadAvatar, LeadTags, LeadOwner, DealValue } from "../shared";
import { LeadActionsMenu } from "@/components/leads";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

interface LeadTableRowProps {
  lead: Lead;
  isEven: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (lead: Lead) => void;
  onHistory: (lead: Lead) => void;
  onAddTag: (lead: Lead) => void;
  onAddToCampaign: (lead: Lead) => void;
  onBlock: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  import_csv: "Importação CSV",
  whatsapp_group: "Grupo WhatsApp",
  api: "API Externa",
  manual: "Manual",
  call_campaign: "Campanha Ligação",
  dispatch_campaign: "Campanha Despacho",
  campaign_manual: "Campanha (manual)",
};

export function LeadTableRow({
  lead,
  isEven,
  isSelected,
  onToggleSelect,
  onEdit,
  onHistory,
  onAddTag,
  onAddToCampaign,
  onBlock,
  onDelete,
}: LeadTableRowProps) {
  const navigate = useNavigate();

  return (
    <tr className={cn("border-b border-border/50", isEven ? "bg-transparent" : "bg-muted/30")}>
      <td className="px-4 py-3 align-middle w-10">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(lead.id)} className="rounded-sm w-3.5 h-3.5" />
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2.5">
          <LeadAvatar name={lead.name} className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">{lead.name || "Sem Nome"}</span>
            <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">{lead.company_name || ""}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-[12px] font-mono text-muted-foreground">
        <div className="flex flex-col gap-0.5">
          <span>{lead.phone ? formatPhone(lead.phone) : "—"}</span>
          <span className="text-[10px] truncate max-w-[120px]">{lead.email || ""}</span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <LeadOwner ownerName={lead.owner_id ? "Responsável" : null} />
      </td>
      <td className="px-4 py-3 align-middle">
        <LeadTags tags={lead.tags} maxVisible={2} />
      </td>
      <td className="px-4 py-3 align-middle text-center">
        <span className="text-[13px] font-medium">{lead.active_deals_count || 0}</span>
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <DealValue value={lead.total_open_value || 0} />
      </td>
      <td className="px-4 py-3 align-middle text-[12px] text-muted-foreground">
        {lead.last_interaction_at ? format(new Date(lead.last_interaction_at), "dd/MM/yy HH:mm") : "—"}
      </td>
      <td className="px-4 py-3 align-middle text-[12px] text-muted-foreground">
        {lead.next_activity_at ? format(new Date(lead.next_activity_at), "dd/MM/yy HH:mm") : "—"}
      </td>
      <td className="px-4 py-3 align-middle text-[12px] text-muted-foreground">
        {lead.source_name || SOURCE_LABELS[lead.source_type || ""] || "—"}
      </td>
      <td className="px-4 py-3 align-middle text-[12px] font-mono text-muted-foreground">
        {format(new Date(lead.created_at), "dd/MM/yyyy")}
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <div className="flex items-center justify-end gap-2">
          {lead.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#22c55e] hover:text-[#16a34a] hover:bg-green-50"
              onClick={() => navigate(`/chat?leadId=${lead.id}&phone=${lead.phone.replace(/\D/g, '')}`)}
              title="Abrir no Chat"
            >
              <WhatsappIcon className="h-5 w-5" />
            </Button>
          )}
          {/* We reuse the existing LeadActionsMenu */}
          <LeadActionsMenu
            lead={lead as any} // Cast needed if typing isn't 100% matched yet
            onEdit={() => onEdit(lead)}
            onHistory={() => onHistory(lead)}
            onAddTag={() => onAddTag(lead)}
            onAddToCampaign={() => onAddToCampaign(lead)}
            onBlock={() => onBlock(lead)}
            onDelete={() => onDelete(lead)}
          />
        </div>
      </td>
    </tr>
  );
}
