import { useState } from "react";
import { List, Users, Plus, Trash2, Search, MoreVertical, Pencil, Image, FileText, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Settings, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInstances } from "@/hooks/useInstances";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useLanguage } from "@/i18n/LanguageContext";
import { useWebhookConfigs, getWebhookUrlForCategory } from "@/hooks/useWebhookConfigs";
import { buildGroupPayload } from "@/lib/webhook-utils";
import { toast } from "sonner";
import {
  GroupUpdateNameModal,
  GroupUpdatePhotoModal,
  GroupUpdateDescriptionModal,
  GroupAddParticipantModal,
  GroupRemoveParticipantModal,
  GroupPromoteAdminModal,
  GroupRemoveAdminModal,
  GroupSettingsModal,
  GroupInviteLinkModal,
} from "@/components/whatsapp/group-management";

interface WhatsAppGroup {
  phone: string;
  name: string;
  isGroup: boolean;
  pinned: string;
  archived: string;
  messagesUnread: string;
  isMuted: string;
  communityId: string;
  lastMessageTime: string;
  isGroupAnnouncement?: boolean;
  ephemeralExpiration?: number;
}

interface GroupsListTabProps {
  campaignId?: string;
}

type GroupAction = 'rename' | 'photo' | 'description' | 'addParticipant' | 'removeParticipant' | 'promoteAdmin' | 'removeAdmin' | 'settings' | 'inviteLink';

interface ActiveGroupAction {
  groupJid: string;
  instanceId: string;
  groupName: string;
  action: GroupAction;
}

