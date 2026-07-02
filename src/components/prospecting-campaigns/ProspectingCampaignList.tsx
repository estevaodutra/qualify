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
  Plus, Search, MoreVertical, Trash2, CheckCircle, MapPin, Loader2, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface ProspectingCampaignListProps {
  campaigns: ProspectingCampaign[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  running: { label: "Em Andamento", className: "bg-blue-500/12 text-blue-500 border-none", icon: Loader2 },
  completed: { label: "Concluída", className: "bg-[#22DD4F]/12 text-[#22DD4F] border-none", icon: CheckCircle },
  error: { label: "Erro", className: "bg-red-500/12 text-red-500 border-none", icon: AlertCircle },
};

export function ProspectingCampaignList({
  campaigns, isLoading, onDelete, onCreateNew,
}: ProspectingCampaignListProps) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Prospecção Ativa
        </h2>
        <Button onClick={onCreateNew} className="rounded-xl shadow-lg shadow-primary/20 font-bold px-6">
          <Search className="h-4 w-4 mr-2" />
          Nova Prospecção
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border/50 bg-card/30">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <MapPin className="h-10 w-10 text-primary opacity-80" />
          </div>
          <h3 className="text-xl font-bold mb-2">Nenhuma busca realizada</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Você ainda não prospectou contatos. Inicie uma busca no Google Maps para extrair leads qualificados.</p>
          <Button onClick={onCreateNew} variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary/5">
            Começar Agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const { icon: StatusIcon, color, bg, label } = getStatusConfig(campaign.status);

            return (
              <Card key={campaign.id} className="rounded-2xl border-border/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30 group bg-card/40 backdrop-blur-sm">
                <CardHeader className="pb-3 relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className={cn("px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold tracking-wider", bg, color)}>
                      {label}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold pr-28 line-clamp-1 group-hover:text-primary transition-colors">
                    {campaign.name}
                  </CardTitle>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Search className="h-4 w-4 opacity-70 shrink-0" />
                      <span className="truncate">{campaign.searchTerms}</span>
                    </div>
                    {campaign.places && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <MapPin className="h-4 w-4 opacity-70 shrink-0" />
                        <span className="truncate">{campaign.places}</span>
                      </div>
                    )}
                    {campaign.category && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <ListFilter className="h-4 w-4 opacity-70 shrink-0" />
                        <span className="truncate">{campaign.category}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Users className="h-4 w-4 opacity-70 shrink-0" />
                      <span>Quantidade solicitada: <strong className="text-foreground">{campaign.quantity}</strong></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50">
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
