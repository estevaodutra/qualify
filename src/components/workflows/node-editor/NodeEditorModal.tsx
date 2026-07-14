import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LocalNode } from "@/components/sequences/shared-types";
import { NodeEditorHeader } from "./NodeEditorHeader";
import { NodeInputPanel } from "./NodeInputPanel";
import { NodeParametersPanel } from "./NodeParametersPanel";
import { NodeOutputPanel } from "./NodeOutputPanel";
import { toast } from "sonner";
import { toCanonicalPayload } from "@/lib/workflows/canonicalPayload";

interface NodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodes: LocalNode[];
  connections: any[];
  onUpdateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onSaveWorkflow: () => void;
  isSavingWorkflow: boolean;
  isUnsavedWorkflow: boolean;
  mode: "group" | "dispatch";
  isGroup?: boolean;
}

export function NodeEditorModal({
  isOpen,
  onClose,
  nodeId,
  nodes,
  connections,
  onUpdateNodeConfig,
  onSaveWorkflow,
  isSavingWorkflow,
  isUnsavedWorkflow,
  mode,
  isGroup,
}: NodeEditorModalProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(nodeId);
  const [simulatedData, setSimulatedData] = useState<Record<string, { input: any; output: any; status: "success" | "error" | "not_run"; error?: string }>>({});
  const [mockData, setMockData] = useState<any>({
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    query_params: {
      source: "facebook_ads",
    },
    body: {
      nome: "Estevão Dutra",
      phone: "5512983195531",
      email: "contato@estevao.com",
      valor: "150.00",
      produto: "Curso N8N Avançado",
    },
    received_at: new Date().toISOString(),
    raw: {}
  });
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (nodeId) setCurrentNodeId(nodeId);
  }, [nodeId]);

  if (!isOpen || !currentNodeId) return null;

  const node = nodes.find((n) => n.id === currentNodeId);
  if (!node) return null;

  const prevConnections = connections.filter((c) => c.to === currentNodeId);
  const prevNodes = nodes.filter((n) => prevConnections.some((c) => c.from === n.id));

  const nextConnections = connections.filter((c) => c.from === currentNodeId);
  const nextNodes = nodes.filter((n) => nextConnections.some((c) => c.to === n.id));

  const getPrecedingPath = (targetId: string): LocalNode[] => {
    const path: LocalNode[] = [];
    let currentId = targetId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      
      const n = nodes.find((x) => x.id === currentId);
      if (n) {
        path.unshift(n);
      }

      const conn = connections.find((c) => c.to === currentId);
      currentId = conn ? conn.from : "";
    }
    return path;
  };

  const getValueFromPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  };

  const runNodeSimulation = (targetNode: LocalNode, inputContext: any): any => {
    const type = targetNode.nodeType;
    const config = targetNode.config || {};

    if (type === "trigger" || type === "webhook") {
      const triggerNode = nodes.find(n => n.nodeType === "trigger");
      const triggerConfig = triggerNode?.config?.triggerConfig as Record<string, any> || {};
      const activeRef = triggerConfig?.referencePayload;
      const basePayload = toCanonicalPayload(activeRef || mockData);
      
      return {
        webhook: basePayload,
        lead: {
          name: basePayload.body?.nome || basePayload.body?.name || "",
          phone: basePayload.body?.phone || "",
          email: basePayload.body?.email || "",
          custom_fields: {},
        },
        deal: {},
        variables: {},
      };
    }
    if (type === "status") {
      const statusType = (config.statusType as string) || "text";
      return {
        status: "queued",
        type: statusType,
        instance_id: config.instanceId || "fallback-instance",
        media_url: config.url || null,
        caption: config.caption || null,
      };
    }

    const outputContext = JSON.parse(JSON.stringify(inputContext || {
      webhook: {},
      lead: { name: "", phone: "", email: "", custom_fields: {} },
      deal: {},
      variables: {},
    }));

    if (type === "field_op" || type === "mapping") {
      const mappings = (config.mappings as any[]) || [];
      const payload = outputContext.webhook?.body || {};

      for (const map of mappings) {
        const val = getValueFromPath(payload, map.sourceField);
        if (val !== undefined && val !== null) {
          const targetType = map.targetType || "lead";
          const targetField = map.targetField || "";
          
          let transformedVal = String(val);
          if (map.transform === "uppercase") transformedVal = transformedVal.toUpperCase();
          if (map.transform === "lowercase") transformedVal = transformedVal.toLowerCase();
          if (map.transform === "trim") transformedVal = transformedVal.trim();
          if (map.transform === "capitalize") {
            transformedVal = transformedVal.charAt(0).toUpperCase() + transformedVal.slice(1);
          }

          if (targetType === "lead") {
            if (["name", "phone", "email", "company_name", "document", "source"].includes(targetField)) {
              outputContext.lead[targetField] = transformedVal;
            } else {
              if (!outputContext.lead.custom_fields) outputContext.lead.custom_fields = {};
              outputContext.lead.custom_fields[targetField] = transformedVal;
            }
          } else if (targetType === "deal") {
            outputContext.deal[targetField] = transformedVal;
          } else if (targetType === "variable") {
            if (!outputContext.variables) outputContext.variables = {};
            outputContext.variables[targetField] = transformedVal;
          }
        }
      }
      return outputContext;
    }

    if (type === "message" || type === "whatsapp" || type === "content") {
      let content = (config.content as string) || "";
      const lead = outputContext.lead || {};
      const variables = outputContext.variables || {};

      content = content.replace(/\{\{lead\.name\}\}/gi, lead.name || "");
      content = content.replace(/\{\{lead\.phone\}\}/gi, lead.phone || "");
      content = content.replace(/\{\{lead\.email\}\}/gi, lead.email || "");
      content = content.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
        if (p1.startsWith("lead.")) {
          const field = p1.substring(5);
          return lead[field] || lead.custom_fields?.[field] || match;
        }
        return variables[p1] || match;
      });

      return {
        ...outputContext,
        sent_message: {
          recipient: lead.phone || "group",
          text: content,
          status: "simulated_sent",
          timestamp: new Date().toISOString(),
        }
      };
    }

    if (type === "condition") {
      const field = (config.field as string) || "";
      const operator = (config.operator as string) || "equals";
      const value = (config.value as string) || "";

      let actualVal = "";
      if (field.startsWith("lead.")) {
        const sub = field.substring(5);
        actualVal = outputContext.lead?.[sub] || outputContext.lead?.custom_fields?.[sub] || "";
      } else if (field.startsWith("variable.")) {
        const sub = field.substring(9);
        actualVal = outputContext.variables?.[sub] || "";
      } else {
        actualVal = getValueFromPath(outputContext.webhook?.body, field) || "";
      }

      let match = false;
      if (operator === "equals") match = String(actualVal) === String(value);
      if (operator === "not_equals") match = String(actualVal) !== String(value);
      if (operator === "contains") match = String(actualVal).includes(value);

      return {
        ...outputContext,
        condition_evaluated: {
          field,
          operator,
          expected: value,
          actual: actualVal,
          branch_taken: match ? "True" : "False",
        }
      };
    }

    return outputContext;
  };

  const handleRunPrevious = () => {
    setIsSimulating(true);
    const precedingPath = getPrecedingPath(currentNodeId);
    let currentContext = null;

    try {
      const nextSimulated = { ...simulatedData };
      for (let i = 0; i < precedingPath.length - 1; i++) {
        const stepNode = precedingPath[i];
        const stepInput = currentContext;
        const stepOutput = runNodeSimulation(stepNode, stepInput);
        
        nextSimulated[stepNode.id] = {
          input: stepInput,
          output: stepOutput,
          status: "success",
        };
        currentContext = stepOutput;
      }

      setSimulatedData(nextSimulated);
      toast.success("Nodes anteriores executados com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha ao simular nós anteriores: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunStep = () => {
    setIsSimulating(true);
    try {
      const precedingPath = getPrecedingPath(currentNodeId);
      let stepInput = null;
      if (precedingPath.length > 1) {
        const prevNodeId = precedingPath[precedingPath.length - 2].id;
        stepInput = simulatedData[prevNodeId]?.output || null;
      }

      const stepOutput = runNodeSimulation(node, stepInput);
      setSimulatedData((prev) => ({
        ...prev,
        [currentNodeId]: {
          input: stepInput,
          output: stepOutput,
          status: "success",
        },
      }));
      toast.success("Esta etapa foi executada com sucesso!");
    } catch (err: any) {
      console.error(err);
      setSimulatedData((prev) => ({
        ...prev,
        [currentNodeId]: {
          input: null,
          output: null,
          status: "error",
          error: err.message,
        },
      }));
      toast.error(`Erro ao executar etapa: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateConfig = (updates: Record<string, unknown>) => {
    onUpdateNodeConfig(currentNodeId, updates);
  };

  const handleNavigate = (targetId: string) => {
    setCurrentNodeId(targetId);
  };

  const currentSimData = simulatedData[currentNodeId] || { input: null, output: null, status: "not_run" };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border bg-slate-50/50 shadow-2xl">
        <NodeEditorHeader
          node={node}
          previousNodes={prevNodes}
          nextNodes={nextNodes}
          onNavigate={handleNavigate}
          onRunStep={handleRunStep}
          onRunPrevious={handleRunPrevious}
          onClose={onClose}
          onSave={onSaveWorkflow}
          isSaving={isSavingWorkflow}
          isUnsaved={isUnsavedWorkflow}
          isSimulating={isSimulating}
        />

        <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
          <NodeInputPanel
            inputData={currentSimData.input ? toCanonicalPayload(currentSimData.input) : null}
            mockData={toCanonicalPayload(mockData)}
            onMockDataChange={(data) => setMockData(toCanonicalPayload(data))}
            onRunPrevious={handleRunPrevious}
          />

          <NodeParametersPanel
            node={node}
            onUpdate={handleUpdateConfig}
            mode={mode}
            isGroup={isGroup}
            nodes={nodes}
          />

          <NodeOutputPanel
            outputData={currentSimData.output}
            status={currentSimData.status}
            errorText={currentSimData.error}
            onRunNode={handleRunStep}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