export function GroupsListTab({ campaignId }: GroupsListTabProps) {
  const { t } = useLanguage();
  const { instances, isLoading: instancesLoading } = useInstances();
  const { configs } = useWebhookConfigs();
  const { 
    linkedGroups, 
    isLoading: linkedLoading, 
    addGroups, 
    removeGroup, 
    isAdding, 
    isRemoving 
  } = useCampaignGroups(campaignId);
  const { addMembersBulk } = useGroupMembers(campaignId || null);
  
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeAction, setActiveAction] = useState<ActiveGroupAction | null>(null);


  const connectedInstances = instances?.filter(i => i.status === "connected") || [];

  // Filter out already linked groups from the available list
  const availableGroups = groups.filter(
    group => !linkedGroups.some(lg => lg.groupJid === group.phone)
  );

  const filteredGroups = availableGroups.filter(
    group => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return group.name.toLowerCase().includes(term) || group.phone.toLowerCase().includes(term);
    }
  );

  const toggleGroupSelection = (phone: string) => {
    setSelectedGroups(prev => 
      prev.includes(phone) 
        ? prev.filter(p => p !== phone)
        : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(g => g.phone));
    }
  };

  const handleListGroups = async () => {
    if (!selectedInstance) return;
    
    const instance = instances?.find(i => i.id === selectedInstance);
    if (!instance) {
      toast.error("Instância não encontrada");
      return;
    }
    
    setIsLoading(true);
    setHasFetched(true);
    setSelectedGroups([]);
    
    try {
      // Usar URL dinâmica do webhook
      const webhookUrl = getWebhookUrlForCategory("groups", configs);
      const payload = buildGroupPayload({
        action: "group.list",
        instance: {
          id: instance.id,
          name: instance.name,
          phone: instance.phoneNumber || "",
          provider: instance.provider,
          externalId: instance.idInstance || "",
          externalToken: instance.tokenInstance || "",
        },
        campaign: campaignId ? {
          id: campaignId,
          name: "",
        } : undefined,
      });
      
      const response = await fetch(
        webhookUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        throw new Error("Falha ao buscar grupos");
      }
      
      const data = await response.json();
      
      // Filter only groups (isGroup === true)
      const rawGroups = data.groups || data || [];
      const groupsOnly = rawGroups.filter((item: WhatsAppGroup) => item.isGroup === true);
      
      setGroups(groupsOnly);
      
      toast.success(`${groupsOnly.length} grupo(s) encontrado(s)!`);
    } catch (error) {
      console.error("Erro ao listar grupos:", error);
      toast.error("Falha ao listar grupos. Tente novamente.");
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndImportMembers = async (groupJid: string, groupName: string) => {
    const instance = instances?.find(i => i.id === selectedInstance);
    if (!instance || !campaignId) return;

    try {
      const webhookUrl = getWebhookUrlForCategory("groups", configs);
      const payload = buildGroupPayload({
        action: "group.members",
        instance: {
          id: instance.id,
          name: instance.name,
          phone: instance.phoneNumber || "",
          provider: instance.provider,
          externalId: instance.idInstance || "",
          externalToken: instance.tokenInstance || "",
        },
        campaign: { id: campaignId, name: "" },
        group: { jid: groupJid },
      });

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Falha ao buscar membros");

      const data = await response.json();
      
      // Resposta é um array de objetos de grupo, cada um com "participants"
      let membersList: any[] = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.participants && Array.isArray(item.participants)) {
            membersList.push(...item.participants);
          }
        }
      } else if (data.participants) {
        membersList = data.participants;
      } else if (data.members) {
        membersList = data.members;
      }

      if (membersList.length > 0) {
        const membersToInsert = membersList
          .filter((m: any) => m.phone && !m.phone.includes("-group"))
          .map((m: any) => ({
            phone: m.phone,
            name: m.name || undefined,
            isAdmin: m.isAdmin || m.isSuperAdmin || false,
          }));

        await addMembersBulk(membersToInsert);
        toast.success(`${membersToInsert.length} membro(s) importados do grupo "${groupName}"`);
      }
    } catch (error) {
      console.error(`Erro ao importar membros de ${groupName}:`, error);
      toast.error(`Falha ao importar membros do grupo "${groupName}"`);
    }
  };

  const handleAddToCampaign = async () => {
    if (selectedGroups.length === 0 || !campaignId) return;
    
    const groupsToAdd = groups
      .filter(g => selectedGroups.includes(g.phone))
      .map(g => ({
        jid: g.phone,
        name: g.name,
        instanceId: selectedInstance,
      }));
    
    try {
      await addGroups(groupsToAdd);
      setSelectedGroups([]);

      // Buscar membros em background para cada grupo adicionado
      toast.info("Buscando membros dos grupos...");
      for (const group of groupsToAdd) {
        await fetchAndImportMembers(group.jid, group.name);
      }
    } catch (error) {
      // Error already handled by the hook
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    try {
      await removeGroup(groupId);
    } catch (error) {
      // Error already handled by the hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Linked Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Grupos Vinculados
          </CardTitle>
          <CardDescription>
            Grupos já adicionados a esta campanha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkedLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : linkedGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum grupo vinculado ainda</p>
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {linkedGroups.map((group) => (
                <div 
                  key={group.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.groupName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {group.groupJid}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {group.instanceId && (
                        <>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'rename' })}>
                            <Pencil className="mr-2 h-4 w-4" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'photo' })}>
                            <Image className="mr-2 h-4 w-4" /> Atualizar Foto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'description' })}>
                            <FileText className="mr-2 h-4 w-4" /> Atualizar Descrição
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'addParticipant' })}>
                            <UserPlus className="mr-2 h-4 w-4" /> Adicionar Participante
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'removeParticipant' })}>
                            <UserMinus className="mr-2 h-4 w-4" /> Remover Participante
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'promoteAdmin' })}>
                            <ShieldPlus className="mr-2 h-4 w-4" /> Promover Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'removeAdmin' })}>
                            <ShieldMinus className="mr-2 h-4 w-4" /> Remover Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'settings' })}>
                            <Settings className="mr-2 h-4 w-4" /> Configurações
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActiveAction({ groupJid: group.groupJid, instanceId: group.instanceId!, groupName: group.groupName, action: 'inviteLink' })}>
                            <Link2 className="mr-2 h-4 w-4" /> Link de Convite
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleRemoveGroup(group.id)}
                        disabled={isRemoving}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remover da Campanha
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Add New Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Novos Grupos
          </CardTitle>
          <CardDescription>
            {t("groupCampaigns.groups.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select 
              value={selectedInstance} 
              onValueChange={setSelectedInstance}
              disabled={instancesLoading}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder={t("groupCampaigns.groups.selectInstance")} />
              </SelectTrigger>
              <SelectContent>
                {connectedInstances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleListGroups} 
              disabled={!selectedInstance || isLoading}
            >
              <List className="mr-2 h-4 w-4" />
              {t("groupCampaigns.groups.listGroups")}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : hasFetched && availableGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {groups.length > 0 
                  ? "Todos os grupos já foram adicionados à campanha"
                  : t("groupCampaigns.groups.noGroups")
                }
              </p>
            </div>
          ) : availableGroups.length > 0 ? (
            <div className="space-y-4">
              {/* Header with "Select all" and action button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Selecionar todos
                  </label>
                </div>
                
                <Button 
                  disabled={selectedGroups.length === 0 || isAdding}
                  onClick={handleAddToCampaign}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar à Campanha ({selectedGroups.length})
                </Button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Groups list */}
              <div className="rounded-md border divide-y max-h-96 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Nenhum grupo encontrado</p>
                ) : filteredGroups.map((group) => (
                  <div 
                    key={group.phone}
                    className="flex items-center space-x-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleGroupSelection(group.phone)}
                  >
                    <Checkbox
                      id={group.phone}
                      checked={selectedGroups.includes(group.phone)}
                      onCheckedChange={() => toggleGroupSelection(group.phone)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.archived === "true" && (
                        <Badge variant="secondary">Arquivado</Badge>
                      )}
                      {group.pinned === "true" && (
                        <Badge variant="outline">Fixado</Badge>
                      )}
                      {group.messagesUnread !== "0" && (
                        <Badge variant="default">{group.messagesUnread} não lidas</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection counter */}
              <p className="text-sm text-muted-foreground">
                {selectedGroups.length} de {filteredGroups.length} grupo(s) selecionado(s)
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Group Management Modals */}
      {activeAction && (
        <>
          <GroupUpdateNameModal
            open={activeAction.action === 'rename'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            currentName={activeAction.groupName}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupUpdatePhotoModal
            open={activeAction.action === 'photo'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupUpdateDescriptionModal
            open={activeAction.action === 'description'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupAddParticipantModal
            open={activeAction.action === 'addParticipant'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupRemoveParticipantModal
            open={activeAction.action === 'removeParticipant'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupPromoteAdminModal
            open={activeAction.action === 'promoteAdmin'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupRemoveAdminModal
            open={activeAction.action === 'removeAdmin'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupSettingsModal
            open={activeAction.action === 'settings'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
            onSuccess={() => setActiveAction(null)}
          />
          <GroupInviteLinkModal
            open={activeAction.action === 'inviteLink'}
            onOpenChange={(open) => !open && setActiveAction(null)}
            instanceId={activeAction.instanceId}
            groupId={activeAction.groupJid}
          />
        </>
      )}
    </div>
  );
}
