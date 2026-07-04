import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { usePirateCampaigns } from "@/hooks/usePirateCampaigns";
import { useContextCampaigns } from "@/hooks/useContextCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NewCampaignDialog } from "@/components/campaigns";
import { cn } from "@/lib/utils";
import { 
  Folder, SendHorizontal, Users, Skull, Activity, Search, PhoneCall, 
  Plus, ArrowUpRight, GitBranch, RefreshCw
} from "lucide-react";

export default function CampaignsHub() {
  const navigate = useNavigate();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("Todas");

  // Fetch all workflow types
  const { campaigns: callCampaigns, isLoading: callLoading } = useCallCampaigns();
  const { campaigns: dispatchCampaigns, isLoading: dispatchLoading } = useDispatchCampaigns();
  const { campaigns: groupCampaigns, isLoading: groupLoading } = useGroupCampaigns();
  const { campaigns: pirateCampaigns, isLoading: pirateLoading } = usePirateCampaigns();
  const { campaigns: contextCampaigns, isLoading: contextLoading } = useContextCampaigns();

  const isLoading = 
    callLoading || dispatchLoading || groupLoading || 
    pirateLoading || contextLoading;

  // Folder definitions
  const folders = useMemo(() => [
    {
      id: "disparos",
      title: "Disparos",
      description: "Fluxos de broadcast agendados e massivos",
      count: dispatchCampaigns?.length || 0,
      icon: SendHorizontal,
      color: "from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/20",
      url: "/campaigns/whatsapp/despacho"
    },
    {
      id: "grupos",
      title: "Grupos",
      description: "Fluxos de automação e gestão de grupos",
      count: groupCampaigns?.length || 0,
      icon: Users,
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/20",
      url: "/campaigns/whatsapp/grupos"
    },
    {
      id: "pirata",
      title: "Pirata",
      description: "Fluxos de captação e disparos alternativos",
      count: pirateCampaigns?.length || 0,
      icon: Skull,
      color: "from-rose-500/20 to-rose-500/5 text-rose-500 border-rose-500/20",
      url: "/campaigns/whatsapp/pirata"
    },
    {
      id: "contexto",
      title: "Contexto",
      description: "Fluxos acionados por triggers de eventos",
      count: contextCampaigns?.length || 0,
      icon: Activity,
      color: "from-amber-500/20 to-amber-500/5 text-amber-500 border-amber-500/20",
      url: "/campaigns/whatsapp/contexto"
    },
    {
      id: "ligacao",
      title: "Ligações",
      description: "Campanhas telefônicas integradas ao discador",
      count: callCampaigns?.length || 0,
      icon: PhoneCall,
      color: "from-sky-500/20 to-sky-500/5 text-sky-500 border-sky-500/20",
      url: "/campaigns/telefonia/ligacao"
    }
  ], [dispatchCampaigns, groupCampaigns, pirateCampaigns, contextCampaigns, callCampaigns]);

  // Merge all workflows for the recent list
  const allWorkflows = useMemo(() => {
    const list = [
      ...(callCampaigns || []).map((c: any) => ({ ...c, uiCategory: 'Ligações', uiType: 'telefonia', uiIcon: PhoneCall, uiUrl: "/campaigns/telefonia/ligacao" })),
      ...(dispatchCampaigns || []).map((c: any) => ({ ...c, uiCategory: 'Disparos', uiType: 'whatsapp', uiIcon: SendHorizontal, uiUrl: "/campaigns/whatsapp/despacho" })),
      ...(groupCampaigns || []).map((c: any) => ({ ...c, uiCategory: 'Grupos', uiType: 'whatsapp', uiIcon: Users, uiUrl: "/campaigns/whatsapp/grupos" })),
      ...(pirateCampaigns || []).map((c: any) => ({ ...c, uiCategory: 'Pirata', uiType: 'whatsapp', uiIcon: Skull, uiUrl: "/campaigns/whatsapp/pirata" })),
      ...(contextCampaigns || []).map((c: any) => ({ ...c, uiCategory: 'Contexto', uiType: 'whatsapp', uiIcon: Activity, uiUrl: "/campaigns/whatsapp/contexto" })),
    ];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [callCampaigns, dispatchCampaigns, groupCampaigns, pirateCampaigns, contextCampaigns]);

  const filteredWorkflows = useMemo(() => {
    if (activeTab === "Todas") return allWorkflows;
    return allWorkflows.filter(w => w.uiCategory === activeTab);
  }, [activeTab, allWorkflows]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "running":
      case "active":
      case "in_progress":
        return { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Ativo', dot: 'bg-emerald-500' };
      case "completed":
        return { bg: 'bg-[#8A3CFF]/10 text-[#8A3CFF] border-[#8A3CFF]/20', label: 'Concluído', dot: 'bg-[#8A3CFF]' };
      case "paused":
        return { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Pausado', dot: 'bg-amber-500' };
      default:
        return { bg: 'bg-muted/40 text-muted-foreground border-border/40', label: 'Rascunho', dot: 'bg-muted-foreground' };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-1 min-h-0 bg-background/50">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight m-0 font-['Sora'] flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#8A3CFF]" />
            Workflows
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Gerencie seus fluxos de automação e campanhas categorizados por pastas.
          </p>
        </div>
        <Button 
          onClick={() => setShowNewDialog(true)} 
          className="h-9 gap-1.5 px-4 font-medium text-[13px] bg-[#8A3CFF] hover:bg-[#7830E3] text-white shadow-sm rounded-xl cursor-pointer transition-all duration-300"
        >
          <Plus className="w-4 h-4" /> Novo Workflow
        </Button>
      </div>

      {/* Folders Grid Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Categorias / Pastas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map(folder => {
            const FolderIcon = folder.icon;
            return (
              <Card 
                key={folder.id} 
                onClick={() => navigate(folder.url)}
                className="group border border-border/40 bg-card/65 hover:bg-card/90 hover:border-[#8A3CFF]/30 backdrop-blur-sm rounded-2xl shadow-sm cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <CardContent className="p-5 flex flex-col justify-between h-40">
                  <div className="flex justify-between items-start">
                    <div className={cn("p-2.5 rounded-xl border bg-gradient-to-tr shrink-0", folder.color)}>
                      <FolderIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold bg-[#8A3CFF]/10 text-[#8A3CFF] px-2.5 py-0.5 rounded-full uppercase">
                      {folder.count} {folder.count === 1 ? 'fluxo' : 'fluxos'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-[15px] text-card-foreground flex items-center gap-1 group-hover:text-[#8A3CFF] transition-colors">
                      {folder.title}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {folder.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Workflows Section */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Todos os Workflows Recentes</h3>
          <div className="flex gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/20">
            {['Todas', 'Disparos', 'Grupos', 'Pirata', 'Contexto', 'Ligações'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                  activeTab === tab 
                    ? "bg-background text-[#8A3CFF] shadow-sm font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl bg-card/25">
            <RefreshCw className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3 animate-spin" style={{ animationDuration: '4s' }} />
            <p className="text-sm font-semibold text-muted-foreground">Nenhum workflow recente nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkflows.slice(0, 9).map(workflow => {
              const sc = getStatusConfig(workflow.status || workflow.active ? 'active' : 'paused');
              const Icon = workflow.uiIcon;

              // Stats / Progress
              const total = workflow.stats?.total || workflow.total_leads || 0;
              const sent = workflow.stats?.sent || workflow.processed_leads || 0;
              const pct = total > 0 ? Math.round((sent / total) * 100) : 0;

              return (
                <Card 
                  key={workflow.id} 
                  onClick={() => navigate(workflow.uiUrl)}
                  className="border border-border/30 hover:border-[#8A3CFF]/20 bg-card/40 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 p-5 flex flex-col justify-between min-h-[175px]"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#8A3CFF]/15 text-[#8A3CFF]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{workflow.uiCategory}</span>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", sc.bg)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                        {sc.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-card-foreground line-clamp-1">{workflow.name}</h4>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Criado em {new Date(workflow.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Progresso</span>
                      <span className="font-mono">{sent.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", workflow.active ? "bg-emerald-500" : "bg-[#8A3CFF]")}
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>Concluído</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <NewCampaignDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
