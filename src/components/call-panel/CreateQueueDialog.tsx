import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
  import {
  FolderOpen,
  Filter,
  Hash,
  Settings2,
  CheckCircle2,
  Loader2,
  Plus,
  Play,
  BarChart3,
  Search,
  Tag,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ── Types ──

interface CreateQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartQueue?: (campaignId: string) => void;
}

type OrderBy = "recent" | "oldest" | "least_attempts" | "random";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendentes (nunca ligados)", description: "Leads que nunca receberam ligação" },
  { value: "no_answer", label: "Não atenderam", description: "Tentativas anteriores sem sucesso" },
  { value: "completed", label: "Já atendidos", description: "Leads que já atenderam pelo menos uma vez" },
  { value: "scheduled", label: "Reagendados", description: "Leads com ligação agendada" },
  { value: "failed", label: "Esgotados / Falha", description: "Leads que falharam ou atingiram máximo" },
] as const;

const ORDER_OPTIONS: { value: OrderBy; label: string }[] = [
  { value: "recent", label: "Mais recentes primeiro" },
  { value: "oldest", label: "Mais antigos primeiro" },
  { value: "least_attempts", label: "Menos tentativas primeiro" },
  { value: "random", label: "Aleatório" },
];

type Phase = "form" | "creating" | "done";

// ── Component ──

