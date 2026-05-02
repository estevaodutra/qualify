import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, History, Megaphone, Tag, Copy, ExternalLink, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/hooks/useLeads";

interface LeadActionsMenuProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onHistory: (lead: Lead) => void;
  onAddTag: (lead: Lead) => void;
  onAddToCampaign: (lead: Lead) => void;
  onBlock: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function LeadActionsMenu({ lead, onEdit, onHistory, onAddTag, onAddToCampaign, onBlock, onDelete }: LeadActionsMenuProps) {
  const copyPhone = () => {
    navigator.clipboard.writeText(lead.phone);
    toast.success("Telefone copiado!");
  };

  const openWhatsApp = () => {
    const clean = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(lead)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onHistory(lead)}>
          <History className="h-4 w-4 mr-2" /> Ver histórico
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAddToCampaign(lead)}>
          <Megaphone className="h-4 w-4 mr-2" /> Adicionar à campanha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddTag(lead)}>
          <Tag className="h-4 w-4 mr-2" /> Gerenciar tags
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyPhone}>
          <Copy className="h-4 w-4 mr-2" /> Copiar telefone
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openWhatsApp}>
          <ExternalLink className="h-4 w-4 mr-2" /> Abrir no WhatsApp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onBlock(lead)} className="text-amber-600">
          <Ban className="h-4 w-4 mr-2" /> Bloquear
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(lead)} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
