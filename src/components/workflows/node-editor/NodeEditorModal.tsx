import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LocalNode } from "@/components/sequences/shared-types";
import { NodeEditorHeader } from "./NodeEditorHeader";
import { NodeInputPanel } from "./NodeInputPanel";
import { NodeParametersPanel } from "./NodeParametersPanel";
import { NodeOutputPanel } from "./NodeOutputPanel";
import { toast } from "sonner";
import { toCanonicalPayload } from "@/lib/workflows/canonicalPayload";
import { WebhookFieldMappings } from "@/components/group-campaigns/sequences/WebhookFieldMappings";
import { Sliders, Database, Play, Clock, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { TriggerTypeSelector } from "@/components/sequences/triggers/TriggerTypeSelector";
import { WebhookGroupScopeConfig } from "@/components/sequences/triggers/configs/WebhookGroupScopeConfig";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

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
  sequenceId: string;
  campaignId?: string;
  onManualSendNode?: (node: LocalNode) => Promise<void>;
  activeTriggerId?: string;
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
  isGroup = false,
  sequenceId,
  campaignId,
  onManualSendNode,
  activeTriggerId,
}: NodeEditorModalProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(nodeId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
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
  const [activeMainTab, setActiveMainTab] = useState<"config" | "input" | "output">("config");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const node = nodes.find((n) => n.id === currentNodeId);
  const activeTrigger = node?.nodeType === "trigger" && node.config.triggers 
    ? ((node.config.triggers as any[]).find(t => t.id === activeTriggerId) || (node.config.triggers as any[])[0])
    : null;

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      handleSave();
    } else {
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleRequestClose();
    }
  };

  const handleDiscardAndClose = () => {
    setShowExitConfirm(false);
    onClose();
  };

  const handleSave = () => {
    if (!currentNodeId) return;

    if (node?.nodeType === "trigger" && activeTrigger) {
      const currentTriggers = (node.config.triggers as any[]) || [];
      const updatedTriggers = currentTriggers.map(t => 
        t.id === activeTrigger.id ? { ...t, config: localConfig } : t
      );
      onUpdateNodeConfig(currentNodeId, { ...node.config, triggers: updatedTriggers });
    } else {
      onUpdateNodeConfig(currentNodeId, localConfig);
    }
    
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    await onSaveWorkflow();
    setShowExitConfirm(false);
    onClose();
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  const [isSendingManual, setIsSendingManual] = useState(false);

  const handleManualSend = async () => {
    if (!onManualSendNode || !node) return;
    setIsSendingManual(true);
    try {
      await onManualSendNode(node);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSendingManual(false);
    }
  };

  useEffect(() => {
    setActiveMainTab("config");
  }, [currentNodeId]);

  useEffect(() => {
    if (nodeId) setCurrentNodeId(nodeId);
  }, [nodeId]);

  useEffect(() => {
    if (isOpen && node) {
      if (node.nodeType === "trigger" && activeTrigger) {
        setLocalConfig(activeTrigger.config || {});
      } else {
        setLocalConfig(node.config || {});
      }
      setHasUnsavedChanges(false);
    }
  }, [isOpen, node, activeTrigger]);

  if (!isOpen || !currentNodeId || !node) return null;

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

      if (hasIncomingConnections && !stepInput) {
        toast.warning("Falta de dados de entrada. Selecione 'Input' para verificar.");
        setActiveMainTab("input");
        setIsSimulating(false);
        return;
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
      setActiveMainTab("output");
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
      setActiveMainTab("output");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateConfig = (updates: Record<string, unknown>) => {
    setLocalConfig(updates);
    setHasUnsavedChanges(true);
  };

  const handleNavigate = (targetId: string) => {
    setCurrentNodeId(targetId);
  };

  const currentSimData = simulatedData[currentNodeId] || { input: null, output: null, status: "not_run" };
  const incomingConnections = connections.filter((c) => c.target_node_id === currentNodeId || c.to === currentNodeId);
  const hasIncomingConnections = incomingConnections.length > 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          className={cn(
            "w-[calc(100vw-16px)] md:w-[calc(100vw-48px)] max-h-[calc(100vh-24px)] md:max-h-[calc(100vh-80px)] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border bg-white shadow-2xl transition-all outline-none [&>button]:hidden",
            node.nodeType === "field_mapping" || node.nodeType === "api" ? "max-w-[1040px]" : "max-w-[860px]"
          )}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            handleRequestClose();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleRequestClose();
          }}
        >
          <NodeEditorHeader
            node={node}
            previousNodes={prevNodes}
            nextNodes={nextNodes}
            onNavigate={handleNavigate}
            onRunStep={handleRunStep}
            onRunPrevious={handleRunPrevious}
            onClose={handleRequestClose}
            onSave={handleSave}
            isSaving={isSavingWorkflow}
            isUnsaved={hasUnsavedChanges}
            isSimulating={isSimulating}
          />

          {node.nodeType === "trigger" ? (
            <div className="flex-1 flex justify-center overflow-y-auto px-6 py-6 bg-slate-50/30">
              <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="pb-4 mb-4 border-b shrink-0">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    ⚡ Gatilho de Entrada
                  </h2>
                </div>

                <div className="space-y-6 pb-4">
                  {(() => {
                    const triggerType = activeTrigger?.type || localConfig.triggerType || "webhook";
                    const triggerConfig = localConfig;

                    const handleTriggerConfigChange = (newConfig: any) => {
                      setLocalConfig(newConfig);
                      setHasUnsavedChanges(true);
                    };

                    const selectorValue = triggerType === "scheduled_recurring" || triggerType === "scheduled_once" ? "scheduled" : triggerType;
                    const webhookUrl = sequenceId
                      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-sequence/${sequenceId}`
                      : "";

                    return (
                      <div className="space-y-6 pb-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-200/80">
                          <div className="space-y-0.5">
                            <label className="text-xs font-bold text-slate-700" htmlFor="group-mode-toggle">Habilitar para Grupo</label>
                            <p className="text-[10px] text-muted-foreground leading-normal max-w-[380px]">
                              Quando ativo, envia para os grupos do WhatsApp configurados. Desative para enviar em conversas individuais.
                            </p>
                          </div>
                          <Switch
                            id="group-mode-toggle"
                            checked={(triggerConfig.isGroup as boolean) ?? true}
                            onCheckedChange={(checked) => handleTriggerConfigChange({ ...triggerConfig, isGroup: checked })}
                          />
                        </div>

                        {selectorValue === "webhook" && (
                          <WebhookFieldMappings
                            triggerConfig={triggerConfig}
                            onTriggerConfigChange={handleTriggerConfigChange}
                            webhookUrl={webhookUrl}
                          />
                        )}

                        {selectorValue === "keyword" && (
                          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuração de Palavra-chave</h3>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-600">Palavra-chave</label>
                                <Input
                                  placeholder="Ex: #queroafiliar"
                                  value={(triggerConfig.keyword as string) || ""}
                                  onChange={(e) => handleTriggerConfigChange({ ...triggerConfig, keyword: e.target.value })}
                                  className="rounded-xl h-9 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {(triggerConfig.isGroup ?? true) && campaignId && (
                          <WebhookGroupScopeConfig
                            campaignId={campaignId}
                            config={triggerConfig}
                            onChange={(scope) => handleTriggerConfigChange({ ...triggerConfig, ...scope })}
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={activeMainTab} onValueChange={(v: any) => setActiveMainTab(v)} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-2 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                <TabsList className="h-8 p-0.5 rounded-xl bg-slate-100 border">
                  <TabsTrigger value="config" className="h-7 text-xs rounded-lg px-4 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Sliders className="h-3.5 w-3.5 text-[#8A3CFF]" /> Configuração
                  </TabsTrigger>
                  <TabsTrigger value="input" className="h-7 text-xs rounded-lg px-4 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Database className="h-3.5 w-3.5 text-[#8A3CFF]" /> Entrada (Input)
                  </TabsTrigger>
                  <TabsTrigger value="output" className="h-7 text-xs rounded-lg px-4 gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Database className="h-3.5 w-3.5 text-[#8A3CFF]" /> Saída (Output)
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <TabsContent value="config" className="m-0 p-0 focus-visible:ring-0">
                  <NodeParametersPanel
                    node={node}
                    onUpdate={handleUpdateConfig}
                    mode={mode}
                    isGroup={isGroup}
                    nodes={nodes}
                    onManualSend={handleManualSend}
                    isSendingManual={isSendingManual}
                  />
                </TabsContent>
                <TabsContent value="input" className="m-0 p-0 focus-visible:ring-0">
                  <NodeInputPanel
                    inputData={currentSimData.input ? toCanonicalPayload(currentSimData.input) : null}
                    mockData={toCanonicalPayload(mockData)}
                    onMockDataChange={(data) => setMockData(toCanonicalPayload(data))}
                    onRunPrevious={handleRunPrevious}
                    hasIncomingConnections={hasIncomingConnections}
                  />
                </TabsContent>
                <TabsContent value="output" className="m-0 p-0 focus-visible:ring-0">
                  <NodeOutputPanel
                    outputData={currentSimData.output}
                    status={currentSimData.status}
                    errorText={currentSimData.error}
                    onRunNode={handleRunStep}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-800">
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Você possui alterações não salvas no workflow. Deseja salvar antes de sair ou descartar as alterações?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-1.5 sm:flex-row">
            <AlertDialogCancel onClick={handleCancelExit} className="text-xs rounded-xl h-8">
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardAndClose}
              className="text-xs rounded-xl h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleSaveAndClose}
              className="text-xs rounded-xl h-8 bg-[#8A3CFF] text-white hover:bg-[#8A3CFF]/90"
            >
              Salvar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
