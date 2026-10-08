import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Clock, ArrowDownLeft, ArrowUpRight, Copy, Check,
  AlertCircle, FileJson, Info, MessageSquare, Users, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Lead } from "@/hooks/useLeads";

interface LeadLogDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LogEntry {
  id: string;
  sourceType: "webhook" | "dispatch" | "conversation";
  direction: "input" | "output";
  timestamp: string;
  title: string;
  subtitle: string;
  eventType?: string;
  status?: string;
  payload: any;
}

export function LeadLogDialog({ lead, open, onOpenChange }: LeadLogDialogProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const phone = lead?.phone ? lead.phone.replace(/\D/g, "") : "";
  const lid = (lead as any)?.lid ? String((lead as any).lid).replace(/\D/g, "") : "";

  // Query all related logs across webhook_events, group_message_logs, and chat_conversations
  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-lead-origin-logs", lead?.id, phone, lid],
    enabled: !!lead && open,
    staleTime: 10_000,
    queryFn: async () => {
      const logs: LogEntry[] = [];

      // 1. Query webhook_events (inbound WhatsApp webhooks)
      try {
        let whQuery = supabase
          .from("webhook_events")
          .select("id, event_type, event_subtype, received_at, chat_jid, chat_name, sender_phone, sender_name, sender_lid, raw_event")
          .order("received_at", { ascending: false })
          .limit(30);

        if (phone && lid) {
          whQuery = whQuery.or(`sender_phone.eq.${phone},chat_jid.ilike.%${phone}%,sender_lid.eq.${lid}`);
        } else if (phone) {
          whQuery = whQuery.or(`sender_phone.eq.${phone},chat_jid.ilike.%${phone}%`);
        } else if (lid) {
          whQuery = whQuery.or(`sender_lid.eq.${lid},chat_jid.ilike.%${lid}%`);
        }

        const { data: whData } = await whQuery;

        if (whData) {
          for (const item of whData) {
            logs.push({
              id: `wh-${item.id}`,
              sourceType: "webhook",
              direction: "input",
              timestamp: item.received_at,
              title: `Webhook: ${item.event_type || "evento"}`,
              subtitle: item.chat_name ? `Grupo: ${item.chat_name}` : (item.chat_jid || item.sender_phone || "-"),
              eventType: item.event_type,
              payload: item.raw_event,
            });
          }
        }
      } catch (err) {
        console.error("Error querying webhook_events for lead:", err);
      }

      // 2. Query group_message_logs (outbound dispatches and campaign messages)
      try {
        let gmlQuery = supabase
          .from("group_message_logs")
          .select("id, sent_at, campaign_name, group_name, group_jid, recipient_phone, node_type, status, payload, provider_response")
          .order("sent_at", { ascending: false })
          .limit(30);

        if (phone) {
          gmlQuery = gmlQuery.or(`recipient_phone.eq.${phone},group_jid.ilike.%${phone}%`);
        }

        const { data: gmlData } = await gmlQuery;

        if (gmlData) {
          for (const item of gmlData) {
            let cleanPayload = item.payload;
            if (cleanPayload && typeof cleanPayload === "object") {
              const { curl, zapiUrl, zapiBody, ...other } = cleanPayload as any;
              cleanPayload = zapiBody && typeof zapiBody === "object" ? { ...other, ...zapiBody } : (Object.keys(other).length > 0 ? other : cleanPayload);
            }

            logs.push({
              id: `gml-${item.id}`,
              sourceType: "dispatch",
              direction: "output",
              timestamp: item.sent_at,
              title: `Disparo: ${item.campaign_name || "Campanha"}`,
              subtitle: `Tipo: ${item.node_type || "Mensagem"} | Destino: ${item.group_name || item.recipient_phone || "-"}`,
              eventType: item.node_type || "dispatch",
              status: item.status || "sent",
              payload: {
                payload: cleanPayload,
                resposta: item.provider_response || null,
              },
            });
          }
        }
      } catch (err) {
        console.error("Error querying group_message_logs for lead:", err);
      }

      // 3. Query chat_conversations
      try {
        if (lead?.id || phone) {
          let convQuery = supabase
            .from("chat_conversations")
            .select("id, created_at, contact_phone, contact_name, status, last_message_at")
            .order("created_at", { ascending: false })
            .limit(5);

          if (lead?.id && phone) {
            convQuery = convQuery.or(`lead_id.eq.${lead.id},contact_phone.eq.${phone}`);
          } else if (lead?.id) {
            convQuery = convQuery.eq("lead_id", lead.id);
          } else if (phone) {
            convQuery = convQuery.eq("contact_phone", phone);
          }

          const { data: convData } = await convQuery;
          if (convData) {
            for (const c of convData) {
              logs.push({
                id: `conv-${c.id}`,
                sourceType: "conversation",
                direction: "input",
                timestamp: c.created_at,
                title: "Conversa no Chat CRM Criada",
                subtitle: `Contato: ${c.contact_name || c.contact_phone || "-"}`,
                status: c.status,
                payload: c,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error querying conversations for lead:", err);
      }

      // Sort chronological descending (most recent first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return logs;
    },
  });

  const logsList = data || [];

  // Determine earliest event (probable creation trigger)
  const earliestEvent = useMemo(() => {
    if (logsList.length === 0) return null;
    return [...logsList].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
  }, [logsList]);

  // Current selected log
  const activeLog = useMemo(() => {
    if (selectedLogId) {
      return logsList.find((l) => l.id === selectedLogId) || logsList[0] || null;
    }
    return earliestEvent || logsList[0] || null;
  }, [selectedLogId, logsList, earliestEvent]);

  const copyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("JSON copiado para a área de transferência!");
  };

  const leadCreatedAtFormatted = lead?.created_at
    ? format(new Date(lead.created_at), "dd/MM/yyyy HH:mm:ss")
    : "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-600" />
              <DialogTitle className="text-lg">Log de Origem do Lead</DialogTitle>
              <Badge variant="outline" className="text-violet-600 border-violet-300 bg-violet-500/10 text-xs">
                Superadmin
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <span>Lead: <strong className="text-foreground">{lead?.name || "Sem nome"}</strong></span>
            <span>Telefone: <strong className="text-foreground font-mono">{lead?.phone || "-"}</strong></span>
            {lid && <span>LID: <strong className="text-foreground font-mono">{lid}</strong></span>}
            <span>Criado em: <strong className="text-foreground font-mono">{leadCreatedAtFormatted}</strong></span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4 pt-3">
            {/* Probable Origin Banner */}
            <div className="p-3.5 rounded-lg border border-violet-500/30 bg-violet-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-violet-500/10 text-violet-600 mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
                    Origem Identificada da Criação
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {earliestEvent ? (
                      earliestEvent.title
                    ) : (
                      "Nenhum evento de criação encontrado no histórico recente (72h)."
                    )}
                  </p>
                  {earliestEvent && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {earliestEvent.subtitle} • {format(new Date(earliestEvent.timestamp), "dd/MM/yyyy HH:mm:ss")}
                    </p>
                  )}
                </div>
              </div>

              {lead?.created_at && (
                <div className="text-right sm:border-l sm:pl-4 border-violet-200">
                  <p className="text-[11px] text-muted-foreground">Data no Banco</p>
                  <p className="text-xs font-mono font-medium">{leadCreatedAtFormatted}</p>
                </div>
              )}
            </div>

            {/* Split view: Events list on left, JSON payload on right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-[360px] overflow-hidden">
              {/* Event list */}
              <div className="md:col-span-5 border rounded-lg p-2 flex flex-col overflow-hidden bg-muted/20">
                <div className="p-2 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Eventos Encontrados ({logsList.length})
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    72h
                  </Badge>
                </div>

                {logsList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center flex-1 gap-2">
                    <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
                    <span>Nenhum log ou webhook registrado para este número nas últimas 72 horas.</span>
                    <span className="text-[11px] text-muted-foreground/70">
                      O lead pode ter sido importado manualmente, via CSV, ou criado há mais de 72h.
                    </span>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 pr-2 mt-1">
                    <div className="space-y-1.5 p-1">
                      {logsList.map((log) => {
                        const isSelected = activeLog?.id === log.id;
                        return (
                          <button
                            key={log.id}
                            type="button"
                            onClick={() => setSelectedLogId(log.id)}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                              isSelected
                                ? "bg-violet-500/10 border-violet-500/40 shadow-sm"
                                : "bg-card hover:bg-muted/50 border-border/60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-foreground truncate max-w-[170px]">
                                {log.title}
                              </span>
                              {log.direction === "input" ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                                  <ArrowDownLeft className="h-2.5 w-2.5" />
                                  Input
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                                  <ArrowUpRight className="h-2.5 w-2.5" />
                                  Output
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mb-1">
                              {log.subtitle}
                            </p>
                            <span className="font-mono text-[10px] text-muted-foreground/80 block">
                              {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* JSON Payload viewer */}
              <div className="md:col-span-7 border rounded-lg p-3 flex flex-col overflow-hidden bg-muted/10">
                <div className="flex items-center justify-between pb-2 border-b mb-2">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-semibold text-foreground">
                      {activeLog ? activeLog.title : "Payload JSON"}
                    </span>
                  </div>
                  {activeLog?.payload && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => copyJson(activeLog.payload)}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar JSON
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {activeLog?.payload ? (
                  <pre className="flex-1 p-3.5 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto border border-slate-800 leading-relaxed shadow-inner">
                    {JSON.stringify(activeLog.payload, null, 2)}
                  </pre>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <Info className="h-6 w-6 text-muted-foreground/40 mb-2" />
                    <span>Selecione um evento à esquerda para inspecionar o payload completo.</span>
                    {lead && (
                      <div className="mt-4 text-left max-w-sm w-full p-2.5 bg-card rounded border text-[11px] font-mono space-y-1">
                        <p className="font-semibold text-foreground">Dados cadastrais do Lead:</p>
                        <p>ID: {lead.id}</p>
                        <p>Telefone: {lead.phone}</p>
                        <p>Origem gravada: {lead.source_name || "Não informada"}</p>
                        <p>Status: {lead.status}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
