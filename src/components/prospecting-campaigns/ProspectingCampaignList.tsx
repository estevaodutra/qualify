import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProspectingCampaign } from "@/hooks/useProspectingCampaigns";
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
  Plus, Search, MoreVertical, Trash2, CheckCircle, MapPin, Loader2, AlertCircle, Eye, Play, Edit, Users, ListFilter, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ProspectingLeadsDialog } from "./ProspectingLeadsDialog";

interface ProspectingCampaignListProps {
  campaigns: ProspectingCampaign[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  onRunAgain?: (campaign: ProspectingCampaign) => void;
  onEdit?: (campaign: ProspectingCampaign) => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  running: { label: "Em Andamento", className: "bg-blue-500/12 text-blue-500 border-none", icon: Loader2 },
  completed: { label: "Concluída", className: "bg-[#22DD4F]/12 text-[#22DD4F] border-none", icon: CheckCircle },
  error: { label: "Erro", className: "bg-red-500/12 text-red-500 border-none", icon: AlertCircle },
};

export function ProspectingCampaignList({
  campaigns, isLoading, onDelete, onCreateNew, onRunAgain, onEdit
}: ProspectingCampaignListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewLeadsCampaign, setViewLeadsCampaign] = useState<{ id: string, name: string } | null>(null);

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
          Nova Prospecção
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-20 text-center border-dashed border-2 border-border/40 bg-muted/10 rounded-3xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2.5">Nenhuma prospecção encontrada</h3>
          <p className="text-sm text-muted-foreground/60 mb-8 max-w-xs mx-auto font-medium">
            Busque por novos leads no Google Maps e expanda sua base de contatos automaticamente.
          </p>
          <Button onClick={onCreateNew} className="h-11 rounded-xl gradient-primary glow-primary font-bold px-8">
            <Plus className="mr-2 h-4.5 w-4.5" />
            Iniciar Nova Busca
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {filtered.map((campaign, idx) => {
            const status = statusConfig[campaign.status] || statusConfig.running;
            const StatusIcon = status.icon;

            return (
              <Card
                key={campaign.id}
                className={cn(
                  "border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-elevation-md animate-fade-in group flex flex-col",
                  `stagger-${(idx % 4) + 1}`
                )}
              >
                <CardHeader className="pb-3 flex-none relative">
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
                      
                      <div className="text-xs font-medium text-muted-foreground/80 mt-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                           <Search className="w-3.5 h-3.5 opacity-70 shrink-0" /> <span className="truncate">{campaign.searchTerms}</span>
                        </div>
                        {campaign.places && (
                          <div className="flex items-center gap-1.5">
                             <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0" /> <span className="truncate">{campaign.places}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="font-semibold text-foreground/80">Quantidade solicitada:</span> {campaign.quantity}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 focus:opacity-100">
                          <MoreVertical className="h-4.5 w-4.5 text-muted-foreground/60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-border/40 bg-background/95 backdrop-blur-xl p-2 space-y-1">
                        {campaign.status === "completed" && (
                          <DropdownMenuItem className="rounded-lg font-medium cursor-pointer" onClick={() => setViewLeadsCampaign({ id: campaign.id, name: campaign.name })}>
                            <Eye className="h-4 w-4 mr-2" /> Ver Leads
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="rounded-lg font-medium cursor-pointer" onClick={() => onRunAgain?.(campaign)}>
                          <Play className="h-4 w-4 mr-2" /> Executar Novamente
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg font-medium cursor-pointer" onClick={() => onEdit?.(campaign)}>
                          <Edit className="h-4 w-4 mr-2" /> Editar / Duplicar
                        </DropdownMenuItem>
                        
                        <div className="h-px bg-border/40 my-1 mx-2" />
                        
                        <DropdownMenuItem className="rounded-lg font-medium text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/5" onClick={() => setDeleteId(campaign.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir Histórico
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-auto flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground/40">
                      <StatusIcon className={cn("h-3 w-3", campaign.status === 'running' && "animate-spin")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {format(new Date(campaign.createdAt), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {campaign.status === "completed" && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2 text-xs font-semibold text-primary/80 hover:text-primary hover:bg-primary/10 rounded-lg"
                          onClick={() => setViewLeadsCampaign({ id: campaign.id, name: campaign.name })}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver Leads
                        </Button>
                      )}
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
              Isso excluirá apenas o histórico desta busca. Os leads importados para a sua base não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold border-border/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProspectingLeadsDialog
        campaignId={viewLeadsCampaign?.id || null}
        campaignName={viewLeadsCampaign?.name || ""}
        open={!!viewLeadsCampaign}
        onOpenChange={(open) => !open && setViewLeadsCampaign(null)}
      />
    </div>
  );
}
