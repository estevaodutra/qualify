import React, { useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Search,
  Pencil,
  Link2,
  Heart,
  List,
  Bookmark,
  Trash2,
  LogOut,
  ThumbsDown,
  ShieldCheck,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageCircle,
  Copy,
  Check,
  Camera,
  Loader2,
} from "lucide-react";
import { ChatConversation } from "@/hooks/useChat";
import { useGroupInfo, GroupParticipant } from "@/hooks/useGroupInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GroupAddParticipantModal } from "@/components/whatsapp/group-management/GroupAddParticipantModal";
import { GroupInviteLinkModal } from "@/components/whatsapp/group-management/GroupInviteLinkModal";

interface GroupContextPanelProps {
  conversation: ChatConversation;
  onClose?: () => void;
}

export default function GroupContextPanel({ conversation, onClose }: GroupContextPanelProps) {
  const {
    group,
    isLoading,
    isSyncing,
    syncGroup,
    updateName,
    isUpdatingName,
    updateDescription,
    isUpdatingDescription,
  } = useGroupInfo(conversation);

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(group.description);

  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Modais auxiliares
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);

  // Formatação de telefone
  const formatPhone = (phoneStr: string) => {
    const clean = phoneStr.replace(/\D/g, "");
    if (!clean) return phoneStr;
    if (clean.length === 13 && clean.startsWith("55")) {
      return `+55 ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 12 && clean.startsWith("55")) {
      return `+55 ${clean.slice(2, 4)} ${clean.slice(4, 8)}-${clean.slice(8)}`;
    }
    return `+${clean}`;
  };

  // Filtragem de membros
  const filteredParticipants = (group.participants || []).filter((p) => {
    if (!memberSearch) return true;
    const term = memberSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      p.phone.includes(term) ||
      (p.lid && p.lid.toLowerCase().includes(term))
    );
  });

  const visibleParticipants = showAllMembers
    ? filteredParticipants
    : filteredParticipants.slice(0, 10);

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    updateName(nameInput.trim());
    setIsEditingName(false);
  };

  const handleSaveDesc = () => {
    updateDescription(descInput.trim());
    setIsEditingDesc(false);
  };

  const groupInitial = (group.name || "G").charAt(0).toUpperCase();

  return (
    <div className="h-full w-full flex flex-col bg-background/95 border-l border-border/40 overflow-y-auto select-none">
      {/* 1. Header do Painel */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            title="Fechar dados do grupo"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold text-foreground">Dados do grupo</h2>
        </div>

        <button
          onClick={() => syncGroup()}
          disabled={isSyncing || isLoading}
          className="p-1.5 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          title="Sincronizar informações do grupo"
        >
          <RefreshCw className={cn("h-4 w-4", (isSyncing || isLoading) && "animate-spin text-primary")} />
        </button>
      </div>

      <div className="flex-1 divide-y divide-border/30 pb-12">
        {/* 2. Banner do Grupo (Foto, Título, Subtítulo, Ações Rápidas) */}
        <div className="flex flex-col items-center p-6 space-y-4 text-center bg-card/30">
          {/* Avatar Grande */}
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-border/30">
              <AvatarImage src={group.pictureUrl || undefined} alt={group.name} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold bg-purple-600 text-white">
                {groupInitial}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="h-7 w-7 text-white" />
            </div>
          </div>

          {/* Nome do Grupo */}
          <div className="w-full flex items-center justify-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="text-center font-bold text-base h-9"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <Button size="sm" onClick={handleSaveName} disabled={isUpdatingName} className="h-9 px-3">
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="h-9 px-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 max-w-full">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight line-clamp-2">
                  {group.name}
                </h1>
                <button
                  onClick={() => {
                    setNameInput(group.name);
                    setIsEditingName(true);
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  title="Editar nome do grupo"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Subtítulo: Grupo · X membros */}
          <p className="text-xs text-muted-foreground font-medium">
            Grupo · <span className="text-emerald-500 font-bold">{group.participantsCount || group.participants.length} membros</span>
          </p>

          {/* Botões Redondos de Ação (Adicionar, Pesquisar) */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <button
              onClick={() => setAddMemberOpen(true)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">Adicionar</span>
            </button>

            <button
              onClick={() => setShowMemberSearch(!showMemberSearch)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                <Search className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">Pesquisar</span>
            </button>
          </div>
        </div>

        {/* 3. Descrição do Grupo */}
        <div className="p-4 space-y-2 bg-background">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição do grupo</h3>
            <button
              onClick={() => {
                setDescInput(group.description);
                setIsEditingDesc(true);
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Editar descrição"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          {isEditingDesc ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Adicionar descrição do grupo..."
                rows={4}
                className="text-xs leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveDesc} disabled={isUpdatingDescription}>
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-foreground/90 leading-relaxed break-words pt-0.5">
              {group.description ? (
                <div>
                  <p className={cn("whitespace-pre-line", !isDescExpanded && "line-clamp-3")}>
                    {group.description}
                  </p>
                  {group.description.length > 120 && (
                    <button
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="text-xs font-bold text-emerald-500 hover:text-emerald-400 mt-1 inline-block"
                    >
                      {isDescExpanded ? "Ler menos" : "Ler mais"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground/60 italic text-xs">Nenhuma descrição informada.</p>
              )}
            </div>
          )}
        </div>

        {/* 4. Lista de Participantes */}
        <div className="p-4 space-y-3 bg-background">
          {/* Header da lista de membros com barra de busca opcional */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {group.participantsCount || group.participants.length} membros
            </h3>
            <button
              onClick={() => setShowMemberSearch(!showMemberSearch)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Buscar participante"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {showMemberSearch && (
            <div className="relative animate-in fade-in duration-200">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar membro..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-8 text-xs h-8"
                autoFocus
              />
            </div>
          )}

          {/* Ação: Adicionar membro */}
          <div
            onClick={() => setAddMemberOpen(true)}
            className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground">Adicionar membro</h4>
            </div>
          </div>

          {/* Ação: Convidar via link */}
          <div
            onClick={() => setInviteLinkOpen(true)}
            className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground">Convidar via link</h4>
            </div>
          </div>

          {/* Lista de Membros */}
          <div className="space-y-1 pt-1">
            {visibleParticipants.map((participant, index) => {
              const displayName = participant.name || formatPhone(participant.phone);
              const isLeadPhone = participant.phone === conversation.lead?.phone;

              return (
                <div
                  key={participant.phone || participant.lid || index}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                      <AvatarImage src={participant.profilePhoto || undefined} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate">
                          {displayName}
                        </span>
                        {participant.isAdmin && (
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
                            Admin do grupo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {participant.status || "Olá! Eu estou usando o WhatsApp."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                      {formatPhone(participant.phone)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(participant.phone);
                            toast.success("Número copiado!");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-2" /> Copiar número
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-500"
                          onClick={() => {
                            toast.info(`Remover ${displayName}...`);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover do grupo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}

            {/* Botão Ver Tudo (Paginação) */}
            {filteredParticipants.length > 10 && !showAllMembers && (
              <button
                onClick={() => setShowAllMembers(true)}
                className="w-full py-2.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center justify-center gap-1 transition-colors"
              >
                <span>Ver tudo (mais {filteredParticipants.length - 10})</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            )}

            {showAllMembers && filteredParticipants.length > 10 && (
              <button
                onClick={() => setShowAllMembers(false)}
                className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
              >
                <span>Mostrar menos</span>
                <ChevronUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 5. Ações Inferiores (WhatsApp Web Style) */}
        <div className="p-4 space-y-1 bg-background">
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors text-foreground">
            <List className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Mostrar mudanças de membros</span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors text-foreground">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Adicionar aos Favoritos</span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors text-foreground">
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Adicionar à lista</span>
          </div>

          <div className="pt-2 border-t border-border/30 space-y-1">
            <div
              onClick={() => toast.info("Função de limpar conversa acionada.")}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/10 cursor-pointer transition-colors text-rose-500 font-semibold"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-xs">Limpar conversa</span>
            </div>

            <div
              onClick={() => toast.info("Função de sair do grupo.")}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/10 cursor-pointer transition-colors text-rose-500 font-semibold"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Sair do grupo</span>
            </div>

            <div
              onClick={() => toast.info("Função de denunciar grupo.")}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/10 cursor-pointer transition-colors text-rose-500 font-semibold"
            >
              <ThumbsDown className="h-4 w-4" />
              <span className="text-xs">Denunciar grupo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modais auxiliares */}
      {addMemberOpen && conversation.instance_id && (
        <GroupAddParticipantModal
          instanceId={conversation.instance_id}
          groupId={group.jid}
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          onSuccess={() => syncGroup()}
        />
      )}

      {inviteLinkOpen && conversation.instance_id && (
        <GroupInviteLinkModal
          instanceId={conversation.instance_id}
          groupId={group.jid}
          open={inviteLinkOpen}
          onOpenChange={setInviteLinkOpen}
        />
      )}
    </div>
  );
}
