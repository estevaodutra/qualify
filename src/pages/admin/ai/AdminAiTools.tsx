import { useState } from "react";
import {
  Wrench,
  Shield,
  Clock,
  RotateCw,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_TOOLS, ToolDefinition } from "@/ai";

export default function AdminAiTools() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);

  const filteredTools = ALL_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getTypeBadge(type: ToolDefinition["type"]) {
    switch (type) {
      case "read_only":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">read_only</Badge>;
      case "write_internal":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300">write_internal</Badge>;
      case "write_external":
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300">write_external</Badge>;
      case "critical":
        return <Badge variant="destructive">critical</Badge>;
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Catálogo de Ferramentas (Tools)</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {ALL_TOOLS.length} Ferramentas
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Funções executáveis reais da Qualify expostas nativamente para LangChain e LangGraph.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar ferramentas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>

      {/* Grid de Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <Card key={tool.name} className="flex flex-col justify-between hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-mono">{tool.name}</CardTitle>
                    <div className="mt-1">{getTypeBadge(tool.type)}</div>
                  </div>
                </div>
              </div>
              <CardDescription className="text-xs mt-2 line-clamp-2">
                {tool.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0 text-xs">
              {/* Permissão RBAC */}
              <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" /> Permissão RBAC
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {tool.permission}
                </Badge>
              </div>

              {/* Timeout */}
              <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" /> Timeout
                </span>
                <span className="font-medium text-foreground">{tool.timeout || 30}s</span>
              </div>

              {/* Retry Policy */}
              <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <RotateCw className="h-3.5 w-3.5 text-amber-500" /> Retries
                </span>
                <span className="font-medium text-foreground">
                  {tool.retry_policy?.max_retries || 2} tentativas ({tool.retry_policy?.backoff || "linear"})
                </span>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={() => setSelectedTool(tool)}
                >
                  <Eye className="h-3.5 w-3.5" /> Ver Schemas & Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Detalhes da Tool */}
      <Dialog open={Boolean(selectedTool)} onOpenChange={() => setSelectedTool(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedTool && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <DialogTitle className="font-mono">{selectedTool.name}</DialogTitle>
                  </div>
                  {getTypeBadge(selectedTool.type)}
                </div>
                <DialogDescription>{selectedTool.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <span className="font-medium">Permissão Obrigatória:</span>
                  <Badge variant="outline" className="font-mono">
                    {selectedTool.permission}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 uppercase text-[11px]">
                    Schema de Entrada (Zod Input)
                  </h4>
                  <pre className="p-3 rounded-lg bg-muted/60 font-mono text-xs overflow-x-auto">
                    {JSON.stringify(
                      (selectedTool.input_schema as any)._def?.shape?.() ||
                        (selectedTool.input_schema as any).description ||
                        "Schema Zod Validado",
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <CheckCircle2 className="h-4 w-4" /> Integração LangChain Nativa
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Esta ferramenta é empacotada automaticamente como um DynamicStructuredTool do LangChain,
                    garantindo validação de tipos em tempo real durante chamadas de agentes e nós de StateGraph.
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
