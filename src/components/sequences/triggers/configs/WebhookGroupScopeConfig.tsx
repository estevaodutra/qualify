import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import type { TriggerConfig } from "@/components/group-campaigns/sequences/triggerTypes";

interface WebhookGroupScopeConfigProps {
  campaignId: string;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

// Instance + group-scope config for the "webhook" trigger on group-campaign
// sequences: which instance the trigger targets, and whether it should fan
// out to every group linked to the campaign or only a selected subset.
// Reuses useCampaignGroups (already-imported campaign groups) rather than a
// live zapi-proxy re-fetch, since we're scoping an existing campaign's
// already-linked groups, not discovering new ones.
export function WebhookGroupScopeConfig({ campaignId, config, onChange }: WebhookGroupScopeConfigProps) {
  const [instances, setInstances] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const { linkedGroups, isLoading } = useCampaignGroups(campaignId);

  useEffect(() => {
    supabase
      .from("instances")
      .select("id, name, phone")
      .order("name", { ascending: true })
      .then(({ data }) => { if (data) setInstances(data); });
  }, []);

  const groupScope = config.groupScope || "all";
  const selectedGroupJids = config.selectedGroupJids || [];
  const filteredGroups = linkedGroups.filter(g =>
    !search.trim() || g.groupName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggleGroup = (jid: string) => {
    const next = selectedGroupJids.includes(jid)
      ? selectedGroupJids.filter(j => j !== jid)
      : [...selectedGroupJids, jid];
    onChange({ ...config, selectedGroupJids: next });
  };

  return (
    <div className="space-y-3 p-3 rounded-lg bg-background border">
      <div className="space-y-2">
        <Label className="text-sm">Instância</Label>
        <Select value={config.instanceId || ""} onValueChange={(v) => onChange({ ...config, instanceId: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione a instância..." /></SelectTrigger>
          <SelectContent>
            {instances.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.name} ({i.phone || "Sem número"})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Grupos de destino</Label>
        <RadioGroup value={groupScope} onValueChange={(v) => onChange({ ...config, groupScope: v as "all" | "selected" })}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id="scope-all" />
            <Label htmlFor="scope-all" className="text-sm font-normal cursor-pointer">Todos os grupos da campanha</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="selected" id="scope-selected" />
            <Label htmlFor="scope-selected" className="text-sm font-normal cursor-pointer">Grupos selecionados</Label>
          </div>
        </RadioGroup>
      </div>

      {groupScope === "selected" && (
        <div className="space-y-2 pl-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-2">Carregando grupos...</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo vinculado à campanha.</p>
            ) : (
              filteredGroups.map(g => (
                <div key={g.id} className="flex items-center gap-2 p-1">
                  <Checkbox
                    id={`group-${g.id}`}
                    checked={selectedGroupJids.includes(g.groupJid)}
                    onCheckedChange={() => toggleGroup(g.groupJid)}
                  />
                  <Label htmlFor={`group-${g.id}`} className="text-xs font-normal cursor-pointer flex-1 truncate">
                    {g.groupName}
                  </Label>
                </div>
              ))
            )}
          </div>
          {selectedGroupJids.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{selectedGroupJids.length} grupo(s) selecionado(s)</p>
          )}
        </div>
      )}
    </div>
  );
}
