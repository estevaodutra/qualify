import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignBreakdown {
  campaign_id: string;
  campaign_name: string;
  is_priority: boolean;
  count: number;
}

interface PreviewData {
  total_count: number;
  priority_count: number;
  normal_count: number;
  scheduled_count: number;
  by_campaign: CampaignBreakdown[];
}

interface RemoveFromQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveFromQueueDialog({ open, onOpenChange }: RemoveFromQueueDialogProps) {
  const { activeCompanyId } = useCompany();
  const { campaigns } = useCallCampaigns();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [allCampaigns, setAllCampaigns] = useState(true);
  const [attemptFilter, setAttemptFilter] = useState<string>("all");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Priority confirmation sub-dialog
  const [showPriorityConfirm, setShowPriorityConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Queue counts per campaign
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});

  // Fetch queue counts on open (from both call_queue and call_logs)
  useEffect(() => {
    if (!open || !activeCompanyId) return;
    (async () => {
      const counts: Record<string, number> = {};

      // Count from call_queue (waiting)
      const { data: queueData } = await (supabase as any)
        .from("call_queue")
        .select("campaign_id")
        .eq("company_id", activeCompanyId)
        .eq("status", "waiting");
      if (queueData) {
        queueData.forEach((r: any) => {
          counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1;
        });
      }

      // Count from call_logs (scheduled/ready - fallback queue)
      const { data: logData } = await (supabase as any)
        .from("call_logs")
        .select("campaign_id")
        .eq("company_id", activeCompanyId)
        .in("call_status", ["scheduled", "ready"]);
      if (logData) {
        logData.forEach((r: any) => {
          counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1;
        });
      }

      setQueueCounts(counts);
    })();
  }, [open, activeCompanyId]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedCampaigns([]);
      setAllCampaigns(true);
      setAttemptFilter("all");
      setPreview(null);
      setShowPriorityConfirm(false);
      setConfirmText("");
    }
  }, [open]);

  // Fetch preview when filters change
  const fetchPreview = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoadingPreview(true);
    try {
      const params: any = { p_company_id: activeCompanyId };
      if (!allCampaigns && selectedCampaigns.length > 0) {
        params.p_campaign_ids = selectedCampaigns;
      }
      if (attemptFilter !== "all") {
        params.p_attempt_filter = attemptFilter;
      }
      const { data, error } = await (supabase as any).rpc("queue_remove_preview", params);
      if (error) throw error;
      if (data && data.length > 0) {
        const row = data[0];
        setPreview({
          total_count: row.total_count || 0,
          priority_count: row.priority_count || 0,
          normal_count: row.normal_count || 0,
          scheduled_count: row.scheduled_count || 0,
          by_campaign: row.by_campaign || [],
        });
      }
    } catch (e) {
      console.error("Preview error:", e);
    } finally {
      setLoadingPreview(false);
    }
  }, [activeCompanyId, allCampaigns, selectedCampaigns, attemptFilter]);

  useEffect(() => {
    if (open) fetchPreview();
  }, [open, fetchPreview]);

  const toggleCampaign = (id: string) => {
    setAllCampaigns(false);
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleRemoveClick = () => {
    if (!preview || preview.total_count === 0) return;
    if (preview.priority_count > 0) {
      setShowPriorityConfirm(true);
      setConfirmText("");
    } else {
      executeRemoval();
    }
  };

  const executeRemoval = async () => {
    if (!activeCompanyId) return;
    setIsRemoving(true);
    try {
      const params: any = { p_company_id: activeCompanyId };
      if (!allCampaigns && selectedCampaigns.length > 0) {
        params.p_campaign_ids = selectedCampaigns;
      }
      if (attemptFilter !== "all") {
        params.p_attempt_filter = attemptFilter;
      }
      const { data, error } = await (supabase as any).rpc("queue_remove_bulk", params);
      if (error) throw error;
      const result = data?.[0];
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
      toast({
        title: "Leads removidos da fila",
        description: `${result?.removed_count || 0} removidos (${result?.removed_priority || 0} prioritários, ${result?.removed_normal || 0} normais)`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setIsRemoving(false);
      setShowPriorityConfirm(false);
    }
  };

  const campaignsWithQueue = campaigns;
  const remaining = (preview?.total_count || 0);

  return (
    <>
      <Dialog open={open && !showPriorityConfirm} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remover da Fila
            </DialogTitle>
            <DialogDescription>
              Selecione filtros para remover leads específicos da fila de ligações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Campaign filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtrar por Campanha</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allCampaigns}
                    onCheckedChange={(checked) => {
                      setAllCampaigns(!!checked);
                      if (checked) setSelectedCampaigns([]);
                    }}
                  />
                  <span className="text-sm font-medium">Todas as campanhas</span>
                </label>

                {campaignsWithQueue.length > 0 && (
                  <div className="border-t pt-2 mt-2 space-y-1.5">
                    {campaignsWithQueue.map((c: any) => (
                      <label key={c.id} className="flex items-center justify-between gap-2 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCampaigns.includes(c.id)}
                            
                            onCheckedChange={() => toggleCampaign(c.id)}
                          />
                          <span className="text-sm flex items-center gap-1">
                            {c.isPriority && <Zap className="h-3.5 w-3.5 text-amber-500" />}
                            {c.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{queueCounts[c.id] || 0} na fila</Badge>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Attempt filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtrar por Tentativas</Label>
              <Select value={attemptFilter} onValueChange={setAttemptFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer número de tentativas</SelectItem>
                  <SelectItem value="first">Apenas 1ª tentativa</SelectItem>
                  <SelectItem value="retry">2ª tentativa ou mais</SelectItem>
                  <SelectItem value="last">Última tentativa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">📊 Prévia da Remoção</Label>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold text-destructive">{preview.total_count}</p>
                      <p className="text-[10px] text-muted-foreground">Serão Removidos</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold text-amber-600">{preview.priority_count}</p>
                      <p className="text-[10px] text-muted-foreground">⚡ Prioritários</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold text-muted-foreground">{preview.normal_count}</p>
                      <p className="text-[10px] text-muted-foreground">📋 Normais</p>
                    </div>
                  </div>

                  {preview.priority_count > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        {preview.priority_count} leads de campanhas prioritárias serão removidos
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!preview || preview.total_count === 0 || isRemoving}
              onClick={handleRemoveClick}
              className="gap-1.5"
            >
              {isRemoving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5" />
              Remover {preview?.total_count || 0} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority confirmation sub-dialog */}
      <Dialog open={showPriorityConfirm} onOpenChange={(v) => { if (!v) setShowPriorityConfirm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Remoção de Prioritários
            </DialogTitle>
            <DialogDescription>
              Você está prestes a remover leads de campanhas prioritárias da fila.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm"><strong>Total a remover:</strong> {preview?.total_count} leads</p>

              {preview && preview.by_campaign.filter(c => c.is_priority).length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Campanhas Prioritárias:
                  </p>
                  {preview.by_campaign.filter(c => c.is_priority).map((c) => (
                    <p key={c.campaign_id} className="text-sm text-muted-foreground ml-5">
                      • {c.campaign_name} — {c.count} leads
                    </p>
                  ))}
                </div>
              )}

              {preview && preview.by_campaign.filter(c => !c.is_priority).length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">📋 Campanhas Normais:</p>
                  {preview.by_campaign.filter(c => !c.is_priority).map((c) => (
                    <p key={c.campaign_id} className="text-sm text-muted-foreground ml-5">
                      • {c.campaign_name} — {c.count} leads
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Para confirmar, digite <strong>"REMOVER"</strong> abaixo:</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Digite "REMOVER"'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriorityConfirm(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "REMOVER" || isRemoving}
              onClick={executeRemoval}
              className="gap-1.5"
            >
              {isRemoving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5" />
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
