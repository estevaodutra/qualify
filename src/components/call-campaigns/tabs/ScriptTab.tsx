import { useState } from "react";
import { useCallScript, CallScriptNode, ScriptOption } from "@/hooks/useCallScript";
import { useCallActions } from "@/hooks/useCallActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Circle,
  MessageSquare,
  HelpCircle,
  StickyNote,
  XCircle,
  Save,
  Trash2,
  GripVertical,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ScriptTabProps {
  campaignId: string;
}

const nodeTypeConfig = {
  start: { icon: Circle, color: "bg-green-100 text-green-800", label: "Início" },
  speech: { icon: MessageSquare, color: "bg-blue-100 text-blue-800", label: "Fala" },
  question: { icon: HelpCircle, color: "bg-purple-100 text-purple-800", label: "Pergunta" },
  note: { icon: StickyNote, color: "bg-yellow-100 text-yellow-800", label: "Nota" },
  end: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Fim" },
};

/** Normalise legacy string[] options to ScriptOption[] */
const normaliseOptions = (opts: unknown): ScriptOption[] | undefined => {
  if (!opts || !Array.isArray(opts)) return undefined;
  return opts.map((o) =>
    typeof o === "string" ? { text: o } : (o as ScriptOption)
  );
};

export function ScriptTab({ campaignId }: ScriptTabProps) {
  const { script, isLoading, saveScript, isSaving } = useCallScript(campaignId);
  const [nodes, setNodes] = useState<CallScriptNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize nodes from script
  useState(() => {
    if (script?.nodes) {
      setNodes(
        [...script.nodes]
          .sort((a, b) => a.order - b.order)
          .map((n) => ({ ...n, data: { ...n.data, options: normaliseOptions(n.data.options) } }))
      );
    }
  });

  // Update local state when script loads
  if (script && nodes.length === 0 && script.nodes.length > 0) {
    setNodes(
      [...script.nodes]
        .sort((a, b) => a.order - b.order)
        .map((n) => ({ ...n, data: { ...n.data, options: normaliseOptions(n.data.options) } }))
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleAddNode = (type: CallScriptNode["type"]) => {
    const newNode: CallScriptNode = {
      id: `${type}-${Date.now()}`,
      type,
      data: { text: "" },
      order: nodes.length,
    };

    const endIndex = nodes.findIndex((n) => n.type === "end");
    if (endIndex > -1 && type !== "end") {
      const newNodes = [...nodes];
      newNodes.splice(endIndex, 0, newNode);
      newNodes.forEach((n, i) => (n.order = i));
      setNodes(newNodes);
    } else {
      setNodes([...nodes, newNode]);
    }
    setHasChanges(true);
    setSelectedNodeId(newNode.id);
  };

  const handleUpdateNode = (id: string, updates: Partial<CallScriptNode["data"]>) => {
    setNodes(
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
    setHasChanges(true);
  };

  const handleDeleteNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node?.type === "start" || node?.type === "end") return;

    setNodes(nodes.filter((n) => n.id !== id));
    setHasChanges(true);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleSave = async () => {
    if (!script) return;

    const edges: { id: string; source: string; target: string; label?: string }[] = [];

    nodes.forEach((node, i) => {
      if (node.type === "question" && node.data.options?.length) {
        node.data.options.forEach((opt, oi) => {
          const target = opt.targetNodeId || (i + 1 < nodes.length ? nodes[i + 1].id : undefined);
          if (target) {
            edges.push({ id: `edge-${node.id}-${oi}`, source: node.id, target, label: opt.text });
          }
        });
      } else if (i + 1 < nodes.length) {
        edges.push({ id: `edge-${i}`, source: node.id, target: nodes[i + 1].id });
      }
    });

    await saveScript({ nodes, edges });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(["speech", "question", "note"] as const).map((type) => {
            const config = nodeTypeConfig[type];
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddNode(type)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {config.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roteiro</CardTitle>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {nodes.map((node) => {
            const config = nodeTypeConfig[node.type];
            const Icon = config.icon;
            const isSelected = selectedNodeId === node.id;

            return (
              <div
                key={node.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge className={config.color}>
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="flex-1 text-sm truncate">
                  {node.data.label || node.data.text || "(vazio)"}
                </span>
                {node.type !== "start" && node.type !== "end" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Config Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <Badge className={nodeTypeConfig[selectedNode.type].color}>
                  {nodeTypeConfig[selectedNode.type].label}
                </Badge>
              </div>

              {selectedNode.type !== "start" && selectedNode.type !== "end" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    value={selectedNode.data.label || ""}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, { label: e.target.value })
                    }
                    placeholder="Nome do componente..."
                  />
                </div>
              )}

              {selectedNode.type === "question" ? (
                <QuestionConfig
                  node={selectedNode}
                  allNodes={nodes}
                  campaignId={campaignId}
                  onUpdate={handleUpdateNode}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Texto</label>
                  <Textarea
                    value={selectedNode.data.text || ""}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, { text: e.target.value })
                    }
                    placeholder={
                      selectedNode.type === "speech"
                        ? "Digite o texto para falar..."
                        : selectedNode.type === "note"
                        ? "Digite uma nota interna..."
                        : "Texto..."
                    }
                    rows={4}
                    disabled={selectedNode.type === "start" || selectedNode.type === "end"}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione um componente do roteiro para editar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Question Config sub-component ── */

function QuestionConfig({
  node,
  allNodes,
  campaignId,
  onUpdate,
}: {
  node: CallScriptNode;
  allNodes: CallScriptNode[];
  campaignId: string;
  onUpdate: (id: string, updates: Partial<CallScriptNode["data"]>) => void;
}) {
  const options = node.data.options || [];
  const targetableNodes = allNodes.filter((n) => n.id !== node.id);
  const { actions } = useCallActions(campaignId);

  const updateOption = (index: number, patch: Partial<ScriptOption>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...patch };
    onUpdate(node.id, { options: newOptions });
  };

  const removeOption = (index: number) => {
    onUpdate(node.id, { options: options.filter((_, i) => i !== index) });
  };

  const addOption = () => {
    onUpdate(node.id, { options: [...options, { text: "" }] });
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Pergunta</label>
        <Textarea
          value={node.data.text || ""}
          onChange={(e) => onUpdate(node.id, { text: e.target.value })}
          placeholder="Digite a pergunta..."
          rows={3}
        />
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium">Opções de Resposta</label>
        {options.map((opt, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                value={opt.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                placeholder={`Opção ${i + 1}`}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={opt.targetNodeId || "__next__"}
              onValueChange={(v) =>
                updateOption(i, { targetNodeId: v === "__next__" ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Direcionar para..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__next__">Próximo (padrão)</SelectItem>
                {targetableNodes.map((n) => {
                  const cfg = nodeTypeConfig[n.type];
                  const snippet = n.data.label || (n.data.text || "").slice(0, 30);
                      return (
                        <SelectItem key={n.id} value={n.id}>
                          {cfg.label} – {snippet || "(vazio)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select
              value={opt.actionId || "__none__"}
              onValueChange={(v) =>
                updateOption(i, { actionId: v === "__none__" ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Ação ao selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma ação</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action.id} value={action.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: action.color }}
                      />
                      {action.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addOption}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Opção
        </Button>
      </div>
    </>
  );
}
