import { useState } from "react";
import {
  Workflow,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowRegistry } from "@/ai";
import { Link } from "react-router-dom";

export default function AdminAiWorkflows() {
  const workflows = Object.values(WorkflowRegistry);
  const [activeWorkflow, setActiveWorkflow] = useState(workflows[0] || null);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Workflows Agênticos (LangGraph)</h1>
            <Badge variant="outline" className="font-mono text-xs">
              StateGraph Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Grafos cíclicos declarativos orquestrados via LangGraph com checkpointing persistente e validação condicional.
          </p>
        </div>

        <Link to="/admin/ia/playground">
          <Button className="gap-2 text-sm">
            <Play className="h-4 w-4" /> Testar no Playground
          </Button>
        </Link>
      </div>

      {/* Lista e Detalhe de Workflows */}
      {workflows.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Workflow className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhum workflow registrado</h3>
            <p className="text-sm text-muted-foreground text-center">
              Os grafos de estado cíclicos do LangGraph foram reinicializados e serão recriados individualmente.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Lateral: Workflows Registrados */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Grafos Registrados
            </h3>
            {workflows.map((wf) => (
              <Card
                key={wf.slug}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  activeWorkflow?.slug === wf.slug
                    ? "border-primary bg-primary/5 shadow-sm"
                    : ""
                }`}
                onClick={() => setActiveWorkflow(wf)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-emerald-600" />
                      {wf.name}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      v{wf.version}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1 font-mono">
                    {wf.slug}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Coluna Principal: Visualização do Grafo & Loop Guards */}
          <div className="lg:col-span-2 space-y-6">
            {activeWorkflow && (
              <>
                {/* Card do Grafo */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{activeWorkflow.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {activeWorkflow.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        LangGraph StateGraph
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Fluxo de Execução do Grafo
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-mono bg-background">START</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">load_context</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">generate_hooks</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">score_hooks</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">write_script</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">generate_beats</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono">save_content</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="outline" className="font-mono bg-background">END</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Loop Guards & Segurança */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" /> Loop Guards & Guardrails (Regra #8)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Limites rígidos impostos pelo runtime para impedir loops infinitos e explosão de custos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded-lg border bg-muted/30">
                        <span className="text-muted-foreground block text-[11px]">Máx Passos Agente</span>
                        <span className="text-sm font-bold font-mono text-foreground">
                          {activeWorkflow.loop_guards.max_agent_steps} passos
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/30">
                        <span className="text-muted-foreground block text-[11px]">Máx Tool Calls</span>
                        <span className="text-sm font-bold font-mono text-foreground">
                          {activeWorkflow.loop_guards.max_tool_calls} chamadas
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/30">
                        <span className="text-muted-foreground block text-[11px]">Máx Retentativas</span>
                        <span className="text-sm font-bold font-mono text-foreground">
                          {activeWorkflow.loop_guards.max_retries} retries
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/30">
                        <span className="text-muted-foreground block text-[11px]">Timeout Execução</span>
                        <span className="text-sm font-bold font-mono text-foreground">
                          {activeWorkflow.loop_guards.max_execution_time_seconds}s
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/30">
                        <span className="text-muted-foreground block text-[11px]">Custo Limite / Run</span>
                        <span className="text-sm font-bold font-mono text-foreground">
                          ${activeWorkflow.loop_guards.max_cost_dollars.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
