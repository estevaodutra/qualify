import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export function GroupEventTriggerConfig({ config, onChange }: any) {
  const { activeCompanyId } = useCompany();
  const [instances, setInstances] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [instanceGroups, setInstanceGroups] = useState<{ jid: string; name: string }[]>([]);
  const [search, setSearch] = useState("");

  const targetInstanceId = config.instanceId || "";
  const selectedGroups = Array.isArray(config.selectedGroupJids) ? config.selectedGroupJids : [];

  useEffect(() => {
    const fetchInstances = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      let instancesQuery = supabase
        .from("instances")
        .select("id, name, phone")
        .order("name", { ascending: true });

      if (activeCompanyId) {
        instancesQuery = instancesQuery.eq("company_id", activeCompanyId);
      } else {
        instancesQuery = instancesQuery.eq("user_id", user.id).is("company_id", null);
      }

      instancesQuery.then(({ data }) => { if (data) setInstances(data); });
    };

    fetchInstances();
  }, [activeCompanyId]);

  const fetchInstanceGroups = async (instanceId: string) => {
    if (!instanceId) return;
    setIsFetchingGroups(true);
    setInstanceGroups([]);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          instanceId: instanceId,
          endpoint: "/groups",
          method: "GET",
        },
      });
      if (error) throw error;
      const list = (data || [])
        .filter((item: any) => item.isGroup === true || item.phone?.includes("-") || item.phone?.includes("@g.us") || item.jid?.includes("@g.us"))
        .map((item: any) => ({
          jid: item.phone || item.jid,
          name: item.name || "Grupo sem nome",
        }));
      setInstanceGroups(list);
    } catch (err) {
      console.error("Error fetching groups from instance:", err);
      toast.error("Falha ao buscar grupos da instância. Verifique se o WhatsApp está conectado.");
    } finally {
      setIsFetchingGroups(false);
    }
  };

  useEffect(() => {
    if (targetInstanceId && instanceGroups.length === 0 && !isFetchingGroups) {
      fetchInstanceGroups(targetInstanceId);
    }
  }, [targetInstanceId]);

  const handleToggleGroup = (jid: string) => {
    const next = selectedGroups.includes(jid)
      ? selectedGroups.filter((id: string) => id !== jid)
      : [...selectedGroups, jid];
    onChange({ ...config, selectedGroupJids: next });
  };

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return instanceGroups;
    const q = search.toLowerCase();
    return instanceGroups.filter(g => g.name.toLowerCase().includes(q));
  }, [instanceGroups, search]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="space-y-2">
        <Label>Instância do WhatsApp</Label>
        <Select 
          value={targetInstanceId} 
          onValueChange={(val) => {
            onChange({ ...config, instanceId: val, selectedGroupJids: [] });
            fetchInstanceGroups(val);
          }}
        >
          <SelectTrigger className="w-full bg-white text-sm h-9">
            <SelectValue placeholder="Selecione a instância" />
          </SelectTrigger>
          <SelectContent>
            {instances.map((inst) => (
              <SelectItem key={inst.id} value={inst.id} className="text-sm">
                {inst.name} {inst.phone ? `(${inst.phone})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {targetInstanceId && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label>Grupos Monitorados</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInstanceGroups(targetInstanceId)}
              disabled={isFetchingGroups}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isFetchingGroups ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo..."
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2 bg-white scrollbar-thin">
            {isFetchingGroups ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Buscando grupos...</span>
              </div>
            ) : instanceGroups.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum grupo encontrado nesta instância.
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum grupo corresponde à busca.
              </div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.jid} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id={`g-${group.jid}`} 
                    checked={selectedGroups.includes(group.jid)}
                    onCheckedChange={() => handleToggleGroup(group.jid)}
                  />
                  <div className="flex flex-col overflow-hidden">
                    <Label htmlFor={`g-${group.jid}`} className="text-sm font-medium cursor-pointer truncate">
                      {group.name}
                    </Label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
