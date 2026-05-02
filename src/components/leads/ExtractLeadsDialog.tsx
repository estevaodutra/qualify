import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInstances } from "@/hooks/useInstances";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useWebhookConfigs } from "@/hooks/useWebhookConfigs";
import { buildGroupPayload } from "@/lib/webhook-utils";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  Check,
  X,
  Loader2,
  Smartphone,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
} from "lucide-react";

// ── Types ──

interface WhatsAppGroup {
  phone: string;
  name: string;
  isGroup: boolean;
  messagesUnread: string;
}

interface ExtractedMember {
  phone: string;
  name: string | null;
  isAdmin: boolean;
  groupJid: string;
  groupName: string;
}

interface ExtractionResult {
  groupName: string;
  total: number;
  extracted: number;
  ignored: number;
  invalid: number;
}

type Step = 1 | 2 | 3 | 4 | "importing" | "done";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ExtractLeadsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { instances } = useInstances();
  const { configs } = useWebhookConfigs();
  const { campaigns: callCampaigns } = useCallCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { campaigns: groupCampaigns } = useGroupCampaigns();

  // ── Step state ──
  const [step, setStep] = useState<Step>(1);

  // Step 1 – Instance
  const [selectedInstanceId, setSelectedInstanceId] = useState("");

  // Step 2 – Groups
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsFetched, setGroupsFetched] = useState(false);
  const [selectedGroupJids, setSelectedGroupJids] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");

  // Step 3 – Extract
  const [ignoreInvalid, setIgnoreInvalid] = useState(true);
  const [ignoreAdmins, setIgnoreAdmins] = useState(false);
  const [keepReference, setKeepReference] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [extractedMembers, setExtractedMembers] = useState<ExtractedMember[]>([]);
  const [extractionStats, setExtractionStats] = useState({ total: 0, valid: 0, duplicates: 0, invalid: 0 });
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractCurrentGroup, setExtractCurrentGroup] = useState("");

  // Step 4 – Campaign
  const [campaignId, setCampaignId] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [ignoreCampaignExisting, setIgnoreCampaignExisting] = useState(true);

  // Importing
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ExtractionResult[]>([]);

  // ── Derived ──
  const connectedInstances = useMemo(
    () => instances?.filter((i) => i.status === "connected") || [],
    [instances]
  );

  const selectedInstance = useMemo(
    () => instances?.find((i) => i.id === selectedInstanceId),
    [instances, selectedInstanceId]
  );

  const filteredGroups = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase())),
    [groups, groupSearch]
  );

  const selectedGroupsData = useMemo(
    () => groups.filter((g) => selectedGroupJids.has(g.phone)),
    [groups, selectedGroupJids]
  );

  const totalMembers = useMemo(
    () => selectedGroupsData.reduce((s, g) => s + parseInt(g.messagesUnread || "0", 10), 0),
    [selectedGroupsData]
  );

  const totalResults = useMemo(
    () =>
      importResults.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          extracted: acc.extracted + r.extracted,
          ignored: acc.ignored + r.ignored,
          invalid: acc.invalid + r.invalid,
        }),
        { total: 0, extracted: 0, ignored: 0, invalid: 0 }
      ),
    [importResults]
  );

  const selectedCampaignLabel = useMemo(() => {
    if (!campaignId) return "";
    const all = [
      ...callCampaigns.map((c: any) => ({ id: c.id, name: c.name })),
      ...dispatchCampaigns.map((c: any) => ({ id: c.id, name: c.name })),
      ...groupCampaigns.map((c: any) => ({ id: c.id, name: c.name })),
    ];
    return all.find((c) => c.id === campaignId)?.name || "";
  }, [campaignId, callCampaigns, dispatchCampaigns, groupCampaigns]);

  // ── Helpers ──
  const resetState = () => {
    setStep(1);
    setSelectedInstanceId("");
    setGroups([]);
    setGroupsLoading(false);
    setGroupsFetched(false);
    setSelectedGroupJids(new Set());
    setGroupSearch("");
    setIgnoreInvalid(true);
    setIgnoreAdmins(false);
    setKeepReference(true);
    setTags([]);
    setTagInput("");
    setExtractedMembers([]);
    setExtractionStats({ total: 0, valid: 0, duplicates: 0, invalid: 0 });
    setIsExtracting(false);
    setExtractProgress(0);
    setExtractCurrentGroup("");
    setCampaignId("");
    setCampaignType("");
    setIgnoreCampaignExisting(true);
    setImportProgress(0);
    setImportResults([]);
  };

  const handleClose = (o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleCampaignChange = (val: string) => {
    const [type, id] = val.split("::");
    setCampaignType(type);
    setCampaignId(id);
  };

  // ── Step 2: Fetch groups from WhatsApp API ──
  const fetchGroups = async () => {
    if (!selectedInstance) return;
    setGroupsLoading(true);
    setGroupsFetched(true);
    setSelectedGroupJids(new Set());

    try {
      const webhookUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent";
      const payload = buildGroupPayload({
        action: "group.list",
        instance: {
          id: selectedInstance.id,
          name: selectedInstance.name,
          phone: selectedInstance.phoneNumber || "",
          provider: selectedInstance.provider,
          externalId: selectedInstance.idInstance || "",
          externalToken: selectedInstance.tokenInstance || "",
        },
      });

      const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
        body: { url: webhookUrl, payload },
      });

      if (proxyError) throw new Error("Falha ao buscar grupos");

      console.log("fetchGroups proxy response:", JSON.stringify(proxyData).substring(0, 500));

      // webhook-proxy returns { success, status, body } — body is a JSON string
      let data: any;
      try {
        data = typeof proxyData.body === "string" ? JSON.parse(proxyData.body) : proxyData.body;
      } catch {
        data = proxyData;
      }

      const rawGroups = data.groups || data || [];
      const groupsOnly = rawGroups.filter((item: WhatsAppGroup) => item.isGroup === true);
      setGroups(groupsOnly);
      toast.success(`${groupsOnly.length} grupo(s) encontrado(s)!`);
    } catch (error) {
      console.error("Erro ao listar grupos:", error);
      toast.error("Falha ao listar grupos. Tente novamente.");
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  // ── Step 3: Extract members from selected groups ──
  const extractMembers = useCallback(async () => {
    if (!selectedInstance) return;
    setIsExtracting(true);
    setExtractProgress(0);

    const allMembers: ExtractedMember[] = [];
    const selectedArr = Array.from(selectedGroupJids);
    const phoneSet = new Set<string>();
    let totalCount = 0;
    let validCount = 0;
    let dupCount = 0;
    let invalidCount = 0;

    for (let gi = 0; gi < selectedArr.length; gi++) {
      const jid = selectedArr[gi];
      const groupData = groups.find((g) => g.phone === jid);
      const groupName = groupData?.name || jid;
      setExtractCurrentGroup(groupName);
      setExtractProgress(Math.round(((gi) / selectedArr.length) * 100));

      try {
        const webhookUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent";
        const payload = buildGroupPayload({
          action: "group.members",
          instance: {
            id: selectedInstance.id,
            name: selectedInstance.name,
            phone: selectedInstance.phoneNumber || "",
            provider: selectedInstance.provider,
            externalId: selectedInstance.idInstance || "",
            externalToken: selectedInstance.tokenInstance || "",
          },
          group: { jid },
        });

        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url: webhookUrl, payload },
        });

        if (proxyError || !proxyData) {
          console.error(`Webhook proxy error for group ${groupName}:`, proxyError);
          toast.error(`Falha ao buscar membros de "${groupName}"`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        console.log(`extractMembers proxy response for ${groupName}:`, JSON.stringify(proxyData).substring(0, 500));

        let data: any;
        try {
          data = typeof proxyData.body === "string" ? JSON.parse(proxyData.body) : proxyData.body;
        } catch {
          console.error(`JSON parse error for group ${groupName}`);
          toast.error(`Resposta inválida para "${groupName}"`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        if (!data) {
          console.warn(`Empty response for group ${groupName}`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Parse response — support multiple response structures
        let membersList: any[] = [];
        const src = data.data || data; // unwrap common data.data wrapper
        if (Array.isArray(src)) {
          for (const item of src) {
            if (item.participants && Array.isArray(item.participants)) {
              membersList.push(...item.participants);
            } else if (item.id || item.phone) {
              // direct array of member objects
              membersList.push(item);
            }
          }
        } else if (src.participants) {
          membersList = src.participants;
        } else if (src.members) {
          membersList = src.members;
        }

        console.log(`[ExtractLeads] Group "${groupName}": ${membersList.length} members found`, membersList[0]);

        for (const m of membersList) {
          // Normalizar: o webhook pode retornar phone OU id (JID format)
          const rawPhone = m.phone || m.id || "";
          if (!rawPhone || rawPhone.includes("-group") || rawPhone.includes("@g.us")) continue;
          const phone = rawPhone.replace(/@s\.whatsapp\.net$/, "").replace(/\D/g, "");
          if (!phone) continue;
          totalCount++;

          const isAdmin = m.isAdmin || m.isSuperAdmin || false;
          if (ignoreAdmins && isAdmin) {
            invalidCount++;
            continue;
          }

          if (ignoreInvalid && phone.length < 10) {
            invalidCount++;
            continue;
          }

          if (phoneSet.has(phone)) {
            dupCount++;
            continue;
          }

          phoneSet.add(phone);
          validCount++;
          allMembers.push({
            phone,
            name: m.name || m.pushName || m.notify || null,
            isAdmin,
            groupJid: jid,
            groupName,
          });
        }

        // Delay between groups to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`Erro ao extrair membros de ${groupName}:`, error);
        toast.error(`Falha ao extrair membros de "${groupName}"`);
      }
    }

    setExtractProgress(100);
    setExtractedMembers(allMembers);
    setExtractionStats({ total: totalCount, valid: validCount, duplicates: dupCount, invalid: invalidCount });
    setIsExtracting(false);
  }, [selectedInstance, selectedGroupJids, groups, configs, ignoreAdmins, ignoreInvalid]);

  // ── Step 4: Import to campaign ──
  const importLeads = useCallback(async () => {
    if (!user || !campaignId) return;
    setStep("importing");
    setImportProgress(0);

    // Group members by source group for detailed results
    const groupMap = new Map<string, ExtractedMember[]>();
    for (const m of extractedMembers) {
      const arr = groupMap.get(m.groupJid) || [];
      arr.push(m);
      groupMap.set(m.groupJid, arr);
    }

    // Check existing leads in campaign if needed
    let existingPhones = new Set<string>();
    if (ignoreCampaignExisting) {
      const { data: existing } = await supabase
        .from("leads")
        .select("phone")
        .eq("active_campaign_id", campaignId)
        .eq("user_id", user.id);
      existingPhones = new Set((existing || []).map((e) => e.phone));
    }

    const allResults: ExtractionResult[] = [];
    let totalExtracted = 0;
    const groupEntries = Array.from(groupMap.entries());

    for (let gi = 0; gi < groupEntries.length; gi++) {
      const [jid, members] = groupEntries[gi];
      const groupName = members[0]?.groupName || jid;
      const result: ExtractionResult = { groupName, total: members.length, extracted: 0, ignored: 0, invalid: 0 };

      const toInsert: any[] = [];
      for (const member of members) {
        if (existingPhones.has(member.phone)) {
          result.ignored++;
          continue;
        }

        const leadData: any = {
          user_id: user.id,
          phone: member.phone,
          name: member.name || null,
          status: "active",
          source_type: "whatsapp_group",
          tags: tags.length > 0 ? tags : [],
          active_campaign_id: campaignId,
          active_campaign_type: campaignType,
        };

        if (keepReference) {
          // source_group_id é uuid, não pode receber JID string
          leadData.source_group_name = groupName;
        }

        toInsert.push(leadData);
        existingPhones.add(member.phone);
      }

      // Batch upsert
      if (toInsert.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          const { data: upserted, error } = await supabase
            .from("leads")
            .upsert(batch, { onConflict: "phone,user_id", ignoreDuplicates: false })
            .select("id, phone");

          if (!error && upserted) {
            result.extracted += upserted.length;

            if (campaignType === "ligacao") {
              const rows = upserted.map((l) => ({
                campaign_id: campaignId,
                user_id: user.id,
                phone: l.phone,
                status: "pending",
              }));
              await supabase.from("call_leads").upsert(rows as any, { onConflict: "phone,campaign_id" });
            }

            if (campaignType === "despacho") {
              const rows = upserted.map((l) => ({
                campaign_id: campaignId,
                user_id: user.id,
                lead_id: l.id,
                status: "active",
              }));
              await supabase.from("dispatch_campaign_contacts").upsert(rows as any, { onConflict: "campaign_id,lead_id" });
            }
          } else if (error) {
            console.error("[ExtractLeads] Upsert error:", error.message, error);
            result.ignored += batch.length;
          }
        }
      }

      allResults.push(result);
      totalExtracted += result.extracted;
      setImportProgress(Math.round(((gi + 1) / groupEntries.length) * 100));
    }

    setImportResults(allResults);
    setStep("done");

    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
    queryClient.invalidateQueries({ queryKey: ["call-leads"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch_contacts"] });

    toast.success(`${totalExtracted} leads importados com sucesso!`);
  }, [user, extractedMembers, campaignId, campaignType, tags, keepReference, ignoreCampaignExisting, queryClient]);

  // ── Toggle helpers ──
  const toggleGroup = (jid: string) => {
    const next = new Set(selectedGroupJids);
    if (next.has(jid)) next.delete(jid);
    else next.add(jid);
    setSelectedGroupJids(next);
  };

  const toggleAllGroups = () => {
    if (selectedGroupJids.size === filteredGroups.length) setSelectedGroupJids(new Set());
    else setSelectedGroupJids(new Set(filteredGroups.map((g) => g.phone)));
  };

  // ── Step indicator ──
  const stepLabels = [
    { num: 1, label: "Instância" },
    { num: 2, label: "Listar Grupos" },
    { num: 3, label: "Extrair Leads" },
    { num: 4, label: "Atribuir Campanha" },
  ];

  const currentStepNum = typeof step === "number" ? step : step === "importing" ? 4 : 4;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {step === "done"
              ? "✅ Importação Concluída!"
              : step === "importing"
              ? "Importando Leads..."
              : "Extrair Leads de Grupos"}
          </DialogTitle>
          {step === 1 && (
            <DialogDescription>
              Extraia membros de grupos do WhatsApp e transforme em leads para suas campanhas.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-1 mb-2">
            {stepLabels.map((s, i) => (
              <div key={s.num} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    s.num < currentStepNum
                      ? "bg-primary/20 text-primary"
                      : s.num === currentStepNum
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.num < currentStepNum ? <Check className="h-3 w-3" /> : null}
                  {s.label}
                </div>
                {i < stepLabels.length - 1 && <div className="w-4 h-px bg-border" />}
              </div>
            ))}
          </div>
        )}

        {/* ═══ STEP 1: Select Instance ═══ */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Passo 1 — Selecionar Instância
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecione a instância do WhatsApp para buscar os grupos:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {instances?.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhuma instância cadastrada.</p>
              ) : (
                instances?.map((inst) => {
                  const isConnected = inst.status === "connected";
                  return (
                    <div
                      key={inst.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        selectedInstanceId === inst.id
                          ? "border-primary bg-primary/5"
                          : isConnected
                          ? "border-border hover:bg-muted/50 cursor-pointer"
                          : "border-border opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => isConnected && setSelectedInstanceId(inst.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {inst.provider} • {inst.phoneNumber || "Sem número"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={isConnected ? "default" : "secondary"}
                        className={`text-xs ${
                          isConnected
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : inst.status === "waitingConnection"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {isConnected ? "🟢 Conectado" : inst.status === "waitingConnection" ? "🟡 Aguardando" : "🔴 Desconectado"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-xs text-muted-foreground">⚠️ Apenas instâncias conectadas podem listar grupos.</p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button disabled={!selectedInstanceId} onClick={() => { setStep(2); fetchGroups(); }}>
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: List Groups ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Passo 2 — Listar Grupos
              </h3>
              <Button variant="ghost" size="sm" onClick={fetchGroups} disabled={groupsLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${groupsLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              📱 Instância: <strong>{selectedInstance?.name}</strong>{" "}
              {selectedInstance?.phoneNumber && `(${selectedInstance.phoneNumber})`}
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar grupo..." className="pl-9" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
              {groupsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Buscando grupos da instância...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {groupsFetched ? "Nenhum grupo encontrado." : "Clique em Atualizar para buscar grupos."}
                </p>
              ) : (
                filteredGroups.map((g) => (
                  <div
                    key={g.phone}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedGroupJids.has(g.phone) ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleGroup(g.phone)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Checkbox checked={selectedGroupJids.has(g.phone)} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{g.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{g.phone}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      👥 {g.messagesUnread || "?"}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            {filteredGroups.length > 0 && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={filteredGroups.length > 0 && selectedGroupJids.size === filteredGroups.length}
                    onCheckedChange={toggleAllGroups}
                  />
                  Selecionar todos ({filteredGroups.length} grupos)
                </label>
                <p className="text-sm text-muted-foreground">
                  📊 {selectedGroupJids.size} grupos selecionados
                </p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
                <Button disabled={selectedGroupJids.size === 0} onClick={() => setStep(3)}>
                  Continuar <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Extract Leads ═══ */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Passo 3 — Extrair Leads
            </h3>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>📱 Instância: <strong>{selectedInstance?.name}</strong></p>
              <p>👥 Grupos: <strong>{selectedGroupJids.size} selecionados</strong></p>
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-medium">Opções de Extração</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={ignoreInvalid} onCheckedChange={(v) => setIgnoreInvalid(!!v)} />
                Ignorar números inválidos (menos de 10 dígitos)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={ignoreAdmins} onCheckedChange={(v) => setIgnoreAdmins(!!v)} />
                Ignorar administradores dos grupos
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={keepReference} onCheckedChange={(v) => setKeepReference(!!v)} />
                Manter referência do grupo de origem
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Adicionar Tags (opcional)</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Extraction progress / results */}
            {isExtracting && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando: <strong>{extractCurrentGroup}</strong>
                </div>
                <Progress value={extractProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{extractProgress}%</p>
              </div>
            )}

            {!isExtracting && extractedMembers.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">✅ Membros extraídos!</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{extractionStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-2 bg-green-500/10 rounded-lg">
                    <p className="text-lg font-bold text-green-500">{extractionStats.valid}</p>
                    <p className="text-xs text-muted-foreground">Válidos</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                    <p className="text-lg font-bold text-yellow-500">{extractionStats.duplicates}</p>
                    <p className="text-xs text-muted-foreground">Duplicados</p>
                  </div>
                  <div className="text-center p-2 bg-red-500/10 rounded-lg">
                    <p className="text-lg font-bold text-red-500">{extractionStats.invalid}</p>
                    <p className="text-xs text-muted-foreground">Inválidos</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => { setExtractedMembers([]); setStep(2); }}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
                {extractedMembers.length === 0 ? (
                  <Button onClick={extractMembers} disabled={isExtracting}>
                    {isExtracting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                    Extrair Membros
                  </Button>
                ) : (
                  <Button onClick={() => setStep(4)}>
                    Continuar <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Assign Campaign ═══ */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Passo 4 — Atribuir a Campanha
            </h3>

            <p className="text-sm text-muted-foreground">
              📊 <strong>{extractionStats.valid}</strong> leads prontos para importar
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione a campanha de destino *</label>
              <Select value={campaignId ? `${campaignType}::${campaignId}` : ""} onValueChange={handleCampaignChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha..." />
                </SelectTrigger>
                <SelectContent>
                  {callCampaigns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>📞 Campanhas de Ligação</SelectLabel>
                      {callCampaigns.map((c: any) => (
                        <SelectItem key={c.id} value={`ligacao::${c.id}`}>
                          {c.name} <span className="ml-1 text-xs text-muted-foreground">[{c.status}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {dispatchCampaigns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>📱 Campanhas de Despacho</SelectLabel>
                      {dispatchCampaigns.map((c: any) => (
                        <SelectItem key={c.id} value={`despacho::${c.id}`}>
                          {c.name} <span className="ml-1 text-xs text-muted-foreground">[{c.status}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {groupCampaigns.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>👥 Campanhas de Grupo</SelectLabel>
                      {groupCampaigns.map((c: any) => (
                        <SelectItem key={c.id} value={`grupos::${c.id}`}>
                          {c.name} <span className="ml-1 text-xs text-muted-foreground">[{c.status}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-medium">Opções de Importação</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={ignoreCampaignExisting} onCheckedChange={(v) => setIgnoreCampaignExisting(!!v)} />
                Ignorar leads que já existem nesta campanha
              </label>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
                <Button disabled={!campaignId} onClick={importLeads}>
                  <Check className="mr-1 h-4 w-4" />
                  Importar {extractionStats.valid} Leads
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ IMPORTING ═══ */}
        {step === "importing" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importando leads para a campanha...
            </div>
            <Progress value={importProgress} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-xl font-bold">{totalResults.extracted} leads importados</p>
              <p className="text-sm text-muted-foreground">com sucesso!</p>
            </div>

            <div className="border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">📱 Instância</span>
                <span className="font-medium">{selectedInstance?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">👥 Grupos</span>
                <span className="font-medium">{selectedGroupJids.size} grupos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">📁 Campanha</span>
                <span className="font-medium">{selectedCampaignLabel}</span>
              </div>
              {tags.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🏷️ Tags</span>
                  <span className="font-medium">{tags.join(", ")}</span>
                </div>
              )}
            </div>

            {importResults.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Importados</TableHead>
                    <TableHead className="text-right">Ignorados</TableHead>
                    <TableHead className="text-right">Inválidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[180px] truncate">{r.groupName}</TableCell>
                      <TableCell className="text-right">{r.total}</TableCell>
                      <TableCell className="text-right text-green-500">{r.extracted}</TableCell>
                      <TableCell className="text-right text-yellow-500">{r.ignored}</TableCell>
                      <TableCell className="text-right text-red-500">{r.invalid}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{totalResults.total}</TableCell>
                    <TableCell className="text-right text-green-500">{totalResults.extracted}</TableCell>
                    <TableCell className="text-right text-yellow-500">{totalResults.ignored}</TableCell>
                    <TableCell className="text-right text-red-500">{totalResults.invalid}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button onClick={() => { handleClose(false); window.location.href = "/leads"; }}>
                <Eye className="mr-1 h-4 w-4" /> Ver Leads
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
