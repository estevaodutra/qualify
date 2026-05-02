import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSequence, useSequenceNodes } from "@/hooks/useSequences";
import { useSequenceLogs } from "@/hooks/useSequenceLogs";
import { LocalNode } from "@/components/sequences/shared-types";
import { MessageTimeline } from "./MessageTimeline";
import { NewMessageDialog } from "./NewMessageDialog";
import { NodeLogsDialog } from "./NodeLogsDialog";
import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { TriggerType, TriggerConfig, TriggerConfigCard } from "./TriggerConfigCard";
import { MediaUploader } from "./MediaUploader";
import { PollActionDialog, PollActionConfig, getActionIconColor, getActionLabel } from "./PollActionDialog";
import { MessageStatus } from "./MessageCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isToday, parseISO } from "date-fns";

interface TimelineSequenceBuilderProps {
  sequence: MessageSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<MessageSequence> }) => Promise<void>;
}

const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
  switch (nodeType) {
    case "message": return { content: "", sendPrivate: false, mentionMember: false, viewOnce: false };
    case "image": return { url: "", caption: "", sendPrivate: false, viewOnce: false };
    case "video": return { url: "", caption: "", sendPrivate: false, isVideoNote: false, viewOnce: false };
    case "audio": return { url: "", isVoiceMessage: true, sendPrivate: false, viewOnce: false };
    case "document": return { url: "", filename: "", caption: "", sendPrivate: false, viewOnce: false };
    case "sticker": return { url: "", sendPrivate: false, viewOnce: false };
    case "poll": return { question: "", options: ["", "", ""], multiSelect: false };
    case "buttons": return { text: "", buttons: [{ id: "1", label: "", type: "REPLY" }] };
    case "list": return { title: "", buttonText: "Selecionar", sections: [{ title: "Opções", rows: [{ id: "1", title: "", description: "" }] }] };
    case "location": return { latitude: "", longitude: "", name: "", address: "" };
    case "contact": return { fullName: "", phone: "", email: "", organization: "" };
    case "event": return { name: "", description: "", startDate: "", endDate: "", location: "" };
    case "group_create": return { groupName: "", phones: [""] };
    case "group_rename": return { newName: "" };
    case "group_photo": return { url: "" };
    case "group_description": return { description: "" };
    case "group_add_participant": return { phones: [""] };
    case "group_remove_participant": return { phone: "" };
    case "group_promote_admin": return { phone: "" };
    case "group_remove_admin": return { phone: "" };
    case "group_settings": return { adminOnlyMessage: false, adminOnlyEditInfo: false, approvalMode: false, locked: false };
    case "status_image": return { url: "", caption: "" };
    case "status_video": return { url: "", caption: "" };
    default: return {};
  }
};

