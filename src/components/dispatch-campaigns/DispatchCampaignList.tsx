import { useState } from "react";
import { DispatchCampaign } from "@/hooks/useDispatchCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, MoreVertical, Settings, Trash2, Play, Pause, FileEdit, Megaphone, Copy, CheckCircle, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DispatchCampaignListProps {
  campaigns: DispatchCampaign[];
  isLoading: boolean;
  onSelect: (campaign: DispatchCampaign) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onCreateNew: () => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  draft: { label: "Rascunho", className: "bg-muted/40 text-muted-foreground border-none", icon: FileEdit },
  active: { label: "Ativa", className: "bg-[#22DD4F]/12 text-[#22DD4F] border-none", icon: Play },
  paused: { label: "Pausada", className: "bg-white/5 text-white/50 border-none", icon: Pause },
  completed: { label: "Concluída", className: "bg-[#2637C9]/12 text-[#7B8FFF] border-none", icon: CheckCircle },
};

export function DispatchCampaignList({
  campaigns, isLoading, onSelect, onDelete, onStatusChange, onCreateNew,
}: DispatchCampaignListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-11 w-72 rounded-xl" />
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-11 h-11 rounded-xl border-border/40 bg-background/50 backdrop-blur-sm transition-all focus:bg-background focus:ring-primary/20"
          />
        </div>
        <Button onClick={onCreateNew} className="h-11 px-6 rounded-xl gradient-primary glow-primary font-bold shadow-lg transition-all active:scale-95">
          <Plus className="mr-2 h-4.5 w-4.5" />
          Nova Campanha
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-20 text-center border-dashed border-2 border-border/40 bg-muted/10 rounded-3xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2.5">Nenhuma campanha encontrada</h3>
          <p className="text-sm text-muted-foreground/60 mb-8 max-w-xs mx-auto font-medium">
            Personalize seus envios e comece a escalar sua comunicação agora mesmo.
          </p>
          <Button onClick={onCreateNew} className="h-11 rounded-xl gradient-primary glow-primary font-bold px-8">
            <Plus className="mr-2 h-4.5 w-4.5" />
            Criar Minha Primeira Campanha
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {filtered.map((campaign, idx) => {
            const status = statusConfig[campaign.status] || statusConfig.draft;
            const StatusIcon = status.icon;
            return (
              <Card
                key={campaign.id}
                className={cn(
                  "border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-elevation-md hover:-translate-y-1 group cursor-pointer animate-fade-in",
                  `stagger-${(idx % 4) + 1}`
                )}
                onClick={() => onSelect(campaign)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn("text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5", status.className)}>
                          {status.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold tracking-tight leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {campaign.name}
                      </CardTitle>
                      {campaign.description && (
                        <p className="text-xs font-medium text-muted-foreground/60 line-clamp-2 leading-relaxed">{campaign.description}</p>
                      )}
                      
                      {/* Barra de Progresso */}
                      {campaign.status !== "draft" && (
                        <div className="mt-4 space-y-1.5 pr-2">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                            <span>Progresso</span>
                            <span>{campaign.status === "completed" ? "100" : "45"}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                campaign.status === "completed" ? "bg-[#22DD4F] w-full" : "bg-gradient-to-r from-[#8A3CFF] to-[#2E39D9] w-[45%]"
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 transition-all">
                          <MoreVertical className="h-4.5 w-4.5 text-muted-foreground/60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/40 bg-background/95 backdrop-blur-xl">
                        <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium cursor-pointer" onClick={e => { e.stopPropagation(); onSelect(campaign); }}>
                          <Settings className="h-4 w-4" /> Configurar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium cursor-pointer" onClick={e => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(campaign.id);
                          toast.success("ID copiado");
                        }}>
                          <Copy className="h-4 w-4" /> Copiar ID
                        </DropdownMenuItem>
                        <div className="h-px bg-border/40 my-1" />
                        {campaign.status !== "active" && (
                          <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium text-success cursor-pointer focus:text-success focus:bg-success/5" onClick={e => { e.stopPropagation(); onStatusChange(campaign.id, "active"); }}>
                            <Play className="h-4 w-4" /> Ativar
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "active" && (
                          <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium text-warning cursor-pointer focus:text-warning focus:bg-warning/5" onClick={e => { e.stopPropagation(); onStatusChange(campaign.id, "paused"); }}>
                            <Pause className="h-4 w-4" /> Pausar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/5" onClick={e => { e.stopPropagation(); setDeleteId(campaign.id); }}>
                          <Trash2 className="h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between border-t border-border/30 pt-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground/40">
                      <StatusIcon className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {format(new Date(campaign.createdAt), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex -space-x-1.5 overflow-hidden">
                       <div className="h-6 w-6 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="h-2.5 w-2.5 text-primary" />
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/70">
              Esta ação é irreversível. Todos os dados associados a esta campanha de disparos serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold border-border/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
