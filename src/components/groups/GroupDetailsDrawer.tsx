import React, { useState } from "react";
import { WhatsAppGroupItem } from "@/hooks/useGroups";
import { useGroupDetails } from "@/hooks/useGroupDetails";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UsersRound, Shield, Copy, MessageSquare, Search, ChevronLeft, ChevronRight, Phone, RefreshCw, UserPlus, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface GroupDetailsDrawerProps {
  group: WhatsAppGroupItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GroupDetailsDrawer: React.FC<GroupDetailsDrawerProps> = ({ group, open, onOpenChange }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [searchParticipant, setSearchParticipant] = useState("");
  const [participantPage, setParticipantPage] = useState(1);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isSavingLeads, setIsSavingLeads] = useState(false);

  const { data: detailsData, isLoading: isLoadingParticipants, refetch: refetchDetails } = useGroupDetails(
    group?.groupJid || group?.id || null,
    searchParticipant,
    participantPage,
    20
  );

  if (!group) return null;

  const copyGroupJid = () => {
    navigator.clipboard.writeText(group.groupJid);
    toast.success("ID do grupo copiado!");
  };

  const handleOpenChat = () => {
    onOpenChange(false);
    navigate(`/chat?search=${encodeURIComponent(group.name)}`);
  };

  // Action 1: Execute group.info on WhatsApp provider to retrieve all group members & metadata
  const handleFetchGroupInfo = async () => {
    if (!group.instanceId) {
      toast.error("Instância do WhatsApp não identificada neste grupo.");
      return;
    }

    setIsFetchingInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-instance-groups", {
        body: {
          instanceId: group.instanceId,
          companyId: activeCompanyId,
          userId: currentUserId,
          selectedJids: [group.groupJid],
        },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["group_details"] });
      queryClient.invalidateQueries({ queryKey: ["groups_list"] });
      await refetchDetails();

      toast.success("Informações e membros do grupo atualizados do WhatsApp com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao buscar dados do grupo no WhatsApp: ${err.message || String(err)}`);
    } finally {
      setIsFetchingInfo(false);
    }
  };

  // Action 2: Save all group participants into CRM leads table
  const handleSaveLeadsToCRM = async () => {
    const participantsList = detailsData?.allParticipants || detailsData?.participants || [];

    if (participantsList.length === 0) {
      toast.error("Nenhum participante encontrado neste grupo para salvar no CRM. Clique em 'Buscar Membros' primeiro.");
      return;
    }

    setIsSavingLeads(true);
    let savedCount = 0;

    try {
      const targetUserId = currentUserId || activeCompanyId;

      for (const p of participantsList) {
        const cleanPhone = String(p.phone).replace(/\D/g, "");
        if (!cleanPhone) continue;

        const leadName = p.name && !p.name.includes("@g.us") ? p.name : `Participante ${cleanPhone}`;

        // Safe select -> update or insert into leads
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("company_id", activeCompanyId)
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (existingLead?.id) {
          await supabase
            .from("leads")
            .update({
              name: leadName,
              user_id: targetUserId,
              notes: `Importado do grupo: ${group.name} (${group.groupJid})`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLead.id);
        } else {
          await supabase.from("leads").insert({
            company_id: activeCompanyId,
            user_id: targetUserId,
            name: leadName,
            phone: cleanPhone,
            notes: `Importado do grupo: ${group.name} (${group.groupJid})`,
            status: "novo",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        savedCount++;
      }

      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${savedCount} participantes salvos com sucesso como Leads no CRM!`);
    } catch (err: any) {
      toast.error(`Erro ao salvar leads no CRM: ${err.message || String(err)}`);
    } finally {
      setIsSavingLeads(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background border-l border-border shadow-2xl z-[9999]">
        {/* Header Section */}
        <SheetHeader className="p-6 pb-4 border-b border-border space-y-4 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0 shadow-md">
                <AvatarImage src={group.pictureUrl || undefined} alt={group.name} className="object-cover" />
                <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-bold text-xl">
                  <UsersRound className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <SheetTitle className="text-xl font-bold text-foreground truncate tracking-tight">
                  {group.name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground bg-background/80 px-2 py-0.5 max-w-[220px] truncate">
                    {group.groupJid}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={copyGroupJid} title="Copiar ID">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={handleOpenChat} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0">
              <MessageSquare className="h-4 w-4" />
              Abrir no Chat
            </Button>
          </div>

          {/* Description */}
          {group.description && (
            <div className="p-3.5 bg-background border border-border/80 rounded-xl text-xs text-foreground/90 leading-relaxed font-normal">
              <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Descrição do Grupo</p>
              <p className="whitespace-pre-wrap">{group.description}</p>
            </div>
          )}

          {/* Action Toolbar: Fetch Group Info & Save Leads to CRM */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isFetchingInfo}
              onClick={handleFetchGroupInfo}
              className="text-xs font-bold gap-2 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200/60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingInfo ? "animate-spin" : ""}`} />
              {isFetchingInfo ? "Buscando..." : "Buscar Membros no WhatsApp (group.info)"}
            </Button>

            <Button
              size="sm"
              disabled={isSavingLeads}
              onClick={handleSaveLeadsToCRM}
              className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSavingLeads ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {isSavingLeads ? "Salvando..." : "Salvar Participantes no CRM"}
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-background border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Participantes</span>
              <span className="text-base font-extrabold text-foreground">
                {detailsData?.totalCount || group.participantsCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-background border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Administradores</span>
              <span className="text-base font-extrabold text-amber-600">{group.adminsCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background border border-border/60 truncate">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block truncate">Instância</span>
              <span className="text-xs font-bold text-foreground truncate block mt-1" title={group.instanceName || "Conectada"}>
                {group.instanceName || "Instância Geral"}
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Body Section: Participants List */}
        <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-primary" />
              Participantes ({detailsData?.totalCount || group.participantsCount})
            </h4>

            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar participante..."
                value={searchParticipant}
                onChange={(e) => {
                  setSearchParticipant(e.target.value);
                  setParticipantPage(1);
                }}
                className="pl-8 h-8 text-xs bg-muted/20"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 pr-3">
            {isLoadingParticipants ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : detailsData?.participants && detailsData.participants.length > 0 ? (
              <div className="space-y-2">
                {detailsData.participants.map((p) => (
                  <div
                    key={p.id || p.phone}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-border shrink-0">
                        <AvatarImage src={p.profilePhoto || undefined} alt={p.name || p.phone} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {(p.name || p.phone).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {p.name || p.phone}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{p.phone}</span>
                          {p.lid && <span className="text-[10px] text-muted-foreground/60">({p.lid})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.role === "admin" || p.role === "superadmin" ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold gap-1 px-2 py-0.5">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] font-normal px-2 py-0.5">
                          Participante
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <UsersRound className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Nenhum participante listado localmente. Clique no botão acima para buscar os membros do WhatsApp.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isFetchingInfo}
                  onClick={handleFetchGroupInfo}
                  className="text-xs font-bold gap-2 text-indigo-600 border-indigo-200"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetchingInfo ? "animate-spin" : ""}`} />
                  Buscar Membros do WhatsApp
                </Button>
              </div>
            )}
          </ScrollArea>

          {/* Participant Pagination */}
          {detailsData && detailsData.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Página {participantPage} de {detailsData.totalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={participantPage <= 1}
                  onClick={() => setParticipantPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={participantPage >= detailsData.totalPages}
                  onClick={() => setParticipantPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
