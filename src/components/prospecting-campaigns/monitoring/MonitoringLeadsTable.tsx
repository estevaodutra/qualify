import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical, Eye, Globe, MapPin, ListPlus, ListX, RefreshCw, Pause, XCircle, MessageSquare, Star, PhoneCall,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { QUALIFICATION_LABELS, QUALIFICATION_COLORS, QUEUE_STATUS_LABELS } from "@/lib/prospecting-status";
import type { ProspectingEnrichmentJob } from "@/hooks/useProspectingEnrichmentJobs";
import type { ProspectingQueueItem } from "@/hooks/useProspectingQueue";
import type { ProspectingEvent } from "@/hooks/useProspectingEvents";

export interface LeadRow {
  id: string;
  name: string | null;
  company_name?: string | null;
  phone: string | null;
  telefone_fixo?: string | null;
  website?: string | null;
  custom_fields: Record<string, any> | null;
  qualification_label: string | null;
}

interface MonitoringLeadsTableProps {
  leads: LeadRow[];
  jobsByLead: Record<string, ProspectingEnrichmentJob[]>;
  queueItems: ProspectingQueueItem[];
  latestEventByLead: (leadId: string) => ProspectingEvent | undefined;
  onAddToQueue: (leadId: string) => void;
  onRemoveFromQueue: (queueItemId: string) => void;
  onReprocess: (queueItemId: string) => void;
  onPause: (queueItemId: string) => void;
  onCancel: (queueItemId: string) => void;
  hasAutomation: boolean;
}

export function MonitoringLeadsTable({
  leads, jobsByLead, queueItems, latestEventByLead,
  onAddToQueue, onRemoveFromQueue, onReprocess, onPause, onCancel, hasAutomation,
}: MonitoringLeadsTableProps) {
  const navigate = useNavigate();
  const [detailLead, setDetailLead] = useState<LeadRow | null>(null);

  const queueByLead = new Map(queueItems.map((q) => [q.leadId, q]));

  const openConversation = (phone: string | null) => {
    if (!phone) return;
    navigate("/chat");
    toast.info(`Procure pela conversa com ${formatPhone(phone)} no Chat CRM.`);
  };

  return (
    <>
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contatos (WhatsApp / Fixo)</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Camadas</TableHead>
              <TableHead>Qualificação</TableHead>
              <TableHead>Status na fila</TableHead>
              <TableHead>Última ação</TableHead>
              <TableHead>Próxima execução</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const custom = lead.custom_fields || {};
              const jobs = jobsByLead[lead.id] || [];
              const completedLayers = jobs.filter((j) => j.status === "completed").length;
              const queueItem = queueByLead.get(lead.id);
              const latestEvent = latestEventByLead(lead.id);
              const qualification = lead.qualification_label || "sem_analise";
              const fixoNumber = lead.telefone_fixo || custom.telefone_fixo || null;

              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground truncate">{lead.name || "Sem nome"}</span>
                      {lead.company_name && lead.company_name !== lead.name && (
                        <span className="text-[11px] text-muted-foreground truncate">{lead.company_name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-0.5">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{formatPhone(lead.phone)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                      {fixoNumber && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <PhoneCall className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{formatPhone(fixoNumber)}</span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0.2 rounded font-medium">
                            Fixo
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                    {custom.categoryName || custom.category || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {custom.address || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {custom.totalScore != null ? (
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <Star className="h-3.5 w-3.5 fill-current" /> {custom.totalScore}
                        {custom.reviewsCount != null && (
                          <span className="text-muted-foreground font-normal">({custom.reviewsCount})</span>
                        )}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{completedLayers}/{jobs.length || 1}</TableCell>
                  <TableCell>
                    <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${QUALIFICATION_COLORS[qualification]}`}>
                      {QUALIFICATION_LABELS[qualification]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {queueItem ? QUEUE_STATUS_LABELS[queueItem.status] : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {latestEvent ? formatDistanceToNow(new Date(latestEvent.createdAt), { addSuffix: true, locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {queueItem?.scheduledAt
                      ? formatDistanceToNow(new Date(queueItem.scheduledAt), { addSuffix: true, locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setDetailLead(lead)}>
                          <Eye className="h-4 w-4 mr-2" /> Visualizar detalhes
                        </DropdownMenuItem>
                        {(lead.website || custom.website) && (
                          <DropdownMenuItem onClick={() => window.open(lead.website || custom.website, "_blank")}>
                            <Globe className="h-4 w-4 mr-2" /> Abrir site
                          </DropdownMenuItem>
                        )}
                        {(custom.url || custom.googleMapsUrl) && (
                          <DropdownMenuItem onClick={() => window.open(custom.url || custom.googleMapsUrl, "_blank")}>
                            <MapPin className="h-4 w-4 mr-2" /> Abrir Google Maps
                          </DropdownMenuItem>
                        )}
                        {hasAutomation && !queueItem && (
                          <DropdownMenuItem onClick={() => onAddToQueue(lead.id)}>
                            <ListPlus className="h-4 w-4 mr-2" /> Adicionar à fila
                          </DropdownMenuItem>
                        )}
                        {queueItem && ["pending", "scheduled"].includes(queueItem.status) && (
                          <>
                            <DropdownMenuItem onClick={() => onRemoveFromQueue(queueItem.id)}>
                              <ListX className="h-4 w-4 mr-2" /> Remover da fila
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onPause(queueItem.id)}>
                              <Pause className="h-4 w-4 mr-2" /> Pausar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCancel(queueItem.id)} className="text-destructive focus:text-destructive">
                              <XCircle className="h-4 w-4 mr-2" /> Cancelar
                            </DropdownMenuItem>
                          </>
                        )}
                        {queueItem?.status === "failed" && (
                          <DropdownMenuItem onClick={() => onReprocess(queueItem.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Reprocessar
                          </DropdownMenuItem>
                        )}
                        {lead.phone && (
                          <DropdownMenuItem onClick={() => openConversation(lead.phone)}>
                            <MessageSquare className="h-4 w-4 mr-2" /> Abrir conversa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
                  Nenhum lead encontrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!detailLead} onOpenChange={(open) => !open && setDetailLead(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{detailLead?.name || "Detalhes do Lead"}</SheetTitle>
          </SheetHeader>
          {detailLead && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="p-3 bg-muted/30 rounded-xl space-y-2 border border-border/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-muted-foreground">WhatsApp / Celular:</span>
                  <span className="font-mono font-medium">{detailLead.phone ? formatPhone(detailLead.phone) : "—"}</span>
                </div>
                {(detailLead.telefone_fixo || detailLead.custom_fields?.telefone_fixo) && (
                  <div className="flex justify-between items-center text-xs border-t border-border/30 pt-1.5">
                    <span className="font-semibold text-muted-foreground">Telefone Fixo:</span>
                    <span className="font-mono font-medium">
                      {formatPhone(detailLead.telefone_fixo || detailLead.custom_fields?.telefone_fixo)}
                    </span>
                  </div>
                )}
                {detailLead.website && (
                  <div className="flex justify-between items-center text-xs border-t border-border/30 pt-1.5">
                    <span className="font-semibold text-muted-foreground">Site:</span>
                    <a href={detailLead.website} target="_blank" rel="noreferrer" className="text-primary truncate max-w-[200px] hover:underline">
                      {detailLead.website}
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campos Captados</h5>
                {Object.entries(detailLead.custom_fields || {}).map(([key, value]) => (
                  <div key={key} className="border-b border-border/20 pb-1.5 text-xs">
                    <span className="font-semibold capitalize text-foreground">{key}:</span>{" "}
                    <span className="text-muted-foreground break-words">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
