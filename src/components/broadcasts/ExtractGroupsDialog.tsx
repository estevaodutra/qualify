import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { extractAndSaveGroupLeadsToCRM, RemoteGroupItem } from "@/services/groupLeadExtractor";
import {
  Users,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  FolderInput,
  Check,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

interface ExtractGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultInstanceId?: string;
  onExtractionComplete?: (result: {
    groupNames: string[];
    totalExtracted: number;
    newLeadsCount: number;
  }) => void;
}

export function ExtractGroupsDialog({
  open,
  onOpenChange,
  defaultInstanceId,
  onExtractionComplete,
}: ExtractGroupsDialogProps) {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedGroupJids, setSelectedGroupJids] = useState<Set<string>>(new Set());
  const [ignoreAdmins, setIgnoreAdmins] = useState(true);

  // Status de extração
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedSummary, setExtractedSummary] = useState<{
    total: number;
    newLeads: number;
    groups: string[];
  } | null>(null);

  // Buscar instâncias disponíveis
  const { data: instances = [], isLoading: isLoadingInstances } = useQuery({
    queryKey: ["extract_dialog_instances", activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from("instances")
        .select("id, name, phone, status")
        .order("name", { ascending: true });
      if (activeCompanyId) q = q.eq("company_id", activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: open,
  });

  // Atualizar instância padrão selecionada
  const activeInstanceId = useMemo(() => {
    if (selectedInstanceId) return selectedInstanceId;
    if (defaultInstanceId && defaultInstanceId !== "default") return defaultInstanceId;
    return instances[0]?.id || "";
  }, [selectedInstanceId, defaultInstanceId, instances]);

  // Buscar lista de grupos remotos da instância
  const {
    data: remoteGroups = [],
    isLoading: isFetchingGroups,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["extract_dialog_groups", activeInstanceId],
    queryFn: async () => {
      if (!activeInstanceId) return [];

      // 1. Tentar buscar grupos via sync-instance-groups edge function (com fetchOnly)
      try {
        const { data, error } = await supabase.functions.invoke("sync-instance-groups", {
          body: {
            instanceId: activeInstanceId,
            companyId: activeCompanyId,
            fetchOnly: true,
          },
        });

        if (!error && data?.success && Array.isArray(data.groups) && data.groups.length > 0) {
          return data.groups as RemoteGroupItem[];
        }
      } catch (_e) {
        // Fallback
      }

      // 2. Fallback: buscar via zapi-proxy /groups
      try {
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("zapi-proxy", {
          body: {
            instanceId: activeInstanceId,
            endpoint: "/groups",
            method: "GET",
          },
        });

        if (!proxyError && Array.isArray(proxyData)) {
          return proxyData
            .filter((g: any) => g.isGroup === true || String(g.phone || g.id).includes("@g.us"))
            .map((g: any) => ({
              groupJid: g.phone || g.id,
              name: g.name || "Grupo WhatsApp",
              description: g.description || null,
              pictureUrl: g.pictureUrl || null,
              participantsCount: g.participantsCount || (Array.isArray(g.participants) ? g.participants.length : 0),
            }));
        }
      } catch (_proxyErr) {
        // Fallback
      }

      // 3. Fallback adicional: buscar group_campaigns do CRM
      const { data: gcData } = await supabase
        .from("group_campaigns")
        .select("id, name, group_name, group_jid, group_description, group_photo_url")
        .eq("company_id", activeCompanyId);

      return (gcData || []).map((gc: any) => ({
        groupJid: gc.group_jid || gc.id,
        name: gc.group_name || gc.name || "Grupo WhatsApp",
        description: gc.group_description,
        pictureUrl: gc.group_photo_url,
        participantsCount: 0,
      }));
    },
    enabled: open && !!activeInstanceId,
  });

  // Filtragem de grupos por texto
  const filteredGroups = useMemo(() => {
    return remoteGroups.filter((g) => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(term) ||
        g.groupJid.toLowerCase().includes(term)
      );
    });
  }, [remoteGroups, search]);

  // Selecionar todos os visíveis
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedGroupJids);
      filteredGroups.forEach((g) => next.add(g.groupJid));
      setSelectedGroupJids(next);
    } else {
      const next = new Set(selectedGroupJids);
      filteredGroups.forEach((g) => next.delete(g.groupJid));
      setSelectedGroupJids(next);
    }
  };

  const handleToggleGroup = (groupJid: string) => {
    setSelectedGroupJids((prev) => {
      const next = new Set(prev);
      if (next.has(groupJid)) next.delete(groupJid);
      else next.add(groupJid);
      return next;
    });
  };

  // Executar Extração de Membros e Importar para CRM
  const handleStartExtraction = async () => {
    if (!activeInstanceId) {
      toast.error("Selecione uma conexão de WhatsApp.");
      return;
    }

    if (selectedGroupJids.size === 0) {
      toast.error("Selecione pelo menos um grupo para extrair.");
      return;
    }

    const groupsToExtract = remoteGroups
      .filter((g) => selectedGroupJids.has(g.groupJid))
      .map((g) => ({
        groupJid: g.groupJid,
        name: g.name,
      }));

    setIsExtracting(true);
    setExtractProgress(0);
    setStatusMessage("Iniciando extração de participantes...");
    setExtractedSummary(null);

    try {
      const result = await extractAndSaveGroupLeadsToCRM({
        instanceId: activeInstanceId,
        companyId: activeCompanyId,
        userId: user?.id,
        groups: groupsToExtract,
        ignoreAdmins,
        onProgress: (prog) => {
          setExtractProgress(prog.percentage);
          setStatusMessage(
            `Extraindo (${prog.currentGroupIndex}/${prog.totalGroups}): "${prog.currentGroupName}" — ${prog.extractedCount} leads encontrados`
          );
        },
      });

      // Invalidar queries de leads e audiência
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast_audience_count"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast_audience_preview"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast_audience_groups"] });

      setExtractedSummary({
        total: result.totalExtracted,
        newLeads: result.newLeadsCount,
        groups: result.groupNamesExtracted,
      });

      toast.success(
        `${result.totalExtracted} leads extraídos com sucesso! Admins foram ignorados.`
      );

      if (onExtractionComplete) {
        onExtractionComplete({
          groupNames: result.groupNamesExtracted,
          totalExtracted: result.totalExtracted,
          newLeadsCount: result.newLeadsCount,
        });
      }
    } catch (err: any) {
      console.error("[ExtractGroupsDialog] Erro na extração:", err);
      toast.error(`Falha ao extrair participantes: ${err.message || String(err)}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const isAllVisibleSelected =
    filteredGroups.length > 0 &&
    filteredGroups.every((g) => selectedGroupJids.has(g.groupJid));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Extrair e Importar Múltiplos Grupos para o CRM
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Selecione os grupos de WhatsApp desejados. Os membros serão extraídos, salvos no CRM e ficarão prontos para disparo (admins são ignorados automaticamente).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4 min-h-[300px]">
          {/* Seletor de Instância & Configuração Anti-Admin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Conexão do WhatsApp
              </Label>
              <Select
                value={activeInstanceId}
                onValueChange={(val) => {
                  setSelectedInstanceId(val);
                  setSelectedGroupJids(new Set());
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione a instância..." />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} {i.phone ? `(${i.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0">
              <div className="space-y-0.5 text-right sm:text-left">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Ignorar Administradores
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Não importa os donos e admins dos grupos
                </p>
              </div>
              <Switch checked={ignoreAdmins} onCheckedChange={setIgnoreAdmins} />
            </div>
          </div>

          {/* Barra de Busca e Selecionar Todos */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchGroups()}
              className="h-8 text-xs gap-1"
              disabled={isFetchingGroups}
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingGroups ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {/* Tabela de Grupos */}
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-semibold flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllVisibleSelected}
                  onCheckedChange={handleSelectAll}
                  id="select-all-groups"
                />
                <label htmlFor="select-all-groups" className="cursor-pointer">
                  Selecionar Todos ({filteredGroups.length})
                </label>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {selectedGroupJids.size} selecionado(s)
              </Badge>
            </div>

            <div className="max-h-56 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-10 text-center py-1.5"></TableHead>
                    <TableHead className="text-xs py-1.5">Nome do Grupo</TableHead>
                    <TableHead className="text-xs py-1.5 text-center w-24">Participantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFetchingGroups ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-primary" />
                        Carregando grupos da conexão WhatsApp...
                      </TableCell>
                    </TableRow>
                  ) : filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum grupo encontrado nesta conexão.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((g) => {
                      const isSelected = selectedGroupJids.has(g.groupJid);
                      return (
                        <TableRow
                          key={g.groupJid}
                          className={`text-xs cursor-pointer hover:bg-muted/30 ${
                            isSelected ? "bg-primary/5 font-medium" : ""
                          }`}
                          onClick={() => handleToggleGroup(g.groupJid)}
                        >
                          <TableCell className="text-center py-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleGroup(g.groupJid)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <div>
                              <span className="font-semibold text-foreground">{g.name}</span>
                              <span className="block text-[10px] text-muted-foreground font-mono truncate max-w-xs">
                                {g.groupJid}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2 text-muted-foreground">
                            {g.participantsCount > 0 ? (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                {g.participantsCount} membros
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Progresso durante a extração */}
          {isExtracting && (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-fade-in">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-primary flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processando grupos...
                </span>
                <span className="font-bold text-primary">{extractProgress}%</span>
              </div>
              <Progress value={extractProgress} className="h-2" />
              <p className="text-[11px] text-muted-foreground truncate">{statusMessage}</p>
            </div>
          )}

          {/* Feedback de sucesso */}
          {extractedSummary && !isExtracting && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <strong className="text-foreground block font-bold">
                  {extractedSummary.total} contatos extraídos e vinculados no CRM!
                </strong>
                <span className="text-muted-foreground text-[11px]">
                  Os {extractedSummary.groups.length} grupos foram adicionados automaticamente ao filtro de audiência e estão prontos para o disparo.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isExtracting}
          >
            Fechar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={selectedGroupJids.size === 0 || isExtracting}
            onClick={handleStartExtraction}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold text-xs"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraindo Leads...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Extrair e Salvar no CRM ({selectedGroupJids.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