export function CreateQueueDialog({ open, onOpenChange, onStartQueue }: CreateQueueDialogProps) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { campaigns } = useCallCampaigns();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [campaignId, setCampaignId] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["pending", "no_answer"]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [manualTag, setManualTag] = useState("");
  const [quantityMode, setQuantityMode] = useState<"all" | "limit">("all");
  const [quantityLimit, setQuantityLimit] = useState(50);
  const [orderBy, setOrderBy] = useState<OrderBy>("recent");
  const [isPriority, setIsPriority] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [ignoreExisting, setIgnoreExisting] = useState(true);

  // Preview state
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [existingCount, setExistingCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number }[]>([]);

  // Creation state
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCampaignId("");
      setSelectedStatuses(["pending", "no_answer"]);
      setSelectedTags([]);
      setTagSearch("");
      setQuantityMode("all");
      setQuantityLimit(50);
      setOrderBy("recent");
      setIsPriority(true);
      setAutoStart(false);
      setIgnoreExisting(true);
      setPhase("form");
      setProgress(0);
      setResult(null);
      setFilteredCount(null);
      setExistingCount(0);
      setStatusCounts({});
      setAvailableTags([]);
    }
  }, [open]);

  // Load status counts + tags when campaign changes
  useEffect(() => {
    if (!campaignId) {
      setStatusCounts({});
      setAvailableTags([]);
      setFilteredCount(null);
      return;
    }
    loadCampaignMeta(campaignId);
  }, [campaignId]);

  // Update filtered count when filters change
  useEffect(() => {
    if (!campaignId) return;
    loadFilteredCount();
  }, [campaignId, selectedStatuses, selectedTags]);

  // Load existing queue count
  useEffect(() => {
    if (!campaignId || !ignoreExisting) {
      setExistingCount(0);
      return;
    }
    loadExistingCount();
  }, [campaignId, ignoreExisting]);

  async function loadCampaignMeta(cId: string) {
    // Status counts — paginate to handle >1000 call_leads
    const PAGE = 1000;
    let allLeads: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("call_leads")
        .select("status, custom_fields, phone")
        .eq("campaign_id", cId)
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allLeads.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const leads = allLeads;
    if (leads.length > 0) {
      const counts: Record<string, number> = {};
      const tagMap = new Map<string, number>();

      for (const lead of leads) {
        const s = lead.status || "pending";
        counts[s] = (counts[s] || 0) + 1;

        // Extract tags from custom_fields
        const cf = lead.custom_fields;
        if (cf && typeof cf === "object" && Array.isArray((cf as any).tags)) {
          for (const tag of (cf as any).tags) {
            if (typeof tag === "string" && tag.trim()) {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            }
          }
        }
      }

      // Also fetch tags from leads table for leads linked to this campaign (by phone)
      try {
        const phones = leads.map((l: any) => l.phone).filter(Boolean);
        if (phones.length > 0) {
          const uniquePhones = [...new Set(phones)] as string[];
          const leadTagMap = new Map<string, number>();
          for (let i = 0; i < uniquePhones.length; i += 200) {
            const batch = uniquePhones.slice(i, i + 200);
            // Paginate each batch query to handle >1000 results
            let batchFrom = 0;
            while (true) {
              const { data: leadsWithTags } = await supabase
                .from("leads")
                .select("tags")
                .in("phone", batch)
                .not("tags", "eq", "{}")
                .range(batchFrom, batchFrom + PAGE - 1);
              if (!leadsWithTags || leadsWithTags.length === 0) break;
              for (const lead of leadsWithTags) {
                if (Array.isArray(lead.tags)) {
                  for (const tag of lead.tags) {
                    if (typeof tag === "string" && tag.trim()) {
                      leadTagMap.set(tag, (leadTagMap.get(tag) || 0) + 1);
                    }
                  }
                }
              }
              if (leadsWithTags.length < PAGE) break;
              batchFrom += PAGE;
            }
          }
          // Merge: if tag already in tagMap, take the max; otherwise use leads count
          for (const [tag, count] of leadTagMap) {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, count);
            } else {
              tagMap.set(tag, Math.max(tagMap.get(tag)!, count));
            }
          }
        }
      } catch {
        // Ignore errors fetching from leads table
      }

      setStatusCounts(counts);
      setAvailableTags(
        Array.from(tagMap.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
      );
    }
  }

  // Helper: get phones from leads table that have any of the selected tags
  async function getLeadPhonesByTags(cId: string, tags: string[]): Promise<Set<string>> {
    const matchedPhones = new Set<string>();
    if (tags.length === 0) return matchedPhones;

    // Paginate call_leads phones
    const PAGE = 1000;
    let allClPhones: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("call_leads")
        .select("phone")
        .eq("campaign_id", cId)
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allClPhones.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    if (allClPhones.length === 0) return matchedPhones;

    const uniquePhones = [...new Set(allClPhones.map((l: any) => l.phone).filter(Boolean))] as string[];

    // Query leads table in batches, with pagination per batch
    for (let i = 0; i < uniquePhones.length; i += 200) {
      const batch = uniquePhones.slice(i, i + 200);
      let batchFrom = 0;
      while (true) {
        const { data: leadsWithTags } = await supabase
          .from("leads")
          .select("phone, tags")
          .in("phone", batch)
          .overlaps("tags", tags)
          .range(batchFrom, batchFrom + PAGE - 1);
        if (!leadsWithTags || leadsWithTags.length === 0) break;
        for (const lead of leadsWithTags) {
          matchedPhones.add(lead.phone);
        }
        if (leadsWithTags.length < PAGE) break;
        batchFrom += PAGE;
      }
    }

    return matchedPhones;
  }

  async function loadFilteredCount() {
    if (selectedTags.length > 0) {
      // When tags are selected, we need to match by phone against leads table
      const matchedPhones = await getLeadPhonesByTags(campaignId, selectedTags);

      // Also fetch call_leads that have tags in custom_fields (paginated)
      const PAGE = 1000;
      let allLeads: any[] = [];
      let from = 0;
      const statuses = selectedStatuses.length > 0 ? selectedStatuses : ["pending", "no_answer", "completed", "scheduled", "failed"];
      while (true) {
        const { data } = await (supabase as any)
          .from("call_leads")
          .select("phone, custom_fields")
          .eq("campaign_id", campaignId)
          .in("status", statuses)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        allLeads.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const filtered = allLeads.filter((l: any) => {
        if (matchedPhones.has(l.phone)) return true;
        const cfTags = l.custom_fields?.tags;
        if (Array.isArray(cfTags) && selectedTags.some(t => cfTags.includes(t))) return true;
        return false;
      });
      setFilteredCount(filtered.length);
      return;
    }

    // No tags selected - simple count by status
    let query = (supabase as any)
      .from("call_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if (selectedStatuses.length > 0) {
      query = query.in("status", selectedStatuses);
    }

    const { count } = await query;
    setFilteredCount(count ?? 0);
  }

  async function loadExistingCount() {
    const { count } = await (supabase as any)
      .from("call_queue")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "waiting");

    setExistingCount(count ?? 0);
  }

  const selectedCampaign = campaigns.find(c => c.id === campaignId);
  const totalLeads = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const willAdd = useMemo(() => {
    if (filteredCount === null) return 0;
    const afterExisting = ignoreExisting ? Math.max(0, filteredCount - existingCount) : filteredCount;
    return quantityMode === "limit" ? Math.min(quantityLimit, afterExisting) : afterExisting;
  }, [filteredCount, existingCount, ignoreExisting, quantityMode, quantityLimit]);

  const filteredTags = useMemo(() => {
    if (!tagSearch) return availableTags;
    const s = tagSearch.toLowerCase();
    return availableTags.filter(t => t.tag.toLowerCase().includes(s));
  }, [availableTags, tagSearch]);

  // ── Submit ──

  async function handleSubmit() {
    if (!campaignId || !user) return;

    setPhase("creating");
    setProgress(0);
    setProgressText("Buscando leads filtrados...");

    try {
      // 1. Fetch filtered leads (paginated)
      const PAGE = 1000;
      let allLeads: any[] = [];
      let from = 0;
      while (true) {
        let query = (supabase as any)
          .from("call_leads")
          .select("id, phone, name, status, custom_fields, attempts, created_at")
          .eq("campaign_id", campaignId);

        if (selectedStatuses.length > 0) {
          query = query.in("status", selectedStatuses);
        }

        switch (orderBy) {
          case "recent": query = query.order("created_at", { ascending: false }); break;
          case "oldest": query = query.order("created_at", { ascending: true }); break;
          case "least_attempts": query = query.order("attempts", { ascending: true }); break;
        }

        query = query.range(from, from + PAGE - 1);
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!data || data.length === 0) break;
        allLeads.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      let leads = allLeads;

      // Filter by tags client-side (check both custom_fields.tags AND leads table tags)
      if (selectedTags.length > 0) {
        const matchedPhones = await getLeadPhonesByTags(campaignId, selectedTags);
        leads = leads.filter((l: any) => {
          if (matchedPhones.has(l.phone)) return true;
          const cfTags = l.custom_fields?.tags;
          if (Array.isArray(cfTags) && selectedTags.some(t => cfTags.includes(t))) return true;
          return false;
        });
      }

      // Shuffle if random
      if (orderBy === "random") {
        leads.sort(() => Math.random() - 0.5);
      }

      setProgress(10);
      setProgressText("Verificando fila existente...");

      // 2. If ignoreExisting, get phones already in queue
      let existingPhones = new Set<string>();
      if (ignoreExisting) {
        let exFrom = 0;
        while (true) {
          const { data: existing } = await (supabase as any)
            .from("call_queue")
            .select("phone")
            .eq("campaign_id", campaignId)
            .eq("status", "waiting")
            .range(exFrom, exFrom + PAGE - 1);
          if (!existing || existing.length === 0) break;
          for (const e of existing) existingPhones.add(e.phone);
          if (existing.length < PAGE) break;
          exFrom += PAGE;
        }
      }

      // Filter out existing
      leads = leads.filter((l: any) => !existingPhones.has(l.phone));

      // Apply limit
      if (quantityMode === "limit") {
        leads = leads.slice(0, quantityLimit);
      }

      setProgress(20);

      const totalToAdd = leads.length;
      let added = 0;
      let skipped = 0;

      if (totalToAdd === 0) {
        setResult({ added: 0, skipped: 0 });
        setPhase("done");
        return;
      }

      // 3. Insert in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < totalToAdd; i += BATCH_SIZE) {
        const batch = leads.slice(i, i + BATCH_SIZE);
        const rows = batch.map((lead: any) => ({
          campaign_id: campaignId,
          user_id: user.id,
          company_id: activeCompanyId || null,
          phone: lead.phone,
          lead_name: lead.name || null,
          lead_id: lead.id,
          is_priority: isPriority,
          source: "queue_builder",
          status: "waiting",
        }));

        const { error: insertError, data: inserted } = await (supabase as any)
          .from("call_queue")
          .insert(rows)
          .select("id");

        if (insertError) {
          // Some might fail due to duplicates, count what succeeded
          skipped += batch.length;
        } else {
          added += (inserted || []).length;
          skipped += batch.length - (inserted || []).length;
        }

        const pct = 20 + ((i + batch.length) / totalToAdd) * 70;
        setProgress(Math.min(90, pct));
        setProgressText(`${added} de ${totalToAdd} leads adicionados...`);
      }

      setProgress(100);
      setResult({ added, skipped });
      setPhase("done");

      // Invalidate queue queries
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });

      // 4. Auto-start if enabled
      if (autoStart && onStartQueue) {
        onStartQueue(campaignId);
      }
    } catch (err: any) {
      toast({ title: "Erro ao criar fila", description: err.message, variant: "destructive" });
      setPhase("form");
    }
  }

  function handleCreateAnother() {
    setCampaignId("");
    setSelectedStatuses(["pending", "no_answer"]);
    setSelectedTags([]);
    setTagSearch("");
    setQuantityMode("all");
    setQuantityLimit(50);
    setOrderBy("recent");
    setPhase("form");
    setProgress(0);
    setResult(null);
    setFilteredCount(null);
    setExistingCount(0);
  }

  // ── Render ──

  return (
    <Dialog open={open} onOpenChange={phase === "creating" ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phase === "done" ? (
              <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Fila Criada!</>
            ) : phase === "creating" ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Criando Fila...</>
            ) : (
              <><Plus className="h-5 w-5" /> Criar Fila de Ligações</>
            )}
          </DialogTitle>
          <DialogDescription>
            {phase === "form" && "Selecione os leads para adicionar à fila de discagem."}
          </DialogDescription>
        </DialogHeader>

        {/* ── CREATING PHASE ── */}
        {phase === "creating" && (
          <div className="py-8 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Adicionando leads à fila...</p>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground">{progressText}</p>
          </div>
        )}

        {/* ── DONE PHASE ── */}
        {phase === "done" && result && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-xl font-bold">{result.added} leads adicionados</p>
              <p className="text-sm text-muted-foreground">à fila!</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campanha</span>
                <span className="font-medium">{selectedCampaign?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adicionados</span>
                <span className="font-medium text-emerald-600">{result.added} leads</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ignorados</span>
                  <span className="font-medium text-orange-600">{result.skipped} (já na fila ou erro)</span>
                </div>
              )}
              {selectedTags.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tags</span>
                  <span className="font-medium">{selectedTags.join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordem</span>
                <span className="font-medium">{ORDER_OPTIONS.find(o => o.value === orderBy)?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridade</span>
                <span className="font-medium">{isPriority ? "Sim" : "Não"}</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCreateAnother}>
                <Plus className="h-4 w-4 mr-1" /> Criar Outra
              </Button>
              {onStartQueue && (
                <Button variant="outline" onClick={() => { onStartQueue(campaignId); onOpenChange(false); }}>
                  <Play className="h-4 w-4 mr-1" /> Iniciar Fila
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        )}

        {/* ── FORM PHASE ── */}
        {phase === "form" && (
          <div className="space-y-6">
            {/* STEP 1 — Campaign */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <FolderOpen className="h-4 w-4" /> Passo 1 — Selecionar Campanha
              </div>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : c.status}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaignId && totalLeads > 0 && (
                <p className="text-xs text-muted-foreground">{totalLeads} leads nesta campanha</p>
              )}
            </section>

            {campaignId && (
              <>
                {/* STEP 2 — Filters */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <Filter className="h-4 w-4" /> Passo 2 — Filtrar Leads
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Status do Lead</Label>
                    <div className="rounded-lg border p-3 space-y-2">
                      {STATUS_OPTIONS.map(opt => {
                        const count = statusCounts[opt.value] || 0;
                        return (
                          <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                            <Checkbox
                              checked={selectedStatuses.includes(opt.value)}
                              onCheckedChange={(checked) => {
                                setSelectedStatuses(prev =>
                                  checked ? [...prev, opt.value] : prev.filter(s => s !== opt.value)
                                );
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{opt.label}</span>
                              <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{count}</Badge>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Filtrar por Tags</Label>
                    <div className="rounded-lg border p-3 space-y-2">
                      {availableTags.length > 5 && (
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Buscar tag..."
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            className="h-8 pl-8 text-xs"
                          />
                        </div>
                      )}
                      {availableTags.length > 0 ? (
                        <div className="max-h-[140px] overflow-y-auto space-y-1.5">
                          {filteredTags.map(({ tag, count }) => (
                            <label key={tag} className="flex items-center gap-3 cursor-pointer">
                              <Checkbox
                                checked={selectedTags.includes(tag)}
                                onCheckedChange={(checked) => {
                                  setSelectedTags(prev =>
                                    checked ? [...prev, tag] : prev.filter(t => t !== tag)
                                  );
                                }}
                              />
                              <span className="text-sm flex-1">{tag}</span>
                              <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          Nenhuma tag disponível nesta campanha
                        </p>
                      )}
                      {/* Manual tag input */}
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="Adicionar tag manualmente..."
                          value={manualTag}
                          onChange={e => setManualTag(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && manualTag.trim()) {
                              e.preventDefault();
                              const tag = manualTag.trim();
                              if (!selectedTags.includes(tag)) {
                                setSelectedTags(prev => [...prev, tag]);
                              }
                              if (!availableTags.some(t => t.tag === tag)) {
                                setAvailableTags(prev => [...prev, { tag, count: 0 }]);
                              }
                              setManualTag("");
                            }
                          }}
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={!manualTag.trim()}
                          onClick={() => {
                            const tag = manualTag.trim();
                            if (tag && !selectedTags.includes(tag)) {
                              setSelectedTags(prev => [...prev, tag]);
                            }
                            if (tag && !availableTags.some(t => t.tag === tag)) {
                              setAvailableTags(prev => [...prev, { tag, count: 0 }]);
                            }
                            setManualTag("");
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {selectedTags.length > 0 && (
                        <p className="text-[11px] text-muted-foreground pt-1 border-t">
                          Selecionadas: {selectedTags.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* STEP 3 — Quantity & Order */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <Hash className="h-4 w-4" /> Passo 3 — Quantidade e Ordem
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Quantidade de leads</Label>
                    <RadioGroup value={quantityMode} onValueChange={(v) => setQuantityMode(v as "all" | "limit")} className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="all" />
                        <span className="text-sm">Todos os leads filtrados{filteredCount !== null ? ` (${filteredCount})` : ""}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="limit" />
                        <span className="text-sm">Limitar quantidade:</span>
                        {quantityMode === "limit" && (
                          <Input
                            type="number"
                            min={1}
                            value={quantityLimit}
                            onChange={e => setQuantityLimit(Math.max(1, Number(e.target.value)))}
                            className="h-7 w-20 text-xs"
                          />
                        )}
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Ordenar por</Label>
                    <RadioGroup value={orderBy} onValueChange={(v) => setOrderBy(v as OrderBy)} className="space-y-1.5">
                      {ORDER_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value={opt.value} />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </section>

                {/* STEP 4 — Options */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <Settings2 className="h-4 w-4" /> Passo 4 — Opções
                  </div>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={isPriority} onCheckedChange={(c) => setIsPriority(!!c)} />
                      <span className="text-sm">Marcar como prioridade</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={autoStart} onCheckedChange={(c) => setAutoStart(!!c)} />
                      <span className="text-sm">Iniciar fila automaticamente após criar</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={ignoreExisting} onCheckedChange={(c) => setIgnoreExisting(!!c)} />
                      <span className="text-sm">Ignorar leads que já estão na fila</span>
                    </label>
                  </div>
                </section>

                {/* Preview */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <BarChart3 className="h-4 w-4" /> Prévia
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Campanha</p>
                      <p className="text-sm font-semibold truncate">{selectedCampaign?.name || "—"}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Filtrados</p>
                      <p className="text-sm font-semibold">{filteredCount ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Serão adicionados</p>
                      <p className="text-sm font-semibold text-emerald-600">{willAdd}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Já na fila</p>
                      <p className="text-sm font-semibold text-orange-600">{existingCount}</p>
                    </div>
                  </div>
                </section>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={!campaignId || willAdd === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Criar Fila com {willAdd} Lead{willAdd !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
