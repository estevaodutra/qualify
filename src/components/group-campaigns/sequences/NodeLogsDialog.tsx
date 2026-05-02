import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LocalNode } from "@/components/sequences/shared-types";
import { useNodeLogs, useReprocessLog, NodeLog } from "@/hooks/useNodeLogs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, AlertCircle, Clock, RefreshCw, Copy, Zap, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NodeLogsDialogProps {
  open: boolean;
  onClose: () => void;
  node: LocalNode | null;
  sequenceId: string;
  campaignId: string;
  onExecuteEntireNode?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent" || status === "delivered") {
    return (
      <Badge variant="default" className="bg-success/15 text-success border-success/30 hover:bg-success/20">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Enviado
      </Badge>
    );
  }
  if (status === "error" || status === "failed") {
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" /> Erro
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" /> Pendente
    </Badge>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
      }}
    >
      <Copy className="h-3 w-3 mr-1" /> {label}
    </Button>
  );
}

function LogRow({
  log,
  sequenceId,
  nodeOrder,
}: {
  log: NodeLog;
  sequenceId: string;
  nodeOrder: number;
}) {
  const reprocess = useReprocessLog();
  const target = log.groupName || log.recipientPhone || log.groupJid || "—";
  const payloadStr = JSON.stringify(log.payload ?? {}, null, 2);
  const responseStr = JSON.stringify(log.providerResponse ?? {}, null, 2);

  const handleReprocess = (e: React.MouseEvent) => {
    e.stopPropagation();
    reprocess.mutate({ log, sequenceId, nodeOrder });
  };

  return (
    <AccordionItem value={log.id} className="border rounded-md px-3 bg-card">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center justify-between w-full gap-3 pr-2">
          <div className="flex items-center gap-3 min-w-0">
            <StatusBadge status={log.status} />
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium truncate">{target}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(log.sentAt), "dd/MM HH:mm:ss", { locale: ptBR })}
                {log.instanceName && ` · ${log.instanceName}`}
                {log.responseTimeMs !== null && ` · ${log.responseTimeMs}ms`}
              </p>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-3 space-y-3">
        {log.errorMessage && (
          <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            ⚠️ {log.errorMessage}
          </div>
        )}

        {(log.externalMessageId || log.zaapId) && (
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {log.externalMessageId && <p>external_id: <span className="font-mono">{log.externalMessageId}</span></p>}
            {log.zaapId && <p>zaap_id: <span className="font-mono">{log.zaapId}</span></p>}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Payload enviado</p>
            <CopyButton text={payloadStr} label="Copiar" />
          </div>
          <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-x-auto max-h-40 font-mono">
            {payloadStr}
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Resposta do provedor</p>
            <CopyButton text={responseStr} label="Copiar" />
          </div>
          <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-x-auto max-h-40 font-mono">
            {responseStr}
          </pre>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={handleReprocess}
          disabled={reprocess.isPending}
        >
          {reprocess.isPending ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Zap className="h-3 w-3 mr-1" />
          )}
          Reprocessar este envio
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}

export function NodeLogsDialog({
  open, onClose, node, sequenceId, campaignId, onExecuteEntireNode,
}: NodeLogsDialogProps) {
  const nodeOrder = node?.nodeOrder;
  const { logs, isLoading, refetch } = useNodeLogs(sequenceId, nodeOrder, open && !!node);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const counts = logs.reduce(
    (acc, l) => {
      if (l.status === "sent" || l.status === "delivered") acc.sent++;
      else if (l.status === "error" || l.status === "failed") acc.error++;
      else acc.pending++;
      return acc;
    },
    { sent: 0, error: 0, pending: 0 },
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const label = (node?.config.label as string) || node?.nodeType || "";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-3 space-y-2">
          <SheetTitle className="flex items-center gap-2">
            Logs do nó
            {node && (
              <Badge variant="outline" className="text-[10px]">
                #{(node.nodeOrder ?? 0) + 1} · {label}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Últimos 50 envios das últimas 72 horas.
          </SheetDescription>
          <div className="flex flex-wrap gap-3 text-xs pt-1">
            <span className={cn("flex items-center gap-1", counts.sent && "text-success")}>
              <CheckCircle2 className="h-3 w-3" /> {counts.sent} enviados
            </span>
            <span className={cn("flex items-center gap-1", counts.error && "text-destructive")}>
              <AlertCircle className="h-3 w-3" /> {counts.error} com erro
            </span>
            <span className={cn("flex items-center gap-1", counts.pending && "text-muted-foreground")}>
              <Clock className="h-3 w-3" /> {counts.pending} pendentes
            </span>
          </div>
          <div className="flex gap-2 pt-2">
            {onExecuteEntireNode && (
              <Button size="sm" variant="default" onClick={onExecuteEntireNode}>
                <Zap className="h-3.5 w-3.5 mr-1" /> Reprocessar nó inteiro
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhum envio registrado para este nó nas últimas 72h.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} sequenceId={sequenceId} nodeOrder={nodeOrder ?? 0} />
              ))}
            </Accordion>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