export function TimelineSequenceBuilder({ sequence, onBack, onUpdate }: TimelineSequenceBuilderProps) {
  const { nodes: dbNodes, isLoading: nodesLoading, saveNodes, saveConnections, isSaving } = useSequenceNodes(sequence.id);
  const { logs } = useSequenceLogs(sequence.groupCampaignId);
  const [localNodes, setLocalNodes] = useState<LocalNode[]>([]);
  const [editingNode, setEditingNode] = useState<LocalNode | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [viewingLogsNode, setViewingLogsNode] = useState<LocalNode | null>(null);
  const [name, setName] = useState(sequence.name);
  const [triggerType, setTriggerType] = useState<TriggerType>(sequence.triggerType as TriggerType || "manual");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>((sequence.triggerConfig as TriggerConfig) || {});
  const hasLoadedRef = useRef(false);
  const [isSendingManual, setIsSendingManual] = useState(false);

  // One-time sync from DB
  useEffect(() => {
    if (nodesLoading) return;
    if (!hasLoadedRef.current) {
      if (dbNodes.length > 0) {
        setLocalNodes(dbNodes.map(n => ({ id: n.id, nodeType: n.nodeType, nodeOrder: n.nodeOrder, config: n.config })));
      }
      hasLoadedRef.current = true;
    }
  }, [dbNodes, nodesLoading]);

  useEffect(() => {
    setName(sequence.name);
    setTriggerType(sequence.triggerType as TriggerType || "manual");
    setTriggerConfig((sequence.triggerConfig as TriggerConfig) || {});
    hasLoadedRef.current = false;
  }, [sequence.id]);

  // Compute node statuses from logs
  const nodeStatuses = useCallback((): Record<string, { status: MessageStatus; errorMessage?: string | null }> => {
    const result: Record<string, { status: MessageStatus; errorMessage?: string | null }> = {};
    const seqLogs = logs.filter(l => l.sequenceId === sequence.id);

    localNodes.forEach(node => {
      const isPaused = (node.config.paused as boolean) || false;
      if (isPaused) {
        result[node.id] = { status: "paused" };
        return;
      }

      // Check logs for this node_order
      const nodeLogs = seqLogs.filter(l => l.nodeOrder === node.nodeOrder && isToday(parseISO(l.sentAt)));
      const latestLog = nodeLogs[0]; // already sorted desc by sentAt

      if (latestLog) {
        if (latestLog.status === "error" || latestLog.status === "failed") {
          result[node.id] = { status: "error", errorMessage: latestLog.errorMessage };
          return;
        }
        if (latestLog.status === "sent" || latestLog.status === "delivered") {
          result[node.id] = { status: "sent" };
          return;
        }
      }

      // Check if scheduled for today
      const schedule = node.config.schedule as Record<string, unknown> | undefined;
      if (schedule?.enabled && schedule.scheduleType === "fixed" && schedule.fixedDate) {
        try {
          const d = parseISO(schedule.fixedDate as string);
          if (isToday(d)) {
            result[node.id] = { status: "today" };
            return;
          }
        } catch {}
      }

      result[node.id] = { status: "scheduled" };
    });

    return result;
  }, [localNodes, logs, sequence.id])();

  const handleSave = async () => {
    await onUpdate({ id: sequence.id, updates: { name, triggerType, triggerConfig: triggerConfig as Record<string, unknown> } });
    const idMapping = await saveNodes(localNodes.map(node => ({
      localId: node.id, nodeType: node.nodeType, positionX: 0, positionY: node.nodeOrder * 100, nodeOrder: node.nodeOrder, config: node.config,
    })));
    await saveConnections({ connectionsToSave: [], idMapping });
    toast.success("Sequência salva!");
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { active: !sequence.active } });
  };

  const handleNewMessage = (nodeType: string, schedule: Record<string, unknown>) => {
    const newNode: LocalNode = {
      id: `new_${Date.now()}`,
      nodeType,
      nodeOrder: localNodes.length,
      config: { ...getDefaultConfig(nodeType), schedule },
    };
    setLocalNodes(prev => [...prev, newNode]);
    setEditingNode(newNode);
  };

  const handleEditNode = (node: LocalNode) => setEditingNode(node);

  const handleUpdateNodeConfig = (config: Record<string, unknown>) => {
    if (!editingNode) return;
    const updated = { ...editingNode, config };
    setEditingNode(updated);
    setLocalNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleDuplicateNode = (node: LocalNode) => {
    const dup: LocalNode = {
      id: `dup_${Date.now()}`,
      nodeType: node.nodeType,
      nodeOrder: localNodes.length,
      config: { ...node.config, label: `Cópia de ${(node.config.label as string) || ""}`.trim() },
    };
    setLocalNodes(prev => [...prev, dup]);
  };

  const handleTogglePauseNode = (node: LocalNode) => {
    setLocalNodes(prev => prev.map(n =>
      n.id === node.id ? { ...n, config: { ...n.config, paused: !(n.config.paused as boolean) } } : n
    ));
  };

  const handleMoveNode = (node: LocalNode, direction: "up" | "down") => {
    setLocalNodes(prev => {
      const idx = prev.findIndex(n => n.id === node.id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
      return copy.map((n, i) => ({ ...n, nodeOrder: i }));
    });
  };

  const handleDeleteNode = (node: LocalNode) => {
    setLocalNodes(prev => prev.filter(n => n.id !== node.id).map((n, i) => ({ ...n, nodeOrder: i })));
    if (editingNode?.id === node.id) setEditingNode(null);
  };

  const handleManualSendNode = async () => {
    if (!editingNode) return;
    setIsSendingManual(true);
    try {
      const { error } = await supabase.functions.invoke("execute-message", {
        body: { campaignId: sequence.groupCampaignId, sequenceId: sequence.id, manualNodeIndex: editingNode.nodeOrder },
      });
      if (error) throw error;
      toast.success("Mensagem disparada!");
    } catch {
      toast.error("Erro ao disparar mensagem");
    } finally {
      setIsSendingManual(false);
    }
  };

  const handleExecuteNode = async (node: LocalNode) => {
    try {
      toast.info("Executando...");
      const { data, error } = await supabase.functions.invoke("execute-message", {
        body: { campaignId: sequence.groupCampaignId, sequenceId: sequence.id, manualNodeIndex: node.nodeOrder },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success === false) throw new Error("Webhook retornou erro");

      const failedCount = data?.nodesFailed || 0;
      if (failedCount > 0) {
        toast.warning(`Executado com ${failedCount} falha(s)`);
      } else {
        toast.success("Mensagem executada com sucesso!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao executar mensagem";
      toast.error(msg);
    }
  };

  const getOptionAction = (node: LocalNode, index: number): PollActionConfig | null => {
    const optionActions = (node.config.optionActions as Record<string, PollActionConfig>) || {};
    return optionActions[String(index)] || null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 text-sm font-semibold w-64 border-transparent hover:border-border focus:border-primary"
          />
          <Badge variant={sequence.active ? "default" : "secondary"} className="text-xs">
            {sequence.active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleActive}>
            <Power className={cn("h-3.5 w-3.5 mr-1", sequence.active ? "text-success" : "text-muted-foreground")} />
            {sequence.active ? "Desativar" : "Ativar"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {triggerType === "webhook" && (
        <TriggerConfigCard
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onTriggerTypeChange={() => {}}
          onTriggerConfigChange={(config) => setTriggerConfig(config)}
          sequenceId={sequence.id}
        />
      )}

      {/* Timeline */}
      <MessageTimeline
        nodes={localNodes}
        nodeStatuses={nodeStatuses}
        onEditNode={handleEditNode}
        onDuplicateNode={handleDuplicateNode}
        onTogglePauseNode={handleTogglePauseNode}
        onMoveNode={handleMoveNode}
        onDeleteNode={handleDeleteNode}
        onExecuteNode={handleExecuteNode}
        onViewLogsNode={(node) => setViewingLogsNode(node)}
        onNewMessage={() => setNewMessageOpen(true)}
      />

      {/* New message dialog */}
      <NewMessageDialog
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onSave={handleNewMessage}
        triggerType={triggerType}
      />

      {/* Node logs dialog */}
      <NodeLogsDialog
        open={!!viewingLogsNode}
        onClose={() => setViewingLogsNode(null)}
        node={viewingLogsNode}
        sequenceId={sequence.id}
        campaignId={sequence.groupCampaignId}
        onExecuteEntireNode={
          viewingLogsNode
            ? () => {
                handleExecuteNode(viewingLogsNode);
              }
            : undefined
        }
      />

      {/* Edit node panel */}
      {editingNode && (
        <UnifiedNodeConfigPanel
          node={editingNode}
          onUpdate={handleUpdateNodeConfig}
          onClose={() => setEditingNode(null)}
          open={true}
          mode="group"
          onManualSend={handleManualSendNode}
          isSendingManual={isSendingManual}
          renderMediaUploader={(props) => (
            <MediaUploader
              mediaType={props.mediaType as "image" | "video" | "audio" | "document" | "sticker"}
              currentUrl={props.currentUrl}
              onUpload={props.onUpload}
              onUrlChange={props.onUrlChange}
              placeholder={props.placeholder}
            />
          )}
          renderPollActionDialog={(props) => (
            <PollActionDialog
              open={props.open}
              onClose={props.onClose}
              optionIndex={props.optionIndex}
              optionText={props.optionText}
              currentAction={props.currentAction as PollActionConfig | null}
              onSave={props.onSave as (action: PollActionConfig) => void}
            />
          )}
          getOptionAction={getOptionAction}
          getActionIconColor={getActionIconColor}
          getActionLabel={getActionLabel}
        />
      )}
    </div>
  );
}
