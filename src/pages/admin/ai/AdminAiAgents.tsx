import { useState } from "react";
import {
  Bot,
  Sparkles,
  Shield,
  Layers,
  Wrench,
  Database,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PREPARED_AGENTS, AgentDefinition } from "@/ai";

export default function AdminAiAgents() {
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Registro de Agentes</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {PREPARED_AGENTS.length} Agentes
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Agentes especializados alimentados por LangChain com contexto multi-tenant e RBAC rigoroso.
          </p>
        </div>
      </div>

      {/* Grid de Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PREPARED_AGENTS.map((agent) => {
          const isActive = agent.status === "active";
          return (
            <Card
              key={agent.slug}
              className={`flex flex-col justify-between transition-all hover:shadow-md ${
                isActive ? "border-emerald-500/30 bg-card" : "opacity-85 border-dashed"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <p className="text-xs font-mono text-muted-foreground">{agent.slug}</p>
                    </div>
                  </div>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={
                      isActive
                        ? "bg-emerald-600 text-white text-[10px]"
                        : "text-[10px]"
                    }
                  >
                    {isActive ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Em Breve
                      </span>
                    )}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-2 line-clamp-2">
                  {agent.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 text-xs">
                {/* Perfil de Modelo & Versão */}
                <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Perfil Modelo
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {agent.model_profile}
                  </Badge>
                </div>

                {/* Skills */}
                <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-500" /> Skills Vinculadas
                  </span>
                  <span className="font-medium text-foreground">
                    {agent.skills.length > 0 ? agent.skills.join(", ") : "Nenhuma"}
                  </span>
                </div>

                {/* Tools */}
                <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" /> Ferramentas (Tools)
                  </span>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {agent.tools.length} autorizadas
                  </Badge>
                </div>

                {/* Context Providers */}
                <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-purple-500" /> Fontes de Contexto
                  </span>
                  <span className="font-medium text-foreground">
                    {agent.context_providers.length} fontes
                  </span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver Configuração & Prompt
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Detalhes do Agente */}
      <Dialog open={Boolean(selectedAgent)} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedAgent && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-emerald-600" />
                    <DialogTitle>{selectedAgent.name}</DialogTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    v{selectedAgent.version}
                  </Badge>
                </div>
                <DialogDescription>{selectedAgent.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                    Tools Permitidas (RBAC Scoped)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.tools.map((t) => (
                      <Badge key={t} variant="secondary" className="font-mono text-xs">
                        {t}
                      </Badge>
                    ))}
                    {selectedAgent.tools.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhuma ferramenta associada.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                    Context Providers Injetados
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.context_providers.map((cp) => (
                      <Badge key={cp} variant="outline" className="font-mono text-xs">
                        {cp}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                    Permissões Requeridas (RBAC)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.permissions.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <Shield className="h-3 w-3 mr-1 inline" />
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                    System Prompt do Agente
                  </h4>
                  <pre className="p-3 rounded-lg bg-muted font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {selectedAgent.system_prompt}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
