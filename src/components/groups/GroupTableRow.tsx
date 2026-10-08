import React from "react";
import { WhatsAppGroupItem } from "@/hooks/useGroups";
import { GroupFolder } from "@/hooks/useGroupFolders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessagesSquare,
  Shield,
  Radio,
  Clock,
  MoreVertical,
  MessageSquare,
  Copy,
  Eye,
  Folder,
  FolderInput,
  Check,
  Users,
  Trash2,
} from "lucide-react";
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
  folders?: GroupFolder[];
  onOpenDetails: (group: WhatsAppGroupItem) => void;
  onMoveToFolder?: (groupId: string, folderId: string | null) => void;
  onRemoveFromCrm?: (group: WhatsAppGroupItem) => void;
}

export const GroupTableRow: React.FC<GroupTableRowProps> = ({
  group,
  isEven,
  folders,
  onOpenDetails,
  onMoveToFolder,
  onRemoveFromCrm,
}) => {
  const navigate = useNavigate();

  const timeAgo = group.lastActivityAt
    ? formatDistanceToNow(new Date(group.lastActivityAt), { addSuffix: true, locale: ptBR })
    : "recente";

  const copyGroupJid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!group.groupJid) return;
    navigator.clipboard.writeText(group.groupJid);
    toast.success("ID do grupo copiado!");
  };

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat?search=${encodeURIComponent(group.name)}`);
  };

  return (
    <tr
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-group-id", group.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpenDetails(group)}
      className={cn(
        "border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer",
        isEven ? "bg-transparent" : "bg-muted/20"
      )}
    >
      {/* GRUPO: Photo + Name + JID + Folder */}
      <td className="px-3.5 py-2.5 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 border border-border shrink-0">
            <AvatarImage src={group.pictureUrl || undefined} alt={group.name} className="object-cover" />
            <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-bold text-xs">
              <MessagesSquare className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[12px] font-bold text-foreground truncate max-w-[200px] hover:text-primary transition-colors">
                    {group.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {group.groupJid || "Sem ID vinculado"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {group.groupJid ? (
                <button
                  type="button"
                  onClick={copyGroupJid}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono hover:text-foreground transition-colors group/jid"
                  title="Clique para copiar o ID do WhatsApp"
                >
                  <span className="truncate max-w-[130px]">{group.groupJid}</span>
                  <Copy className="h-2.5 w-2.5 shrink-0 opacity-70 group-hover/jid:opacity-100" />
                </button>
              ) : (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">Sem ID</span>
              )}

              {group.folderName && (
                <Badge
                  variant="outline"
                  className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/50 gap-1 px-1.5 py-0"
                >
                  <Folder className="h-2 w-2" />
                  {group.folderName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* PARTICIPANTES */}
      <td className="px-2 py-2.5 align-middle text-center whitespace-nowrap w-20">
        <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 font-semibold gap-1 px-2 py-0.5 text-[11px]">
          <Users className="h-3 w-3 text-indigo-600" />
          {group.participantsCount}
        </Badge>
      </td>

      {/* ADMINS */}
      <td className="px-2 py-2.5 align-middle text-center whitespace-nowrap w-16">
        {group.adminsCount > 0 ? (
          <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 font-semibold gap-1 px-2 py-0.5 text-[11px]">
            <Shield className="h-3 w-3 text-amber-600" />
            {group.adminsCount}
          </Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>

      {/* INSTÂNCIA */}
      <td className="px-3 py-2.5 align-middle text-[11px] text-muted-foreground whitespace-nowrap hidden sm:table-cell w-32">
        <div className="flex items-center gap-1 max-w-[120px] truncate" title={group.instanceName || "Instância"}>
          <Radio className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="truncate">{group.instanceName || "Instância Geral"}</span>
        </div>
      </td>

      {/* ÚLTIMA ATIVIDADE */}
      <td className="px-3 py-2.5 align-middle text-[11px] text-muted-foreground whitespace-nowrap hidden md:table-cell w-32">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
          <span className="whitespace-nowrap">{timeAgo}</span>
        </div>
      </td>

      {/* DATA */}
      <td className="px-3 py-2.5 align-middle text-[11px] font-mono text-muted-foreground whitespace-nowrap hidden 2xl:table-cell w-24">
        {group.createdAt ? format(new Date(group.createdAt), "dd/MM/yyyy") : "—"}
      </td>

      {/* AÇÕES */}
      <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap w-16" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#22c55e] hover:text-[#16a34a] hover:bg-green-50 dark:hover:bg-green-950/30"
            onClick={handleOpenChat}
            title="Abrir no Chat"
          >
            <WhatsappIcon className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[99]">
              <DropdownMenuItem onClick={() => onOpenDetails(group)} className="gap-2 text-xs">
                <Eye className="h-4 w-4 text-primary" /> Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenChat} className="gap-2 text-xs">
                <MessageSquare className="h-4 w-4 text-emerald-500" /> Abrir no Chat
              </DropdownMenuItem>

              {group.hasValidJid && (
                <DropdownMenuItem onClick={copyGroupJid} className="gap-2 text-xs">
                  <Copy className="h-4 w-4 text-blue-500" /> Copiar ID
                </DropdownMenuItem>
              )}

              {/* Move to folder submenu */}
              {onMoveToFolder && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 text-xs">
                    <FolderInput className="h-4 w-4 text-amber-500" /> Mover para pasta
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem
                      onClick={() => onMoveToFolder(group.id, null)}
                      className="gap-2 text-xs"
                    >
                      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Sem pasta</span>
                      {!group.folderId && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                    </DropdownMenuItem>
                    {folders && folders.length > 0 && (
                      <div className="h-px bg-border my-1" />
                    )}
                    {folders?.map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        onClick={() => onMoveToFolder(group.id, f.id)}
                        className="gap-2 text-xs"
                      >
                        <Folder className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="truncate flex-1">{f.name}</span>
                        {group.folderId === f.id && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {onRemoveFromCrm && (
                <>
                  <div className="h-px bg-border my-1" />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromCrm(group);
                    }}
                    className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span>Remover do CRM</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
};
