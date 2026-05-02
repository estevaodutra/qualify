import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, User, MessageSquare, HelpCircle, StickyNote, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCallScript, CallScriptNode, CallScriptEdge } from "@/hooks/useCallScript";
import { useCallActions } from "@/hooks/useCallActions";
import { useCallLeads } from "@/hooks/useCallLeads";
import { cn } from "@/lib/utils";

const nodeTypeConfig = {
  start: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-50", label: "Início" },
  speech: { icon: MessageSquare, color: "text-blue-500", bgColor: "bg-blue-50", label: "Fala" },
  question: { icon: HelpCircle, color: "text-purple-500", bgColor: "bg-purple-50", label: "Pergunta" },
  note: { icon: StickyNote, color: "text-yellow-500", bgColor: "bg-yellow-50", label: "Nota Interna" },
  end: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", label: "Fim" },
};

export function OperatorScriptView() {
  const { campaignId, leadId } = useParams<{ campaignId: string; leadId: string }>();
  const navigate = useNavigate();
  const { script, isLoading: scriptLoading } = useCallScript(campaignId || "");
  const { actions, isLoading: actionsLoading } = useCallActions(campaignId || "");
  const { leads, completeLead } = useCallLeads(campaignId || "");

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [scriptPath, setScriptPath] = useState<string[]>([]);
  const [startTime] = useState<Date>(new Date());
  const [isCompleting, setIsCompleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

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

  const handleNext = (targetNodeId?: string) => {
    if (!script || !currentNodeId) return;

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
    }
  };

  const handleCompleteCall = async (actionId: string | null) => {
    if (!leadId) return;

    setIsCompleting(true);
    try {
      const durationSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      await completeLead({
        leadId,
        actionId: actionId || undefined,
        notes: notes || undefined,
        durationSeconds,
        scriptPath,
      });

      navigate(`/campaigns/telefonia/ligacao`);
    } catch (error) {
      console.error("Error completing call:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const replaceVariables = (text: string): string => {
    if (!lead) return text;
    return text
      .replace(/\{nome\}/g, lead.name || "")
      .replace(/\{telefone\}/g, lead.phone || "")
      .replace(/\{email\}/g, lead.email || "");
  };

  if (scriptLoading || actionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Lead não encontrado</h2>
            <p className="text-muted-foreground mb-4">O lead selecionado não existe ou foi removido.</p>
            <Button onClick={() => navigate(`/campaigns/telefonia/ligacao`)}>
              Voltar para Campanhas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = currentNode ? nodeTypeConfig[currentNode.type] : null;
  const Icon = config?.icon || MessageSquare;
  const edges = currentNode ? getOutgoingEdges(currentNode.id) : [];
  const isEndNode = currentNode?.type === "end";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/campaigns/telefonia/ligacao`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{lead.name || "Sem nome"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{lead.phone}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="font-mono">
            {formatElapsed(elapsed)}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {currentNode && config && (
            <Card className={cn("border-2", config.bgColor)}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", config.color)} />
                  <CardTitle className="text-lg">{config.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {replaceVariables(currentNode.data.text || "")}
                </p>

                {/* Options for questions */}
                {currentNode.type === "question" && edges.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {edges.map((edge) => (
                      <Button
                        key={edge.id}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => handleNext(edge.target)}
                      >
                        {edge.label || "Opção"}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Next button for non-question nodes */}
                {currentNode.type !== "question" && currentNode.type !== "end" && edges.length > 0 && (
                  <Button className="mt-4" onClick={() => handleNext()}>
                    Próximo
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Anotações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione notas sobre esta ligação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer - Action Buttons */}
      <footer className="border-t bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground mb-2">Finalizar ligação com resultado:</p>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                disabled={isCompleting}
                style={{ borderColor: action.color, color: action.color }}
                onClick={() => handleCompleteCall(action.id)}
              >
                {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {action.name}
              </Button>
            ))}
            <Button
              variant="ghost"
              disabled={isCompleting}
              onClick={() => handleCompleteCall(null)}
            >
              Sem resultado
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default OperatorScriptView;
