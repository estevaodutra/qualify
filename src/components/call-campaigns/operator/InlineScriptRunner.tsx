import { useState, useEffect, useMemo } from "react";
import { MessageSquare, HelpCircle, StickyNote, CheckCircle, XCircle, Loader2, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCallScript, CallScriptNode, CallScriptEdge, ScriptOption } from "@/hooks/useCallScript";
import { useCallLeads } from "@/hooks/useCallLeads";
import { cn } from "@/lib/utils";

const nodeTypeConfig = {
  start: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-200 dark:border-green-800", label: "Início" },
  speech: { icon: MessageSquare, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-800", label: "Fala" },
  question: { icon: HelpCircle, color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950/30", borderColor: "border-purple-200 dark:border-purple-800", label: "Pergunta" },
  note: { icon: StickyNote, color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-950/30", borderColor: "border-yellow-200 dark:border-yellow-800", label: "Nota Interna" },
  end: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-800", label: "Fim" },
};

interface InlineScriptRunnerProps {
  campaignId: string;
  leadId: string;
  onReachEnd?: () => void;
  onActionSelected?: (actionId: string) => void;
}

export function InlineScriptRunner({ campaignId, leadId, onReachEnd, onActionSelected }: InlineScriptRunnerProps) {
  const { script, isLoading: scriptLoading } = useCallScript(campaignId);
  const { leads } = useCallLeads(campaignId);

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [scriptPath, setScriptPath] = useState<string[]>([]);

  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  // Find start node and initialize
  useEffect(() => {
    if (script && script.nodes.length > 0 && !currentNodeId) {
      const startNode = script.nodes.find((n) => n.type === "start");
      if (startNode) {
        setCurrentNodeId(startNode.id);
        setScriptPath([startNode.id]);
      }
    }
  }, [script, currentNodeId]);

  const currentNode = useMemo(() => {
    if (!script || !currentNodeId) return null;
    return script.nodes.find((n) => n.id === currentNodeId) || null;
  }, [script, currentNodeId]);

  const getOutgoingEdges = (nodeId: string): CallScriptEdge[] => {
    if (!script) return [];
    return script.edges.filter((e) => e.source === nodeId);
  };

  const handleNext = (targetNodeId?: string, actionId?: string) => {
    if (!script || !currentNodeId) return;

    // If an actionId was provided from the selected option, notify parent
    if (actionId && onActionSelected) {
      onActionSelected(actionId);
    }

    const edges = getOutgoingEdges(currentNodeId);

    let nextNodeId: string | undefined;
    if (targetNodeId) {
      nextNodeId = targetNodeId;
    } else if (edges.length === 1) {
      nextNodeId = edges[0].target;
    }

    if (nextNodeId) {
      setCurrentNodeId(nextNodeId);
      setScriptPath((prev) => [...prev, nextNodeId!]);

      // Check if we reached an end node
      const nextNode = script.nodes.find((n) => n.id === nextNodeId);
      if (nextNode?.type === "end" && onReachEnd) {
        onReachEnd();
      }
    }
  };

  const replaceVariables = (text: string): string => {
    if (!lead) return text;
    return text
      .replace(/\{nome\}/g, lead.name || "")
      .replace(/\{telefone\}/g, lead.phone || "")
      .replace(/\{email\}/g, lead.email || "");
  };

  if (scriptLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!script || script.nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum roteiro configurado para esta campanha.
      </div>
    );
  }

  if (!currentNode) return null;

  const config = nodeTypeConfig[currentNode.type];
  const Icon = config?.icon || MessageSquare;
  const edges = getOutgoingEdges(currentNode.id);

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          Passo {scriptPath.length}
        </Badge>
        {currentNode.type === "end" && (
          <Badge variant="secondary" className="text-xs text-emerald-600">
            Roteiro finalizado
          </Badge>
        )}
      </div>

      <Card className={cn("border-2", config.bgColor, config.borderColor)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            <CardTitle className="text-base">{config.label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {replaceVariables(currentNode.data.text || "")}
          </p>

          {/* Options for questions */}
          {currentNode.type === "question" && edges.length > 0 && (
            <div className="mt-3 space-y-2">
              {edges.map((edge, edgeIndex) => {
                const matchingOption = currentNode.data.options?.[edgeIndex];
                return (
                  <Button
                    key={edge.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 dark:bg-background dark:border-border"
                    onClick={() => handleNext(edge.target, matchingOption?.actionId)}
                  >
                    {edge.label || "Opção"}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Start node: Atendeu / Não Atendeu */}
          {currentNode.type === "start" && edges.length > 0 && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleNext()}>
                <Phone className="mr-1 h-4 w-4" /> Atendeu
              </Button>
              <Button size="sm" variant="destructive" onClick={() => {
                const endNode = script?.nodes.find((n) => n.type === "end");
                if (endNode) {
                  setCurrentNodeId(endNode.id);
                  setScriptPath((prev) => [...prev, endNode.id]);
                }
                onReachEnd?.();
              }}>
                <PhoneOff className="mr-1 h-4 w-4" /> Não Atendeu
              </Button>
            </div>
          )}

          {/* Next button for non-question, non-end, non-start nodes */}
          {currentNode.type !== "question" && currentNode.type !== "end" && currentNode.type !== "start" && edges.length > 0 && (
            <Button size="sm" className="mt-3" onClick={() => handleNext()}>
              Próximo
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
