import { Checkbox } from "@/components/ui/checkbox";
import { Lead } from "@/types/crm.types";
import { cn, formatPhone } from "@/lib/utils";
import { LeadAvatar, LeadTags, LeadOwner, DealValue } from "../shared";
import { LeadActionsMenu } from "@/components/leads";
import { format } from "date-fns";

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
      </td>
    </tr>
  );
}
