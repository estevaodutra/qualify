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
  const [activeWorkflow, setActiveWorkflow] = useState(workflows[0]);

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

                <CardContent className="space-y-6">
                  {/* Visualização de Nós do LangGraph */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Fluxo de Execução dos Nós
                    </h4>

                    <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-emerald-600">START</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded border shadow-xs">
                          Load Context
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded border shadow-xs">
                          Generate Hooks (3x)
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded border shadow-xs">
                          Score Hooks
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pl-6">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded border shadow-xs">
                          Select Winner
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded border shadow-xs">
                          Write Script
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-background px-2.5 py-1 rounded border shadow-xs">
                          Generate Beat Sheet
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 px-2.5 py-1 rounded shadow-xs">
                          Validate
                        </span>
                      </div>

                      {/* Ramificação Condicional */}
                      <div className="pt-2 pl-12 border-l-2 border-amber-400 ml-8 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[11px] text-amber-600 font-medium">↳ Se inválido:</span>
                          <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 font-mono text-[11px]">
                            Rewrite (Loop de Refinamento)
                          </span>
                          <RotateCcw className="h-3 w-3 text-amber-600" />
                          <span className="text-[10px] text-muted-foreground">Volta para revalidação</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[11px] text-emerald-600 font-medium">↳ Se válido:</span>
                          <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 font-mono text-[11px]">
                            Save Content (Biblioteca Criafy)
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge variant="default" className="bg-slate-700">END</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loop Guards */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Loop Guards & Proteções
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="text-muted-foreground text-[10px]">Max Retries</div>
                        <div className="text-base font-bold text-foreground mt-0.5">
                          {activeWorkflow.loop_guards.max_retries}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="text-muted-foreground text-[10px]">Max Steps</div>
                        <div className="text-base font-bold text-foreground mt-0.5">
                          {activeWorkflow.loop_guards.max_agent_steps}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="text-muted-foreground text-[10px]">Timeout Máx</div>
                        <div className="text-base font-bold text-foreground mt-0.5">
                          {activeWorkflow.loop_guards.max_execution_time_seconds}s
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="text-muted-foreground text-[10px]">Teto de Custo</div>
                        <div className="text-base font-bold text-foreground mt-0.5">
                          ${activeWorkflow.loop_guards.max_cost_dollars.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
