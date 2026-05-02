import { useMemo, useState } from "react";
import { LocalNode } from "@/components/sequences/shared-types";
import { MessageCard, MessageStatus, STATUS_STYLES, getScheduleLabel } from "./MessageCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface MessageTimelineProps {
  nodes: LocalNode[];
  nodeStatuses: Record<string, { status: MessageStatus; errorMessage?: string | null }>;
  onEditNode: (node: LocalNode) => void;
  onDuplicateNode: (node: LocalNode) => void;
  onTogglePauseNode: (node: LocalNode) => void;
  onMoveNode: (node: LocalNode, direction: "up" | "down") => void;
  onDeleteNode: (node: LocalNode) => void;
  onExecuteNode?: (node: LocalNode) => void;
  onViewLogsNode?: (node: LocalNode) => void;
  onNewMessage: () => void;
}

export function MessageTimeline({
  nodes, nodeStatuses,
  onEditNode, onDuplicateNode, onTogglePauseNode, onMoveNode, onDeleteNode,
  onExecuteNode, onViewLogsNode, onNewMessage,
}: MessageTimelineProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const getNodeStatus = (node: LocalNode): MessageStatus =>
    nodeStatuses[node.id]?.status || "scheduled";

  const sortedNodes = useMemo(() => {
    let filtered = [...nodes];

    if (statusFilter !== "all") {
      filtered = filtered.filter(n => getNodeStatus(n) === statusFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.nodeType === typeFilter);
    }

    filtered.sort((a, b) => {
      const aDate = getScheduleSortKey(a);
      const bDate = getScheduleSortKey(b);
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return a.nodeOrder - b.nodeOrder;
    });

    return filtered;
  }, [nodes, statusFilter, typeFilter, nodeStatuses]);

  const stats = useMemo(() => {
    const total = nodes.length;
    let sent = 0, today = 0, scheduled = 0, error = 0, paused = 0;
    nodes.forEach(n => {
      const s = getNodeStatus(n);
      if (s === "sent") sent++;
      else if (s === "today") today++;
      else if (s === "error") error++;
      else if (s === "paused") paused++;
      else scheduled++;
    });
    return { total, sent, today, scheduled, error, paused };
  }, [nodes, nodeStatuses]);

  return (
    <div className="space-y-4">
      {/* Filters + New */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="scheduled">⚪ Agendados</SelectItem>
              <SelectItem value="today">🟡 Para hoje</SelectItem>
              <SelectItem value="sent">🟢 Enviados</SelectItem>
              <SelectItem value="error">🔴 Com erro</SelectItem>
              <SelectItem value="paused">⚫ Pausados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="message">📝 Texto</SelectItem>
              <SelectItem value="image">🖼️ Imagem</SelectItem>
              <SelectItem value="video">🎬 Vídeo</SelectItem>
              <SelectItem value="audio">🎵 Áudio</SelectItem>
              <SelectItem value="document">📄 Documento</SelectItem>
              <SelectItem value="buttons">🔘 Botões</SelectItem>
              <SelectItem value="list">📋 Lista</SelectItem>
              <SelectItem value="poll">📊 Enquete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" onClick={onNewMessage}>
          <Plus className="h-4 w-4 mr-1" /> Nova Mensagem
        </Button>
      </div>

      {/* Grid container */}
      {sortedNodes.length === 0 ? (
        <div className="flex items-center justify-center w-full py-12 text-muted-foreground text-sm">
          Nenhuma mensagem na sequência.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedNodes.map((node, idx) => {
            const ns = nodeStatuses[node.id];
            const nodeStatus = ns?.status || "scheduled";

            return (
              <div key={node.id}>
                <MessageCard
                  node={node}
                  status={nodeStatus}
                  errorMessage={ns?.errorMessage}
                  onEdit={() => onEditNode(node)}
                  onDuplicate={() => onDuplicateNode(node)}
                  onTogglePause={() => onTogglePauseNode(node)}
                  onExecute={onExecuteNode ? () => onExecuteNode(node) : undefined}
                  onViewLogs={onViewLogsNode ? () => onViewLogsNode(node) : undefined}
                  onMoveUp={() => onMoveNode(node, "up")}
                  onMoveDown={() => onMoveNode(node, "down")}
                  onDelete={() => onDeleteNode(node)}
                  isFirst={idx === 0}
                  isLast={idx === sortedNodes.length - 1}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
        <span>📊 {stats.total} mensagens</span>
        <span className="text-border">|</span>
        <span>🟢 {stats.sent} enviadas</span>
        <span className="text-border">|</span>
        <span>🟡 {stats.today} para hoje</span>
        <span className="text-border">|</span>
        <span>⚪ {stats.scheduled} agendadas</span>
        {stats.error > 0 && <><span className="text-border">|</span><span>🔴 {stats.error} com erro</span></>}
        {stats.paused > 0 && <><span className="text-border">|</span><span>⚫ {stats.paused} pausadas</span></>}
      </div>
    </div>
  );
}

function getScheduleSortKey(node: LocalNode): string {
  const schedule = node.config.schedule as Record<string, unknown> | undefined;
  if (!schedule?.enabled) return `z_${String(node.nodeOrder).padStart(5, "0")}`;

  const type = (schedule.scheduleType as string) || "recurring";

  if (type === "fixed") {
    const d = (schedule.fixedDate as string) || "9999-99-99";
    const t = (schedule.fixedTime as string) || "99:99";
    return `a_${d}_${t}`;
  }

  if (type === "delay") {
    const v = (schedule.delayValue as number) || 0;
    const u = (schedule.delayUnit as string) || "days";
    const multiplier = u === "minutes" ? 1 : u === "hours" ? 60 : 1440;
    return `b_${String(v * multiplier).padStart(10, "0")}`;
  }

  const days = (schedule.days as number[]) || [9];
  const times = (schedule.times as string[]) || ["99:99"];
  return `c_${days[0]}_${times[0]}`;
}
