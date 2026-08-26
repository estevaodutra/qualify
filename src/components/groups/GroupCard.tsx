import React from "react";
import { WhatsAppGroupItem } from "@/hooks/useGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsersRound, Shield, Radio, Clock, MoreVertical, MessageSquare, Copy, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GroupCardProps {
  group: WhatsAppGroupItem;
  onOpenDetails: (group: WhatsAppGroupItem) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onOpenDetails }) => {
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
                <UsersRound className="h-6 w-6" />
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
                    <p className="text-[10px] text-muted-foreground font-mono">{group.groupJid}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {group.description ? (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                  {group.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic mt-0.5">
                  Sem descrição informada
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
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

        {/* Info Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 font-semibold gap-1.5 px-2.5 py-1">
            <UsersRound className="h-3.5 w-3.5 text-indigo-600" />
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
