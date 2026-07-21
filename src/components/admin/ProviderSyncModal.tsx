import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Link as LinkIcon, Database, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWebhookConfigs, getWebhookUrlForCategory } from "@/hooks/useWebhookConfigs";
import { AdminInstance } from "@/hooks/useAdmin";

interface ProviderSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  localInstances: AdminInstance[];
  onSyncSuccess: () => void;
}

export function ProviderSyncModal({ isOpen, onClose, localInstances, onSyncSuccess }: ProviderSyncModalProps) {
  const [provider, setProvider] = useState<string>("Z-API");
  const [isFetching, setIsFetching] = useState(false);
  const [providerInstances, setProviderInstances] = useState<any[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const { configs } = useWebhookConfigs();

  const [isLinking, setIsLinking] = useState<string | null>(null); // store id of instance being linked
  const [selectedLocalId, setSelectedLocalId] = useState<Record<string, string>>({});

  const handleFetchInstances = async () => {
    setIsFetching(true);
    setProviderInstances([]);
    setHasFetched(false);
    try {
      const webhookUrl = getWebhookUrlForCategory("instance", configs);
      if (!webhookUrl) {
        throw new Error("Webhook de instância não configurado.");
      }

      const payload = {
        action: "instance.list_all",
        provider: provider
      };

      const { data: proxyResult, error } = await supabase.functions.invoke("webhook-proxy", {
        body: { url: webhookUrl, payload },
      });

      if (error) throw error;
      if (!proxyResult?.success) throw new Error(proxyResult?.body || "Erro no webhook proxy");
      
      const response = JSON.parse(proxyResult.body);
      
      if (response && Array.isArray(response)) {
        setProviderInstances(response);
      } else if (response && response.instances && Array.isArray(response.instances)) {
        setProviderInstances(response.instances);
      } else {
        throw new Error("Formato de resposta inválido do webhook.");
      }
      setHasFetched(true);
      toast.success(`${Array.isArray(response) ? response.length : response.instances.length} instâncias encontradas.`);
    } catch (err: any) {
      toast.error("Erro ao buscar instâncias", { description: err.message });
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleLink = async (pInst: any) => {
    const pId = pInst.externalId || pInst.id || pInst.instanceId;
    const localIdToLink = selectedLocalId[pId];
    if (!localIdToLink) {
      toast.error("Selecione uma instância do Qualify para atrelar.");
      return;
    }

    setIsLinking(pId);
    try {
      const { error } = await supabase.from("instances").update({
        external_instance_id: pId,
        external_instance_token: pInst.externalToken || pInst.token || null,
        provider: provider.toUpperCase() === "Z-API" ? "Z-API" : "WAHA",
      }).eq("id", localIdToLink);

      if (error) throw error;

      toast.success("Instância atrelada com sucesso!");
      onSyncSuccess();
    } catch (err: any) {
      toast.error("Erro ao atrelar instância", { description: err.message });
    } finally {
      setIsLinking(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Sincronizar Instâncias do Provedor
          </DialogTitle>
          <DialogDescription>
            Busque todas as conexões existentes no Z-API ou WAHA e atrele às instâncias criadas aqui no painel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 items-end mt-4 shrink-0">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Z-API">Z-API</SelectItem>
                <SelectItem value="WAHA">WAHA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFetchInstances} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Buscar Instâncias
          </Button>
        </div>

        <div className="flex-1 overflow-auto mt-6 border rounded-lg min-h-[300px]">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Buscando instâncias no n8n...</p>
            </div>
          ) : !hasFetched ? (
            <div className="flex items-center justify-center h-full p-8 text-muted-foreground text-sm">
              Clique em buscar para listar as instâncias do provedor selecionado.
            </div>
          ) : providerInstances.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8 text-muted-foreground text-sm">
              Nenhuma instância retornada pelo webhook.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b">
                <tr>
                  <th className="text-left font-medium p-3 text-slate-500">Nome / Telefone</th>
                  <th className="text-left font-medium p-3 text-slate-500">ID no Provedor</th>
                  <th className="text-center font-medium p-3 text-slate-500">Status Local</th>
                  <th className="text-left font-medium p-3 text-slate-500">Atrelar ao Qualify</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {providerInstances.map((pInst, idx) => {
                  const pId = pInst.externalId || pInst.id || pInst.instanceId || pInst.name;
                  const pName = pInst.name || pInst.sessionName || "Sem Nome";
                  const pPhone = pInst.phone || "---";

                  // Check if it already exists in Qualify
                  const existingLocal = localInstances.find(l => l.external_instance_id === pId || l.name === pName);

                  return (
                    <tr key={pId || idx} className={existingLocal ? "bg-slate-50/50" : ""}>
                      <td className="p-3">
                        <p className="font-medium">{pName}</p>
                        <p className="text-xs text-muted-foreground">{pPhone}</p>
                      </td>
                      <td className="p-3">
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600 truncate max-w-[150px] inline-block">{pId}</code>
                      </td>
                      <td className="p-3 text-center">
                        {existingLocal ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Atrelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Órfã
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {existingLocal ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            Vinculada à: <span className="font-medium text-foreground">{existingLocal.name}</span>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Select 
                              value={selectedLocalId[pId] || ""}
                              onValueChange={(val) => setSelectedLocalId(prev => ({ ...prev, [pId]: val }))}
                            >
                              <SelectTrigger className="h-8 text-xs w-[180px]">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {localInstances
                                  .filter(l => !l.external_instance_id) // only show unlinked ones
                                  .map(l => (
                                    <SelectItem key={l.id} value={l.id} className="text-xs">
                                      {l.name}
                                    </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              className="h-8" 
                              variant="secondary"
                              onClick={() => handleLink(pInst)}
                              disabled={isLinking === pId || !selectedLocalId[pId]}
                            >
                              {isLinking === pId ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3 w-3 mr-1" />}
                              Atrelar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
