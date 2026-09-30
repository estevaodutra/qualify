import React from "react";
import { WhatsAppGroupItem } from "@/hooks/useGroups";
import { GroupFolder } from "@/hooks/useGroupFolders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GroupCardProps {
  group: WhatsAppGroupItem;
  folders?: GroupFolder[];
  onOpenDetails: (group: WhatsAppGroupItem) => void;
  onMoveToFolder?: (groupId: string, folderId: string | null) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  folders,
  onOpenDetails,
  onMoveToFolder,
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
    <Card
      onClick={() => onOpenDetails(group)}
      className="group relative overflow-hidden bg-card hover:bg-accent/40 border-border/60 transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer flex flex-col justify-between"
    >
      <CardContent className="p-5 space-y-4">
        {/* Header: Photo + Name + Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar className="h-12 w-12 border-2 border-border/60 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <AvatarImage src={group.pictureUrl || undefined} alt={group.name} className="object-cover" />
              <AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                <MessagesSquare className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 className="text-base font-bold text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                      {group.name}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {group.groupJid || "Sem ID vinculado"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {group.folderName && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/50 gap-1 px-1.5 py-0"
                  >
                    <Folder className="h-2.5 w-2.5" />
                    {group.folderName}
                  </Badge>
                )}

                {group.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-1 font-normal">
                    {group.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">
                    Sem descrição
                  </p>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* JID Badge or Status */}
        <div className="pt-0.5">
          {group.hasValidJid && group.groupJid ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg border border-border/40">
              <span className="truncate flex-1">{group.groupJid}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={copyGroupJid}
                title="Copiar ID"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-2 py-0.5"
            >
              Não vinculado ao WhatsApp
            </Badge>
          )}
        </div>

        {/* Info Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 font-semibold gap-1.5 px-2.5 py-1">
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            {group.participantsCount} participantes
          </Badge>

          {group.adminsCount > 0 && (
            <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 font-semibold gap-1 px-2 py-1">
              <Shield className="h-3.5 w-3.5 text-amber-600" />
              {group.adminsCount} {group.adminsCount === 1 ? "admin" : "admins"}
            </Badge>
          )}

          <Badge variant="outline" className="text-muted-foreground font-normal gap-1.5 px-2.5 py-1 max-w-[190px] truncate" title={group.instanceName || "Instância"}>
            <Radio className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{group.instanceName || "Instância Conectada"}</span>
          </Badge>
        </div>

        {/* Footer: Last activity */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Última atividade: <strong className="font-semibold text-foreground/80">{timeAgo}</strong></span>
          </div>

          <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            Detalhes →
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
