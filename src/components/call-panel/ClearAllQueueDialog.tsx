import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCallQueue } from "@/hooks/useCallQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Zap, AlertTriangle, Loader2 } from "lucide-react";

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

interface ClearAllQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignFilter?: string;
}

export function ClearAllQueueDialog({ open, onOpenChange, campaignFilter }: ClearAllQueueDialogProps) {
  const { activeCompanyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { clearQueue, isClearingQueue } = useCallQueue();

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!open || !activeCompanyId) return;
    setConfirmText("");
    setLoadingPreview(true);
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("queue_clear_all_preview", {
          p_company_id: activeCompanyId,
        });
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
        console.error("Clear preview error:", e);
      } finally {
        setLoadingPreview(false);
      }
    })();
  }, [open, activeCompanyId]);

  const handleClear = async () => {
    if (!activeCompanyId) return;
    setIsClearing(true);
    try {
      // Clear call_queue
      await clearQueue(campaignFilter);

      // Cancel scheduled/ready call_logs
      let q = (supabase as any)
        .from("call_logs")
        .update({ call_status: "cancelled", ended_at: new Date().toISOString() })
        .in("call_status", ["scheduled", "ready"])
        .eq("company_id", activeCompanyId);
      if (campaignFilter && campaignFilter !== "all") {
        q = q.eq("campaign_id", campaignFilter);
      }
      await q;

      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
      toast({
        title: "Fila esvaziada",
        description: `${preview?.total_count || 0} leads removidos da fila.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao limpar fila", description: e.message, variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  const priorityCampaigns = preview?.by_campaign.filter(c => c.is_priority) || [];
  const normalCampaigns = preview?.by_campaign.filter(c => !c.is_priority) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Limpar Toda a Fila
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="text-center py-2">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Você está prestes a remover <strong>TODOS</strong> os
              </p>
              <p className="text-2xl font-bold text-destructive">{preview.total_count} leads</p>
              <p className="text-sm text-muted-foreground">da fila de ligações.</p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">📊 Serão removidos:</p>

              {priorityCampaigns.length > 0 && (
                <div className="space-y-1">
                  <p className="flex items-center gap-1 font-medium">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Campanhas Prioritárias: <span className="text-amber-600">{preview.priority_count} leads</span>
                  </p>
                  {priorityCampaigns.map((c) => (
                    <p key={c.campaign_id} className="text-muted-foreground ml-5">
                      • {c.campaign_name} — {c.count} leads
                    </p>
                  ))}
                </div>
              )}

              {normalCampaigns.length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium">
                    📋 Campanhas Normais: <span>{preview.normal_count} leads</span>
                  </p>
                  {normalCampaigns.map((c) => (
                    <p key={c.campaign_id} className="text-muted-foreground ml-5">
                      • {c.campaign_name} — {c.count} leads
                    </p>
                  ))}
                </div>
              )}

              {preview.scheduled_count > 0 && (
                <p className="font-medium">📅 Agendados: {preview.scheduled_count} leads</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Para confirmar, digite <strong>"LIMPAR TUDO"</strong> abaixo:</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Digite "LIMPAR TUDO"'
              />
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Fila vazia</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={confirmText !== "LIMPAR TUDO" || isClearing || !preview || preview.total_count === 0}
            onClick={handleClear}
            className="gap-1.5"
          >
            {isClearing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <Trash2 className="h-3.5 w-3.5" />
            Limpar Toda a Fila
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
