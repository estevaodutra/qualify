import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ArrowRight, Code2, Copy, Check, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface FieldMapping {
  sourceField: string;
  variableName: string;
}

interface WebhookFieldMappingsProps {
  fieldMappings: FieldMapping[];
  onFieldMappingsChange: (mappings: FieldMapping[]) => void;
  webhookUrl: string;
}

export function WebhookFieldMappings({
  fieldMappings,
  onFieldMappingsChange,
  webhookUrl,
}: WebhookFieldMappingsProps) {
  const [newSourceField, setNewSourceField] = useState("");
  const [newVariableName, setNewVariableName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const addMapping = () => {
    if (!newSourceField.trim() || !newVariableName.trim()) {
      toast.error("Preencha ambos os campos");
      return;
    }

    // Clean variable name (remove {{ }} if user added them)
    const cleanVarName = newVariableName.replace(/\{\{|\}\}/g, "").trim();

    // Check for duplicates
    if (fieldMappings.some(m => m.variableName === cleanVarName)) {
      toast.error("Variável já existe");
      return;
    }

    onFieldMappingsChange([
      ...fieldMappings,
      { sourceField: newSourceField.trim(), variableName: cleanVarName },
    ]);

    setNewSourceField("");
    setNewVariableName("");
  };

  const removeMapping = (index: number) => {
    onFieldMappingsChange(fieldMappings.filter((_, i) => i !== index));
  };

  const examplePayload = `{
  "user": {
    "name": "João Silva",
    "email": "joao@exemplo.com"
  },
  "order": {
    "id": "12345"
  }
}`;

  return (
    <div className="space-y-4 p-3 rounded-lg bg-background border">
      {/* Webhook URL Section */}
      <div className="space-y-2">
        <Label className="text-sm">URL do Webhook</Label>
        <p className="text-xs text-muted-foreground">
          Use esta URL para disparar a sequência de outro sistema
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={webhookUrl || "Salve a sequência para gerar a URL"}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopyWebhook}
            disabled={!webhookUrl}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Field Mappings Section */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Mapeamento de Campos</Label>
          <Badge variant="outline" className="text-xs">
            {fieldMappings.length} campo{fieldMappings.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Mapeie campos do payload JSON para variáveis usáveis nas mensagens
        </p>

        {/* Existing Mappings */}
        {fieldMappings.length > 0 && (
          <div className="space-y-2">
            {fieldMappings.map((mapping, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
              >
                <code className="flex-1 text-xs font-mono bg-background px-2 py-1 rounded">
                  {mapping.sourceField}
                </code>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Badge variant="secondary" className="font-mono">
                  {`{{${mapping.variableName}}}`}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMapping(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Mapping */}
        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Caminho no Payload</Label>
            <Input
              placeholder="ex: user.email"
              value={newSourceField}
              onChange={(e) => setNewSourceField(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground mb-2.5" />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome da Variável</Label>
            <Input
              placeholder="ex: email"
              value={newVariableName}
              onChange={(e) => setNewVariableName(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMapping}
            className="mb-0.5"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Variables Help */}
        {fieldMappings.length > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Use nas mensagens:</span>{" "}
              {fieldMappings.map((m, i) => (
                <span key={i}>
                  <code className="text-primary">{`{{${m.variableName}}}`}</code>
                  {i < fieldMappings.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Documentation Section */}
      <Collapsible open={showDocs} onOpenChange={setShowDocs}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <Code2 className="h-4 w-4 mr-2" />
            {showDocs ? "Ocultar" : "Ver"} exemplo de payload
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="rounded-md bg-muted p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Envie um POST para a URL com o seguinte formato:
            </p>
            <pre className="text-xs font-mono bg-background p-2 rounded border overflow-x-auto">
              {examplePayload}
            </pre>
            <p className="text-xs text-muted-foreground">
              Para o exemplo acima, você pode mapear:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>
                <code className="bg-background px-1 rounded">user.name</code> → <code className="text-primary">{`{{nome}}`}</code>
              </li>
              <li>
                <code className="bg-background px-1 rounded">user.email</code> → <code className="text-primary">{`{{email}}`}</code>
              </li>
              <li>
                <code className="bg-background px-1 rounded">order.id</code> → <code className="text-primary">{`{{pedido}}`}</code>
              </li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
