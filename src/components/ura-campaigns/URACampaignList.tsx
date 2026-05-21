import { useState, useMemo } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Plus, Trash2, Copy, Play, Pause, ExternalLink, Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface URACampaignListProps {
  campaigns: URACampaign[];
  isLoading: boolean;
  onSelect: (campaign: URACampaign) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: URACampaign["status"]) => Promise<void>;
  onCreateNew: () => void;
  onDuplicate: (id: string) => Promise<void>;
  isDuplicating: boolean;
}

export function URACampaignList({
  campaigns,
  isLoading,
  onSelect,
  onDelete,
  onStatusChange,
  onCreateNew,
  onDuplicate,
  isDuplicating,
}: URACampaignListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "paused" | "draft">("all");
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
        (c.description?.toLowerCase() || "").includes(search.toLowerCase());
      
      const matchesTab = activeTab === "all" || c.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [campaigns, search, activeTab]);

  const getStatusConfig = (status: URACampaign["status"]) => {
    switch (status) {
      case "active":
        return { variant: "default" as const, label: "Ativa", class: "bg-emerald-500 hover:bg-emerald-600 text-white border-none" };
      case "paused":
        return { variant: "secondary" as const, label: "Pausada", class: "bg-amber-500 hover:bg-amber-600 text-white border-none" };
      case "completed":
        return { variant: "outline" as const, label: "Concluída", class: "bg-blue-500 hover:bg-blue-600 text-white border-none" };
      default:
        return { variant: "outline" as const, label: "Rascunho", class: "bg-slate-400 hover:bg-slate-500 text-white border-none" };
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 space-y-4 border border-border bg-card animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="flex gap-2 justify-end">
              <div className="h-8 bg-muted rounded w-16" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-border bg-background focus-visible:ring-primary"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={onCreateNew} className="h-10 w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/95">
            <Plus className="h-4 w-4" />
            Nova URA
          </Button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {(["all", "active", "paused", "draft"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-2 capitalize shrink-0",
              activeTab === tab
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "all" ? "Todas" : tab === "active" ? "Ativas" : tab === "paused" ? "Pausadas" : "Rascunhos"}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 border-dashed text-center">
          <Bot className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-semibold text-lg">Nenhuma campanha de URA</h3>
          <p className="text-muted-foreground max-w-sm mt-1">
            {search || activeTab !== "all" 
              ? "Nenhuma campanha corresponde aos filtros aplicados." 
              : "Crie sua primeira URA interativa para enviar torpedos de voz automáticos com opções DTMF."}
          </p>
          {!search && activeTab === "all" && (
            <Button onClick={onCreateNew} className="mt-4" variant="outline">
              Criar Campanha
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            const sc = getStatusConfig(campaign.status);
            return (
              <Card
                key={campaign.id}
                className="group border border-border bg-card p-6 flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 rounded-xl"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", sc.class)}>
                      {sc.label}
                    </Badge>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => onDuplicate(campaign.id)}
                        disabled={isDuplicating}
                        title="Duplicar Campanha"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setCampaignToDelete(campaign.id)}
                            title="Excluir Campanha"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deseja excluir esta campanha?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todos os leads e logs associados a esta campanha de URA serão permanentemente apagados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              onClick={async () => {
                                if (campaignToDelete) {
                                  await onDelete(campaignToDelete);
                                  setCampaignToDelete(null);
                                }
                              }}
                            >
                              Confirmar Exclusão
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg text-foreground line-clamp-1 mb-1">
                    {campaign.name}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 min-h-[40px] mb-4">
                    {campaign.description || "Sem descrição informada."}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Áudio: {campaign.audioType === "tts" ? "TTS (Texto)" : campaign.audioType === "ura" ? "URA do Sistema" : "Áudio Customizado"}</span>
                    <span className="font-semibold text-foreground/80">
                      {campaign.audioValue ? (campaign.audioValue.length > 20 ? `${campaign.audioValue.substring(0, 20)}...` : campaign.audioValue) : "Não configurado"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2 items-center">
                    <div className="flex gap-1.5">
                      {campaign.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => onStatusChange(campaign.id, "paused")}
                        >
                          <Pause className="h-3.5 w-3.5" />
                          Pausar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => onStatusChange(campaign.id, "active")}
                          disabled={!campaign.audioValue}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Iniciar
                        </Button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onSelect(campaign)}
                      className="h-8 gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none border border-border"
                    >
                      Detalhes
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
