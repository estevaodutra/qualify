import { useState, useMemo } from "react";
import { 
  Braces, Type, Hash, AlignLeft, Plus, Webhook, Database, 
  Sparkles, Check, ChevronRight, ChevronDown, FileJson, 
  Code
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  isGroup?: boolean;
  referencePayload?: any;
  triggerName?: string;
}

const DEFAULT_SAMPLE_PAYLOAD = {
  body: {
    nome: "Carlos Eduardo",
    primeiro_nome: "Carlos",
    telefone: "5511999887766",
    email: "carlos@exemplo.com",
    cpf: "123.456.789-00",
    id_externo: "USR-9482",
    valor: "249.90",
    status: "aprovado",
    cidade: "São Paulo",
    uf: "SP"
  },
  headers: {
    "content-type": "application/json"
  },
  query_params: {
    source: "webhook_api",
    utm_campaign: "campanha_vendas"
  }
};

// Componente recursivo para explorar e navegar pelo JSON recebido no Webhook
function JsonPayloadTree({ 
  data, 
  onSelectPath, 
  currentPath = "",
  selectedPath = "" 
}: { 
  data: any; 
  onSelectPath: (path: string) => void; 
  currentPath?: string;
  selectedPath?: string;
}) {
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});

  const toggleCollapse = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (typeof data !== "object" || data === null) {
    const isSelected = selectedPath === currentPath;
    return (
      <div 
        onClick={() => onSelectPath(currentPath)}
        className={cn(
          "text-xs py-1.5 px-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between group",
          isSelected 
            ? "bg-primary/15 text-primary font-semibold border border-primary/30" 
            : "hover:bg-muted/70 text-foreground/90"
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <span className="font-mono text-primary/80 font-bold shrink-0">{currentPath.split('.').pop()}:</span>
          <span className="font-mono text-muted-foreground truncate">{String(data)}</span>
        </div>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded transition-opacity shrink-0 ml-2",
          isSelected 
            ? "bg-primary text-primary-foreground opacity-100" 
            : "bg-primary/10 text-primary opacity-0 group-hover:opacity-100"
        )}>
          Selecionar
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = Object.entries(data);

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        const isPrimitive = typeof value !== "object" || value === null;
        const isCollapsed = !!collapsedKeys[key];
        const isSelected = selectedPath === fullPath;

        if (isPrimitive) {
          return (
            <div 
              key={fullPath}
              onClick={() => onSelectPath(fullPath)}
              className={cn(
                "text-xs py-1.5 px-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between group border border-transparent",
                isSelected 
                  ? "bg-primary/15 text-primary font-semibold border-primary/30 shadow-sm" 
                  : "hover:bg-muted/60 text-foreground"
              )}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="font-mono text-primary font-bold shrink-0">{key}:</span>
                <span className="font-mono text-muted-foreground truncate max-w-[280px]">
                  {value === null ? "null" : typeof value === "string" ? `"${value}"` : String(value)}
                </span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-muted/60 text-muted-foreground font-mono">
                  {typeof value}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-mono text-[10px] text-muted-foreground/60 hidden sm:inline">
                  {`{{${fullPath}}}`}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded transition-all",
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-primary/10 text-primary opacity-0 group-hover:opacity-100"
                )}>
                  {isSelected ? "Selecionado" : "Escolher"}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div key={fullPath} className="border border-border/30 rounded-xl overflow-hidden bg-card/40 my-1">
            <div 
              onClick={(e) => toggleCollapse(key, e)}
              className="flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors select-none text-xs font-semibold"
            >
              <div className="flex items-center gap-1.5 text-foreground">
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                <FileJson className="h-3.5 w-3.5 text-primary" />
                <span>{key}</span>
                <span className="text-[10px] text-muted-foreground font-mono font-normal">
                  {isArray ? `[${(value as any[]).length} itens]` : `{${Object.keys(value).length} propriedades}`}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPath(fullPath);
                }}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded transition-all",
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-primary hover:bg-primary/10"
                )}
              >
                Selecionar Objeto
              </button>
            </div>
            {!isCollapsed && (
              <div className="p-2 pl-4 border-t border-border/20">
                <JsonPayloadTree 
                  data={value} 
                  onSelectPath={onSelectPath} 
                  currentPath={fullPath} 
                  selectedPath={selectedPath}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function VariablePicker({ onSelect, isGroup, referencePayload, triggerName = "Webhook 1" }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [newFieldOpen, setNewFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  
  // Estado do Modal de Exploração de Payload
  const [payloadModalOpen, setPayloadModalOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>("body.nome");
  const [customJsonText, setCustomJsonText] = useState("");
  const [activeTab, setActiveTab] = useState<"tree" | "json">("tree");

  // Estado local para armazenar os campos recém-criados na sessão
  const [localCustomFields, setLocalCustomFields] = useState<Array<{label: string, value: string, icon: any}>>([]);

  // Payload ativo (do webhook de referência, customizado ou default)
  const currentPayload = useMemo(() => {
    if (customJsonText.trim()) {
      try {
        return JSON.parse(customJsonText);
      } catch (e) {
        // ignore parse error during typing
      }
    }
    if (referencePayload && typeof referencePayload === "object" && Object.keys(referencePayload).length > 0) {
      return referencePayload;
    }
    return DEFAULT_SAMPLE_PAYLOAD;
  }, [referencePayload, customJsonText]);

  // Lista de variáveis estruturadas por categoria
  const baseVariables = isGroup ? [
    {
      category: "Entrada de dados",
      items: [
        { 
          label: `${triggerName} (Explorar payload)`, 
          value: "__OPEN_PAYLOAD_EXPLORER__", 
          icon: Webhook,
          badge: "Explorar",
          highlight: true
        },
        { label: "Corpo da requisição", value: "{{body}}", icon: Database },
        { label: "Nome no payload (body.nome)", value: "{{body.nome}}", icon: Type },
        { label: "Telefone no payload (body.telefone)", value: "{{body.telefone}}", icon: Hash },
        { label: "Email no payload (body.email)", value: "{{body.email}}", icon: AlignLeft },
        { label: "ID / Código no payload (body.id)", value: "{{body.id}}", icon: Hash },
        { label: "Valor no payload (body.valor)", value: "{{body.valor}}", icon: Hash },
      ]
    },
    {
      category: "Campos do contato",
      items: [
        { label: "Nome completo do lead", value: "{{name}}", icon: Type },
        { label: "Telefone do lead", value: "{{phone}}", icon: Hash },
      ]
    },
    {
      category: "Informações do grupo",
      items: [
        { label: "Nome do grupo", value: "{{group_name}}", icon: AlignLeft },
        { label: "ID do grupo", value: "{{group_id}}", icon: Hash },
        { label: "Descrição do grupo", value: "{{group_description}}", icon: AlignLeft },
      ]
    },
    {
      category: "Campos adicionais",
      items: [
        { label: "Campo personalizado (exemplo)", value: "{{campo_customizado}}", icon: AlignLeft },
        ...localCustomFields
      ]
    }
  ] : [
    {
      category: "Entrada de dados",
      items: [
        { 
          label: `${triggerName} (Explorar payload)`, 
          value: "__OPEN_PAYLOAD_EXPLORER__", 
          icon: Webhook,
          badge: "Explorar",
          highlight: true
        },
        { label: "Corpo da requisição", value: "{body}", icon: Database },
        { label: "Nome no payload (body.nome)", value: "{body.nome}", icon: Type },
        { label: "Telefone no payload (body.telefone)", value: "{body.telefone}", icon: Hash },
        { label: "Email no payload (body.email)", value: "{body.email}", icon: AlignLeft },
        { label: "ID / Código no payload (body.id)", value: "{body.id}", icon: Hash },
        { label: "Valor no payload (body.valor)", value: "{body.valor}", icon: Hash },
      ]
    },
    {
      category: "Campos do lead",
      items: [
        { label: "Nome completo do lead", value: "{nome}", icon: Type },
        { label: "Primeiro nome do lead", value: "{primeiro_nome}", icon: Type },
        { label: "Telefone do lead", value: "{telefone}", icon: Hash },
        { label: "Email do lead", value: "{email}", icon: AlignLeft },
        { label: "CPF do lead", value: "{cpf}", icon: Hash },
      ]
    },
    {
      category: "Endereço do lead",
      items: [
        { label: "CEP do lead", value: "{cep}", icon: Hash },
        { label: "Endereço do lead", value: "{endereco}", icon: AlignLeft },
        { label: "Bairro do lead", value: "{bairro}", icon: AlignLeft },
        { label: "Número de residência do lead", value: "{numero}", icon: Hash },
        { label: "Cidade do lead", value: "{cidade}", icon: AlignLeft },
        { label: "Complemento do lead", value: "{complemento}", icon: AlignLeft },
      ]
    },
    {
      category: "Campos adicionais",
      items: [
        { label: "Campo personalizado (exemplo)", value: "{campo_customizado}", icon: AlignLeft },
        ...localCustomFields
      ]
    }
  ];

  const handleCreateField = () => {
    if (!newFieldName.trim()) return;
    
    // Gerar slug (ex: "Meu Campo" -> "meu_campo")
    const slug = newFieldName
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
      
    const format = isGroup ? `{{${slug}}}` : `{${slug}}`;
    
    setLocalCustomFields(prev => [...prev, {
      label: newFieldName,
      value: format,
      icon: AlignLeft
    }]);
    
    toast.success("Campo personalizado criado!");
    setNewFieldName("");
    setNewFieldOpen(false);
    setOpen(true); // Reabre o popover
  };

  const handleSelectVariableItem = (value: string) => {
    if (value === "__OPEN_PAYLOAD_EXPLORER__") {
      setOpen(false);
      setPayloadModalOpen(true);
      return;
    }
    onSelect(value);
    setOpen(false);
  };

  const handleConfirmPayloadVariable = () => {
    if (!selectedPath.trim()) return;
    const cleanPath = selectedPath.replace(/^\{+/, "").replace(/\}+$/, "").trim();
    const formatted = isGroup ? `{{${cleanPath}}}` : `{${cleanPath}}`;
    onSelect(formatted);
    setPayloadModalOpen(false);
    toast.success(`Variável ${formatted} inserida!`);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-colors">
                  <Braces className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Inserir variável / Entrada de dados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <PopoverContent className="w-[360px] p-0 shadow-2xl border-border/80 rounded-2xl overflow-hidden z-[9999]" align="end">
          <Command>
            <CommandInput placeholder="Pesquisar variável..." />
            <CommandList className="max-h-[320px] scrollbar-thin">
              <CommandEmpty>Nenhuma variável encontrada.</CommandEmpty>
              {baseVariables.map((group) => (
                <CommandGroup key={group.category} heading={group.category}>
                  {group.items.map((item: any) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.value}
                        value={`${item.label} ${item.value}`}
                        onSelect={() => handleSelectVariableItem(item.value)}
                        className={cn(
                          "cursor-pointer flex items-center justify-between py-2 px-2.5 rounded-lg transition-colors",
                          item.highlight && "bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={cn("h-4 w-4 shrink-0", item.highlight ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate text-xs">{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-sm">
                            <Sparkles className="h-2.5 w-2.5" />
                            {item.badge}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted/80 px-1.5 py-0.5 rounded shrink-0">
                            {item.value}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              <div className="p-1.5 border-t border-border/40 bg-muted/20">
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setNewFieldOpen(true);
                  }}
                  className="cursor-pointer flex items-center justify-center text-xs text-primary font-semibold bg-primary/5 hover:bg-primary/10 rounded-lg py-1.5"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar novo campo
                </CommandItem>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Modal: Explorador de Entrada de Dados / Webhook Payload */}
      <Dialog open={payloadModalOpen} onOpenChange={setPayloadModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-6 rounded-2xl gap-4">
          <DialogHeader className="shrink-0 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Webhook className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Entrada de dados da requisição ({triggerName})
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione as propriedades recebidas no payload para usar diretamente como variáveis sem precisar mapeá-las manualmente.
            </DialogDescription>
          </DialogHeader>

          {/* Selected Variable Preview Input */}
          <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20 shrink-0">
            <Label className="text-[11px] font-bold text-primary flex items-center gap-1.5">
              <Braces className="h-3.5 w-3.5" /> Variável que será inserida:
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={selectedPath ? (isGroup ? `{{${selectedPath}}}` : `{${selectedPath}}`) : ""}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^\{+/, "").replace(/\}+$/, "").trim();
                    setSelectedPath(clean);
                  }}
                  placeholder="Ex: {{body.nome}}"
                  className="font-mono text-xs font-bold h-9 bg-background border-primary/30 text-primary"
                />
              </div>
              <Button
                type="button"
                onClick={handleConfirmPayloadVariable}
                disabled={!selectedPath.trim()}
                className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-1.5 shrink-0"
              >
                <Check className="h-3.5 w-3.5" />
                Inserir
              </Button>
            </div>
          </div>

          {/* Tree / JSON Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between shrink-0 mb-2">
              <TabsList className="h-8 bg-muted/60 p-0.5 rounded-lg">
                <TabsTrigger value="tree" className="text-xs px-3 py-1 font-semibold data-[state=active]:bg-background">
                  <FileJson className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Estrutura Visual
                </TabsTrigger>
                <TabsTrigger value="json" className="text-xs px-3 py-1 font-semibold data-[state=active]:bg-background">
                  <Code className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Colar / Editar JSON
                </TabsTrigger>
              </TabsList>

              <span className="text-[10px] text-muted-foreground font-mono">
                {referencePayload ? "🟢 Usando payload de referência" : "⚪ Exemplo padrão"}
              </span>
            </div>

            <TabsContent value="tree" className="flex-1 overflow-y-auto border border-border/40 rounded-xl p-3 bg-muted/10 min-h-[220px] max-h-[340px] scrollbar-thin">
              <JsonPayloadTree 
                data={currentPayload} 
                onSelectPath={(path) => setSelectedPath(path)} 
                selectedPath={selectedPath}
              />
            </TabsContent>

            <TabsContent value="json" className="flex-1 flex flex-col space-y-2 min-h-[220px] max-h-[340px]">
              <Textarea
                placeholder="Cole o JSON de exemplo aqui..."
                value={customJsonText || (referencePayload ? JSON.stringify(referencePayload, null, 2) : JSON.stringify(DEFAULT_SAMPLE_PAYLOAD, null, 2))}
                onChange={(e) => setCustomJsonText(e.target.value)}
                className="flex-1 font-mono text-xs p-3 rounded-xl resize-none bg-muted/10 border-border/40 leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Cole o JSON de uma requisição teste recebida para que os campos reais fiquem disponíveis na árvore visual.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="shrink-0 pt-2 border-t border-border/30">
            <Button variant="outline" onClick={() => setPayloadModalOpen(false)} className="text-xs">
              Fechar
            </Button>
            <Button onClick={handleConfirmPayloadVariable} disabled={!selectedPath.trim()} className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
              Confirmar e Inserir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar Novo Campo Personalizado */}
      <Dialog open={newFieldOpen} onOpenChange={setNewFieldOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Campo</DialogTitle>
            <DialogDescription>
              Adicione um novo campo personalizado para usar como variável em suas mensagens.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Campo</Label>
              <Input 
                id="name" 
                placeholder="Ex: Data de Vencimento" 
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateField()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFieldOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateField} disabled={!newFieldName.trim()}>
              Adicionar Campo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
