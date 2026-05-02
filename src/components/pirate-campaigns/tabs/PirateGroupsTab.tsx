import { useState } from "react";
import { usePirateGroups } from "@/hooks/usePirateGroups";
import { useInstances } from "@/hooks/useInstances";
import { useWebhookConfigs, getWebhookUrlForCategory } from "@/hooks/useWebhookConfigs";
import { buildGroupPayload } from "@/lib/webhook-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Users, Plus, Trash2, Pause, Play, List, Search } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppGroup {
  phone: string;
  name: string;
  isGroup: boolean;
}

interface PirateGroupsTabProps {
  campaignId: string;
  instanceId: string | null;
}

export function PirateGroupsTab({ campaignId, instanceId }: PirateGroupsTabProps) {
  const { groups, isLoading: groupsLoading, addGroups, removeGroup, toggleGroup, isAdding } = usePirateGroups(campaignId);
  const { instances } = useInstances();
  const { configs } = useWebhookConfigs();

  const [selectedInstance, setSelectedInstance] = useState(instanceId || "");
  const [availableGroups, setAvailableGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedJids, setSelectedJids] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const connectedInstances = instances?.filter((i) => i.status === "connected") || [];

  const unlinkedGroups = availableGroups.filter(
    (g) => !groups.some((lg) => lg.groupJid === g.phone)
  );

  const filteredUnlinked = unlinkedGroups.filter((g) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return g.name.toLowerCase().includes(term) || g.phone.toLowerCase().includes(term);
  });

  const handleListGroups = async () => {
    if (!selectedInstance) return;
    const instance = instances?.find((i) => i.id === selectedInstance);
    if (!instance) return;

    setIsFetching(true);
    setHasFetched(true);
    setSelectedJids([]);

    try {
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
      });

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Falha ao buscar grupos");

      const data = await response.json();
      const rawGroups = data.groups || data || [];
      const groupsOnly = rawGroups.filter((item: WhatsAppGroup) => item.isGroup === true);
      setAvailableGroups(groupsOnly);
      toast.success(`${groupsOnly.length} grupo(s) encontrado(s)`);
    } catch (error) {
      console.error("Erro ao listar grupos:", error);
      toast.error("Falha ao listar grupos");
      setAvailableGroups([]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddGroups = async () => {
    if (selectedJids.length === 0) return;
    const groupsToAdd = availableGroups
      .filter((g) => selectedJids.includes(g.phone))
      .map((g) => ({ jid: g.phone, name: g.name }));
    try {
      await addGroups(groupsToAdd);
      setSelectedJids([]);
      toast.success(`${groupsToAdd.length} grupo(s) adicionado(s)`);
    } catch {
      toast.error("Erro ao adicionar grupos");
    }
  };

  return (
    <div className="space-y-6">
      {/* Linked groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Grupos Monitorados
          </CardTitle>
          <CardDescription>Grupos sendo monitorados nesta campanha</CardDescription>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum grupo monitorado ainda</p>
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.groupName || group.groupJid}</p>
                    <p className="text-sm text-muted-foreground truncate">{group.groupJid}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{group.leadsCaptured} leads</Badge>
                    <Badge className={group.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-muted text-muted-foreground"}>
                      {group.isActive ? "Monitorando" : "Pausado"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleGroup({ groupId: group.id, isActive: !group.isActive })}
                    >
                      {group.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeGroup(group.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Grupos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedInstance} onValueChange={setSelectedInstance}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Selecionar instância" />
              </SelectTrigger>
              <SelectContent>
                {connectedInstances.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleListGroups} disabled={!selectedInstance || isFetching}>
              <List className="mr-2 h-4 w-4" />
              Listar Grupos
            </Button>
          </div>

          {isFetching ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : hasFetched && unlinkedGroups.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              {availableGroups.length > 0 ? "Todos os grupos já foram adicionados" : "Nenhum grupo encontrado"}
            </p>
          ) : unlinkedGroups.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedJids.length === filteredUnlinked.length && filteredUnlinked.length > 0}
                    onCheckedChange={() => {
                      setSelectedJids(selectedJids.length === filteredUnlinked.length ? [] : filteredUnlinked.map((g) => g.phone));
                    }}
                  />
                  <span className="text-sm font-medium">Selecionar todos</span>
                </div>
                <Button disabled={selectedJids.length === 0 || isAdding} onClick={handleAddGroups}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar ({selectedJids.length})
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

              <div className="rounded-md border divide-y max-h-80 overflow-y-auto">
                {filteredUnlinked.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Nenhum grupo encontrado</p>
                ) : filteredUnlinked.map((group) => (
                  <div
                    key={group.phone}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedJids((prev) =>
                        prev.includes(group.phone) ? prev.filter((j) => j !== group.phone) : [...prev, group.phone]
                      );
                    }}
                  >
                    <Checkbox checked={selectedJids.includes(group.phone)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{group.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
