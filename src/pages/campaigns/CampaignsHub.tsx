import { useState, useMemo } from "react";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { Button } from "@/components/ui/button";
import { MessageSquare, PhoneCall, Plus } from "lucide-react";
import { NewCampaignDialog } from "@/components/campaigns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignsHub() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("Todas");

  const { campaigns: callCampaigns, isLoading: callLoading } = useCallCampaigns();
  const { campaigns: dispatchCampaigns, isLoading: dispatchLoading } = useDispatchCampaigns();
  const { campaigns: groupCampaigns, isLoading: groupLoading } = useGroupCampaigns();

  const isLoading = callLoading || dispatchLoading || groupLoading;

  const allCampaigns = useMemo(() => {
    const list = [
      ...callCampaigns.map((c: any) => ({ ...c, uiType: 'telefonia', uiIcon: PhoneCall })),
      ...dispatchCampaigns.map((c: any) => ({ ...c, uiType: 'whatsapp', uiIcon: MessageSquare })),
      ...groupCampaigns.map((c: any) => ({ ...c, uiType: 'whatsapp', uiIcon: MessageSquare })),
    ];
    // Sort by created_at desc
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [callCampaigns, dispatchCampaigns, groupCampaigns]);

  const filteredCampaigns = useMemo(() => {
    if (activeTab === "Todas") return allCampaigns;
    if (activeTab === "WhatsApp") return allCampaigns.filter(c => c.uiType === "whatsapp");
    if (activeTab === "Telefonia") return allCampaigns.filter(c => c.uiType === "telefonia");
    return allCampaigns;
  }, [activeTab, allCampaigns]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "running":
      case "active":
      case "in_progress":
        return { bg: 'hsl(142 71% 45%/0.12)', color: 'hsl(142 61% 35%)', label: 'Em execução', dot: 'hsl(142 71% 45%)' };
      case "completed":
        return { bg: 'hsl(238 56% 46%/0.1)',  color: 'hsl(238 56% 46%)', label: 'Concluída',   dot: 'hsl(238 56% 46%)' };
      case "paused":
        return { bg: 'hsl(220 10% 96%)',       color: 'hsl(220 10% 45%)', label: 'Pausada',     dot: 'hsl(220 10% 55%)' };
      default:
        return { bg: 'hsl(220 10% 96%)',       color: 'hsl(220 10% 45%)', label: 'Rascunho',    dot: 'hsl(220 10% 55%)' };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-1 min-h-0 bg-background">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight m-0 font-['Sora']">Campanhas</h1>
          <p className="text-[14px] text-muted-foreground mt-1">WhatsApp, grupos e telefonia</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="h-9 gap-1.5 px-3.5 font-medium text-[13px] bg-primary text-primary-foreground shadow-none rounded-md hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Nova Campanha
        </Button>
      </div>

      <div className="flex gap-1">
        {['Todas', 'WhatsApp', 'Telefonia'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-3.5 py-1.5 rounded-md border text-[13px] font-medium transition-colors font-sans",
              activeTab === t 
                ? "bg-primary text-white border-primary" 
                : "bg-transparent border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCampaigns.map(c => {
            const sc = getStatusConfig(c.status);
            // Progress logic placeholder - adapt based on real data model
            const total = c.stats?.total || c.total_leads || 0;
            const sent = c.stats?.sent || c.processed_leads || 0;
            const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
            const Icon = c.uiIcon;

            return (
              <div key={c.id} className="bg-card border border-border rounded-lg p-5 shadow-[0_1px_2px_hsl(220_15%_10%/0.05)] flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.color }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.dot }} />
                    {sc.label}
                  </span>
                </div>
                <div className="text-[14px] font-semibold text-foreground mt-1">{c.name}</div>
                <div className="text-[12px] text-muted-foreground">Criada em {new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">Progresso</span>
                    <span className="text-[11px] font-mono text-muted-foreground/80">{sent.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${pct}%`, 
                        backgroundColor: c.status === 'completed' ? 'hsl(238 56% 46%)' : 'hsl(142 71% 45%)' 
                      }} 
                    />
                  </div>
                  <div className="text-right mt-1 text-[11px] text-muted-foreground font-mono">{pct}%</div>
                </div>
              </div>
            );
          })}
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm font-medium">Nenhuma campanha encontrada.</p>
            </div>
          )}
        </div>
      )}

      <NewCampaignDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
