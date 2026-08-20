import { useState, useMemo, useEffect } from "react";
import { 
  Braces, Plus, Search, X, ChevronRight, ChevronDown, RefreshCw
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toCanonicalPayload } from "@/lib/workflows/canonicalPayload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  isGroup?: boolean;
  referencePayload?: any;
  triggerName?: string;
}

// Componente recursivo para listar e selecionar propriedades do JSON (estilo Data Trace)
function JsonExplorerList({ 
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
    const isSelected = selectedPath === currentPath || selectedPath === `{{${currentPath}}}` || selectedPath === `{${currentPath}}`;
    return (
      <div 
        onClick={() => onSelectPath(currentPath)}
        className={cn(
          "text-xs py-1.5 px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between group",
          isSelected 
            ? "bg-[#8A3CFF]/15 text-slate-800 font-semibold" 
            : "hover:bg-slate-100 text-slate-700"
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <span className="font-semibold text-[#8A3CFF] shrink-0">{currentPath.split('.').pop()}:</span>
          <span className="text-slate-500 truncate">{String(data)}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectPath(currentPath);
          }}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ml-2 transition-colors",
            isSelected 
              ? "bg-[#8A3CFF] text-white" 
              : "text-[#8A3CFF] bg-[#8A3CFF]/10 group-hover:bg-[#8A3CFF]/20"
          )}
        >
          Selecionar
        </button>
      </div>
    );
  }

  const entries = Object.entries(data);

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        const isPrimitive = typeof value !== "object" || value === null;
        const isCollapsed = !!collapsedKeys[key];
        const isSelected = selectedPath === fullPath || selectedPath === `{{${fullPath}}}` || selectedPath === `{${fullPath}}`;

        if (isPrimitive) {
          return (
            <div 
              key={fullPath}
              onClick={() => onSelectPath(fullPath)}
              className={cn(
                "text-xs py-1.5 px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between group",
                isSelected 
                  ? "bg-[#8A3CFF]/15 text-slate-800 font-semibold" 
                  : "hover:bg-slate-100 text-slate-700"
              )}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="font-semibold text-[#8A3CFF] shrink-0">{key}:</span>
                <span className="text-slate-500 truncate max-w-[320px]">
                  {value === null ? "null" : typeof value === "string" ? `"${value}"` : String(value)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPath(fullPath);
                }}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ml-2 transition-colors",
                  isSelected 
                    ? "bg-[#8A3CFF] text-white" 
                    : "text-[#8A3CFF] bg-[#8A3CFF]/10 group-hover:bg-[#8A3CFF]/20"
                )}
              >
                Selecionar
              </button>
            </div>
          );
        }

        return (
          <div key={fullPath} className="space-y-1 my-1">
            <div 
              onClick={(e) => toggleCollapse(key, e)}
              className="flex items-center justify-between px-2 py-1 bg-slate-100/60 hover:bg-slate-100 cursor-pointer rounded-lg transition-colors select-none text-xs font-bold text-slate-700"
            >
              <div className="flex items-center gap-1.5">
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                <span>{key}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPath(fullPath);
                }}
                className="text-[10px] font-bold text-[#8A3CFF] hover:bg-[#8A3CFF]/10 px-1.5 py-0.5 rounded"
              >
                Selecionar
              </button>
            </div>
            {!isCollapsed && (
              <div className="pl-3 border-l-2 border-slate-100 ml-1.5 space-y-1">
                <JsonExplorerList 
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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("campos_lead");
  
  // Estado do Modal "Dado de entrada da api" (Data Trace)
  const [payloadModalOpen, setPayloadModalOpen] = useState(false);
  const [tempValue, setTempValue] = useState<string>("");
  const [isLoadingPayload, setIsLoadingPayload] = useState(false);

  // Payload real carregado
  const [fetchedPayload, setFetchedPayload] = useState<any>(null);

  // Estado para criar novo campo
  const [newFieldOpen, setNewFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [localCustomFields, setLocalCustomFields] = useState<Array<{ label: string; value: string }>>([]);

  // Busca payload real do banco caso não tenha sido passado como prop
  const fetchRealPayload = async () => {
    if (referencePayload && typeof referencePayload === "object" && Object.keys(referencePayload).length > 0) {
      setFetchedPayload(toCanonicalPayload(referencePayload));
      return;
    }

    setIsLoadingPayload(true);
    try {
      // 1. Tenta última execução de workflow
      const { data: wfData } = await supabase
        .from("workflow_executions")
        .select("trigger_payload")
        .not("trigger_payload", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (wfData?.trigger_payload && typeof wfData.trigger_payload === "object" && Object.keys(wfData.trigger_payload).length > 0) {
        setFetchedPayload(toCanonicalPayload(wfData.trigger_payload));
        setIsLoadingPayload(false);
        return;
      }

      // 2. Tenta última execução de sequência
      const { data: seqData } = await supabase
        .from("sequence_executions")
        .select("trigger_context")
        .not("trigger_context", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seqData?.trigger_context && typeof seqData.trigger_context === "object" && Object.keys(seqData.trigger_context).length > 0) {
        setFetchedPayload(toCanonicalPayload(seqData.trigger_context));
        setIsLoadingPayload(false);
        return;
      }

      // 3. Tenta último evento de webhook gravado
      const { data: hookData } = await supabase
        .from("webhook_events")
        .select("raw_event")
        .not("raw_event", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (hookData?.raw_event && typeof hookData.raw_event === "object" && Object.keys(hookData.raw_event).length > 0) {
        setFetchedPayload(toCanonicalPayload(hookData.raw_event));
        setIsLoadingPayload(false);
        return;
      }

      setFetchedPayload(null);
    } catch (err) {
      console.error("Erro ao buscar payload real em VariablePicker:", err);
      setFetchedPayload(null);
    } finally {
      setIsLoadingPayload(false);
    }
  };

  useEffect(() => {
    if (open || payloadModalOpen) {
      fetchRealPayload();
    }
  }, [open, payloadModalOpen, referencePayload]);

  const currentPayload = useMemo(() => {
    if (referencePayload && typeof referencePayload === "object" && Object.keys(referencePayload).length > 0) {
      return toCanonicalPayload(referencePayload);
    }
    return fetchedPayload;
  }, [referencePayload, fetchedPayload]);

  // Lista de Categorias e Itens
  const categories = useMemo(() => {
    const list: Array<{ id: string; label: string; items: Array<{ label: string; value: string; isApiInput?: boolean }> }> = [
      {
        id: "campos_lead",
        label: isGroup ? "Campos do contato" : "Campos do lead",
        items: isGroup ? [
          { label: "Nome completo do lead", value: "{{name}}" },
          { label: "Telefone do lead", value: "{{phone}}" },
        ] : [
          { label: "Nome completo do lead", value: "{nome}" },
          { label: "Primeiro nome do lead", value: "{primeiro_nome}" },
          { label: "Telefone do lead", value: "{telefone}" },
          { label: "Email do lead", value: "{email}" },
          { label: "CPF do lead", value: "{cpf}" },
          { label: "CEP do lead", value: "{cep}" },
          { label: "Endereço do lead", value: "{endereco}" },
          { label: "Cidade do lead", value: "{cidade}" },
        ]
      },
      ...(isGroup ? [{
        id: "info_grupo",
        label: "Informações do grupo",
        items: [
          { label: "Nome do grupo", value: "{{group_name}}" },
          { label: "ID do grupo", value: "{{group_id}}" },
          { label: "Descrição do grupo", value: "{{group_description}}" },
        ]
      }] : []),
      {
        id: "campos_negocio",
        label: "Campos do negócio",
        items: [
          { label: "ID do negócio", value: isGroup ? "{{deal_id}}" : "{deal_id}" },
          { label: "Título do negócio", value: isGroup ? "{{deal_title}}" : "{deal_title}" },
          { label: "Valor do negócio", value: isGroup ? "{{deal_value}}" : "{deal_value}" },
          { label: "Status da etapa", value: isGroup ? "{{deal_stage}}" : "{deal_stage}" },
        ]
      },
      {
        id: "campos_produto",
        label: "Campos do produto",
        items: [
          { label: "Nome do produto", value: isGroup ? "{{product_name}}" : "{product_name}" },
          { label: "Valor do produto", value: isGroup ? "{{product_price}}" : "{product_price}" },
          { label: "Código SKU", value: isGroup ? "{{product_sku}}" : "{product_sku}" },
        ]
      },
      {
        id: "campos_conversa",
        label: "Campos da conversa",
        items: [
          { label: "ID da conversa", value: isGroup ? "{{conversation_id}}" : "{conversation_id}" },
          { label: "Nome do operador", value: isGroup ? "{{operator_name}}" : "{operator_name}" },
          { label: "Última mensagem", value: isGroup ? "{{last_message}}" : "{last_message}" },
        ]
      },
      {
        id: "campos_adic_lead",
        label: "Campos adicionais do lead",
        items: [
          { label: "Campo personalizado (exemplo)", value: isGroup ? "{{campo_customizado}}" : "{campo_customizado}" },
          ...localCustomFields
        ]
      },
      {
        id: "campos_adic_negocio",
        label: "Campos adicionais do negócio",
        items: [
          { label: "Observações do negócio", value: isGroup ? "{{deal_notes}}" : "{deal_notes}" },
          { label: "Origem do negócio", value: isGroup ? "{{deal_source}}" : "{deal_source}" },
        ]
      },
      {
        id: "campos_adic_empresa",
        label: "Campos adicionais da empresa",
        items: [
          { label: "Nome da empresa", value: isGroup ? "{{company_name}}" : "{company_name}" },
          { label: "Telefone da empresa", value: isGroup ? "{{company_phone}}" : "{company_phone}" },
        ]
      },
      {
        id: "campos_sistema",
        label: "Campos do sistema",
        items: [
          { label: "Data atual", value: isGroup ? "{{current_date}}" : "{current_date}" },
          { label: "Hora atual", value: isGroup ? "{{current_time}}" : "{current_time}" },
          { label: "Dia da semana", value: isGroup ? "{{weekday}}" : "{weekday}" },
        ]
      },
      {
        id: "entrada_dados",
        label: "Entrada de dados",
        items: [
          { 
            label: triggerName || "Webhook 1", 
            value: "__OPEN_API_INPUT_MODAL__", 
            isApiInput: true 
          }
        ]
      }
    ];

    return list;
  }, [isGroup, triggerName, localCustomFields]);

  // Filtragem pela busca
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const lower = search.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => 
          item.label.toLowerCase().includes(lower) || 
          item.value.toLowerCase().includes(lower) ||
          cat.label.toLowerCase().includes(lower)
        )
      }))
      .filter(cat => cat.items.length > 0 || cat.label.toLowerCase().includes(lower));
  }, [categories, search]);

  const activeCategory = useMemo(() => {
    return filteredCategories.find(c => c.id === selectedCategory) || filteredCategories[0] || categories[0];
  }, [filteredCategories, selectedCategory, categories]);

  const handleCreateField = () => {
    if (!newFieldName.trim()) return;
    const slug = newFieldName
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
      
    const format = isGroup ? `{{${slug}}}` : `{${slug}}`;
    
    setLocalCustomFields(prev => [...prev, {
      label: newFieldName,
      value: format,
    }]);
    
    toast.success("Campo personalizado criado!");
    setNewFieldName("");
    setNewFieldOpen(false);
    setSelectedCategory("campos_adic_lead");
    setOpen(true);
  };

  const handleSelectItem = (item: { label: string; value: string; isApiInput?: boolean }) => {
    if (item.isApiInput || item.value === "__OPEN_API_INPUT_MODAL__") {
      setOpen(false);
      setTempValue("");
      setPayloadModalOpen(true);
      return;
    }
    onSelect(item.value);
    setOpen(false);
  };

  const handleSelectPayloadPath = (path: string) => {
    // Insere ou atualiza o campo com {{path}}
    const formatted = isGroup ? `{{${path}}}` : `{${path}}`;
    setTempValue(formatted);
  };

  const handleConfirmPayloadVariable = () => {
    if (!tempValue.trim()) return;
    let finalVal = tempValue.trim();
    if (!finalVal.startsWith("{") && !finalVal.endsWith("}")) {
      finalVal = isGroup ? `{{${finalVal}}}` : `{${finalVal}}`;
    }
    onSelect(finalVal);
    setPayloadModalOpen(false);
    toast.success(`Variável ${finalVal} inserida!`);
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
              <p>Inserir variável</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Popover em 2 colunas no estilo Data Trace */}
        <PopoverContent className="w-[520px] p-0 shadow-2xl border border-slate-200 rounded-xl overflow-hidden bg-white z-[9999]" align="end">
          {/* Header de Pesquisa */}
          <div className="p-2.5 border-b border-slate-100 flex items-center gap-2 bg-white">
            <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full text-xs text-slate-700 bg-transparent border-0 outline-none placeholder:text-slate-400 font-normal"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2 Colunas */}
          <div className="flex h-[290px]">
            {/* Coluna Esquerda: Categorias */}
            <div className="w-[210px] border-r border-slate-100 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin bg-slate-50/50">
              {filteredCategories.map((cat) => {
                const isActive = activeCategory.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors flex items-center justify-between select-none",
                      isActive 
                        ? "bg-slate-200/70 font-semibold text-slate-900 shadow-sm" 
                        : "text-slate-600 hover:bg-slate-100/70"
                    )}
                  >
                    <span className="truncate">{cat.label}</span>
                    {cat.id === "entrada_dados" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Coluna Direita: Itens da Categoria Selecionada */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin bg-white">
              {activeCategory && activeCategory.items.length > 0 ? (
                activeCategory.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group",
                      item.isApiInput ? "text-slate-800 font-semibold hover:bg-blue-50/50" : "text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="text-slate-400 font-mono text-xs shrink-0">{`{ }`}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {!item.isApiInput && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.value}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Nenhum campo disponível.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNewFieldOpen(true);
              }}
              className="text-xs text-primary font-medium flex items-center gap-1.5 hover:underline px-2 py-1 rounded"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar novo campo
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Modal: Dado de entrada da api (Data Trace) */}
      <Dialog open={payloadModalOpen} onOpenChange={setPayloadModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl gap-6 shadow-2xl border border-slate-200">
          <DialogHeader className="p-0">
            <DialogTitle className="text-xl font-bold text-slate-800">
              Dado de entrada da api
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Seção: Valor selecionado */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Braces className="h-4 w-4 text-[#8A3CFF]" /> Valor selecionado
              </label>
              <p className="text-xs text-slate-500">Escreva ou selecione um valor do json</p>
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder="Ex: data.name"
                className="h-10 border-blue-400 focus-visible:ring-blue-500 rounded-lg text-sm bg-white font-mono"
              />
            </div>

            {/* Seção: Dados recebidos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Dados recebidos</label>
                <button
                  type="button"
                  onClick={fetchRealPayload}
                  className="text-xs text-slate-500 hover:text-primary flex items-center gap-1 transition-colors"
                  title="Atualizar dados recebidos"
                >
                  <RefreshCw className={cn("h-3 w-3", isLoadingPayload && "animate-spin")} />
                  Atualizar
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-[300px] flex flex-col shadow-inner">
                <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                  {`{ }`}
                </div>
                <div className="p-3 overflow-y-auto space-y-1">
                  {isLoadingPayload ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Carregando dados recebidos...
                    </div>
                  ) : currentPayload && Object.keys(currentPayload).length > 0 ? (
                    <JsonExplorerList 
                      data={currentPayload.body || currentPayload} 
                      onSelectPath={handleSelectPayloadPath}
                      selectedPath={tempValue}
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-500">Nenhum dado recebido ainda.</p>
                      <p className="text-[11px] text-slate-400">Envie uma requisição para o webhook para visualizar as variáveis reais aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end pt-2">
            <Button 
              type="button"
              onClick={handleConfirmPayloadVariable} 
              disabled={!tempValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 font-semibold h-9 shadow-sm"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar Novo Campo */}
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


