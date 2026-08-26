import React from "react";
import { WhatsAppGroupItem } from "@/hooks/useGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsersRound, Shield, Radio, Clock, MoreVertical, MessageSquare, Copy, Eye } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

interface GroupTableRowProps {
  group: WhatsAppGroupItem;
  isEven: boolean;
  onOpenDetails: (group: WhatsAppGroupItem) => void;
}

export const GroupTableRow: React.FC<GroupTableRowProps> = ({ group, isEven, onOpenDetails }) => {
  const navigate = useNavigate();

  const timeAgo = group.lastActivityAt
    ? formatDistanceToNow(new Date(group.lastActivityAt), { addSuffix: true, locale: ptBR })
    : "recente";

  const copyGroupJid = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(group.groupJid);
    toast.success("ID do grupo copiado!");
  };

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat?search=${encodeURIComponent(group.name)}`);
  };

  return (
    <tr
      onClick={() => onOpenDetails(group)}
      className={cn(
        "border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer",
        isEven ? "bg-transparent" : "bg-muted/20"
      )}
    >
      {/* GRUPO: Photo + Name */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 border border-border shrink-0">
            <AvatarImage src={group.pictureUrl || undefined} alt={group.name} className="object-cover" />
            <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-bold text-xs">
              <UsersRound className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[13px] font-bold text-foreground truncate max-w-[220px] hover:text-primary transition-colors">
                    {group.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{group.groupJid}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {group.description && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                {group.description}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* ID DO GRUPO */}
      <td className="px-4 py-3 align-middle font-mono text-[12px] text-muted-foreground">
        <div className="flex items-center gap-1.5 max-w-[180px]">
          <span className="truncate">{group.groupJid}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={copyGroupJid}
            title="Copiar ID"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </td>

      {/* PARTICIPANTES */}
      <td className="px-4 py-3 align-middle">
        <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 font-semibold gap-1.5 px-2 py-0.5 text-xs">
          <UsersRound className="h-3.5 w-3.5 text-indigo-600" />
          {group.participantsCount}
        </Badge>
      </td>

      {/* ADMINS */}
      <td className="px-4 py-3 align-middle">
        {group.adminsCount > 0 ? (
          <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 font-semibold gap-1 px-2 py-0.5 text-xs">
            <Shield className="h-3.5 w-3.5 text-amber-600" />
            {group.adminsCount}
          </Badge>
        ) : (
          <span className="text-[12px] text-muted-foreground">—</span>
        )}
      </td>

      {/* INSTÂNCIA */}
      <td className="px-4 py-3 align-middle text-[12px] text-muted-foreground">
        <div className="flex items-center gap-1.5 max-w-[170px] truncate" title={group.instanceName || "Instância"}>
          <Radio className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{group.instanceName || "Instância Geral"}</span>
        </div>
      </td>

      {/* ÚLTIMA ATIVIDADE */}
      <td className="px-4 py-3 align-middle text-[12px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>{timeAgo}</span>
        </div>
      </td>

      {/* DATA */}
      <td className="px-4 py-3 align-middle text-[12px] font-mono text-muted-foreground">
        {group.createdAt ? format(new Date(group.createdAt), "dd/MM/yyyy") : "—"}
      </td>

      {/* AÇÕES */}
      <td className="px-4 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#22c55e] hover:text-[#16a34a] hover:bg-green-50 dark:hover:bg-green-950/30"
            onClick={handleOpenChat}
            title="Abrir no Chat"
          >
            <WhatsappIcon className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 z-[99]">
              <DropdownMenuItem onClick={() => onOpenDetails(group)} className="gap-2 text-xs">
                <Eye className="h-4 w-4 text-primary" /> Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenChat} className="gap-2 text-xs">
                <MessageSquare className="h-4 w-4 text-emerald-500" /> Abrir no Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyGroupJid} className="gap-2 text-xs">
                <Copy className="h-4 w-4 text-blue-500" /> Copiar ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
};
