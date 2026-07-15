import { useEffect, useState } from "react";
import { LocalNode, LocalConnection, NodeCategory } from "../shared-types";
import { useWorkflowExecutions, useWorkflowExecutionDetail } from "@/hooks/useWorkflowExecutions";
import { ExecutionsList } from "./ExecutionsList";
import { ExecutionHeader } from "./ExecutionHeader";
import { ExecutionCanvas } from "./ExecutionCanvas";
import { NodeInspector } from "./NodeInspector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { toCanonicalPayload } from "@/lib/workflows/canonicalPayload";

interface ExecutionsPanelProps {
  sequenceId: string;
  nodes: LocalNode[];
  connections: LocalConnection[];
  nodeCategories: NodeCategory[];
  onUpdateNodeConfig?: (nodeId: string, config: Record<string, unknown>) => void;
  onSwitchToEditor?: () => void;
}

export function ExecutionsPanel({ sequenceId, nodes, connections, nodeCategories, onUpdateNodeConfig, onSwitchToEditor }: ExecutionsPanelProps) {
  const { toast } = useToast();
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);

  const { executions, isLoading, error, refetch } = useWorkflowExecutions(sequenceId);
  const { execution, nodeExecutions, isLoading: isDetailLoading } = useWorkflowExecutionDetail(selectedExecutionId);

  // Default to the most recent run once the list loads
  useEffect(() => {
    if (!selectedExecutionId && executions.length > 0) {
      setSelectedExecutionId(executions[0].id);
    }
  }, [executions, selectedExecutionId]);

  useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedExecutionId]);

  const selectedNodeExecution = nodeExecutions.find(n => n.nodeId === selectedNodeId) || null;

  const handleRerun = async () => {
    if (!execution) return;
    setIsRerunning(true);
    try {
      if (execution.sequenceType === "dispatch") {
        const payload = (execution.triggerPayload || {}) as Record<string, unknown>;
        const { error } = await supabase.functions.invoke("execute-dispatch-sequence", {
          body: {
            campaignId: execution.campaignId,
            sequenceId: execution.sequenceId,
            contactPhone: payload.contactPhone,
            contactName: payload.contactName,
            contactId: payload.contactId,
            customFields: payload.customFields,
          },
        });
        if (error) throw error;
      } else {
        const payload = (execution.triggerPayload || {}) as Record<string, unknown>;
        const hasTriggerContext = Object.keys(payload).length > 0;
        const { error } = await supabase.functions.invoke("execute-message", {
          body: {
            campaignId: execution.campaignId,
            sequenceId: execution.sequenceId,
            ...(hasTriggerContext ? { triggerContext: payload } : {}),
          },
        });
        if (error) throw error;
      }
      toast({ title: "Execução reenviada" });
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      toast({ title: "Erro ao reexecutar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setIsRerunning(false);
    }
  };

  const handleUseAsReference = async () => {
    if (!execution) return;
    const triggerNode = nodes.find(n => n.nodeType === "trigger");
    if (!triggerNode) {
      toast({ title: "Gatilho não encontrado", variant: "destructive" });
      return;
    }
    const currentConfig = triggerNode.config || {};
    const currentTriggerConfig = (currentConfig.triggerConfig as Record<string, any>) || {};
    
    // Save normalized canonical payload
    const referencePayload = toCanonicalPayload(execution.triggerPayload);

    const newTriggerConfig = {
      ...currentTriggerConfig,
      referencePayload
    };
    
    const newConfig = {
      ...currentConfig,
      triggerConfig: newTriggerConfig
    };

    if (onUpdateNodeConfig) {
      onUpdateNodeConfig(triggerNode.id, newConfig);
    }

    try {
      const { error } = await supabase
        .from("sequence_nodes")
        .update({ config: newConfig })
        .eq("id", triggerNode.id);
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save reference payload:", err);
      toast({ title: "Erro ao salvar referência", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      toast({ title: "Referência atualizada", description: "O payload desta execução foi carregado no gatilho." });
    }
  };

  const handleEdit = async () => {
    await handleUseAsReference();
    if (onSwitchToEditor) {
      onSwitchToEditor();
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
      {execution && (
        <ExecutionHeader 
          execution={execution} 
          onRerun={handleRerun} 
          isRerunning={isRerunning} 
          onUseAsReference={handleUseAsReference}
          onEdit={handleEdit}
        />
      )}

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        <ExecutionsList
          executions={executions}
          isLoading={isLoading}
          error={error}
          selectedExecutionId={selectedExecutionId}
          onSelect={setSelectedExecutionId}
          onRefresh={refetch}
        />

        {selectedExecutionId && isDetailLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : execution ? (
          <ExecutionCanvas
            nodes={nodes}
            connections={connections}
            nodeCategories={nodeCategories}
            execution={execution}
            nodeExecutions={nodeExecutions}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Selecione uma execução para ver os detalhes.
          </div>
        )}

        {selectedNodeExecution && (
          <NodeInspector
            node={nodes.find(n => n.id === selectedNodeId)!}
            nodeExecution={selectedNodeExecution}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
