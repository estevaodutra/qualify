import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Check, Type, Hash, Calendar, ToggleLeft, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldItem {
  id: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean" | "select";
}

interface Category {
  id: string;
  label: string;
  fields: FieldItem[];
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "lead",
    label: "Campos do lead",
    fields: [
      { id: "lead.id", label: "ID do lead", type: "text" },
      { id: "lead.name", label: "Nome do lead", type: "text" },
      { id: "lead.first_name", label: "Primeiro nome do lead", type: "text" },
      { id: "lead.last_name", label: "Sobrenome do lead", type: "text" },
      { id: "lead.phone", label: "Telefone do lead", type: "text" },
      { id: "lead.email", label: "E-mail do lead", type: "text" },
      { id: "lead.document", label: "Documento do lead", type: "text" },
      { id: "lead.company", label: "Empresa do lead", type: "text" },
      { id: "lead.address.zipcode", label: "CEP do lead", type: "text" },
      { id: "lead.address.street", label: "Endereço do lead", type: "text" },
      { id: "lead.address.neighborhood", label: "Bairro do lead", type: "text" },
      { id: "lead.address.number", label: "Número de residência do lead", type: "text" },
      { id: "lead.address.city", label: "Cidade do lead", type: "text" },
      { id: "lead.address.state", label: "Estado do lead", type: "text" },
      { id: "lead.address.complement", label: "Complemento do lead", type: "text" },
      { id: "lead.source", label: "Origem do lead", type: "text" },
      { id: "lead.tags", label: "Tags do lead", type: "text" },
      { id: "lead.owner_id", label: "Responsável do lead", type: "text" },
    ]
  },
  {
    id: "deal",
    label: "Campos do negócio",
    fields: [
      { id: "deal.id", label: "ID do negócio", type: "text" },
      { id: "deal.title", label: "Título do negócio", type: "text" },
      { id: "deal.value", label: "Valor do negócio", type: "number" },
      { id: "deal.pipeline_id", label: "Pipeline do negócio", type: "text" },
      { id: "deal.stage_id", label: "Etapa do negócio", type: "text" },
      { id: "deal.status", label: "Status do negócio", type: "text" },
      { id: "deal.owner_id", label: "Responsável do negócio", type: "text" },
      { id: "deal.expected_close_date", label: "Data prevista de fechamento", type: "date" },
      { id: "deal.probability", label: "Probabilidade", type: "number" },
      { id: "deal.lost_reason", label: "Motivo de perda", type: "text" },
    ]
  },
  {
    id: "product",
    label: "Campos do produto",
    fields: [
      { id: "product.id", label: "ID do produto", type: "text" },
      { id: "product.name", label: "Nome do produto", type: "text" },
      { id: "product.sku", label: "SKU", type: "text" },
      { id: "product.price", label: "Preço", type: "number" },
      { id: "product.category", label: "Categoria", type: "text" },
      { id: "product.description", label: "Descrição", type: "text" },
      { id: "product.url", label: "URL", type: "text" },
      { id: "product.quantity", label: "Quantidade", type: "number" },
    ]
  },
  {
    id: "conversation",
    label: "Campos da conversa",
    fields: [
      { id: "conversation.id", label: "ID da conversa", type: "text" },
      { id: "conversation.channel", label: "Canal", type: "text" },
      { id: "conversation.instance_id", label: "Instância", type: "text" },
      { id: "conversation.phone", label: "Telefone da conversa", type: "text" },
      { id: "conversation.status", label: "Status da conversa", type: "text" },
      { id: "conversation.department_id", label: "Departamento", type: "text" },
      { id: "conversation.assigned_to", label: "Atendente", type: "text" },
    ]
  },
  {
    id: "custom_lead",
    label: "Campos adicionais do lead",
    fields: []
  },
  {
    id: "custom_deal",
    label: "Campos adicionais do negócio",
    fields: []
  },
  {
    id: "custom_company",
    label: "Campos adicionais da empresa",
    fields: []
  },
  {
    id: "system",
    label: "Campos do sistema",
    fields: [
      { id: "system.now", label: "Data e hora atual", type: "date" },
      { id: "system.date", label: "Data atual", type: "date" },
      { id: "system.time", label: "Hora atual", type: "text" },
      { id: "company.id", label: "ID da empresa", type: "text" },
      { id: "company.name", label: "Nome da empresa", type: "text" },
      { id: "workflow.id", label: "ID do workflow", type: "text" },
      { id: "workflow.name", label: "Nome do workflow", type: "text" },
      { id: "execution.id", label: "ID da execução", type: "text" },
      { id: "node.id", label: "ID do node atual", type: "text" },
    ]
  },
  {
    id: "variables",
    label: "Variáveis temporárias",
    fields: []
  }
];

interface DestinationFieldSelectorProps {
  value: string;
  onChange: (value: string, label?: string) => void;
  customFields?: any[]; // pass fetched custom fields here
}

export function DestinationFieldSelector({ value, onChange, customFields = [] }: DestinationFieldSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("lead");

  const categories = useMemo(() => {
    const cats = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)) as Category[];
    
    // Populate custom fields
    customFields.forEach(cf => {
      const type = cf.type as any;
      const fieldItem = { id: `custom.${cf.entity_type}.${cf.key}`, label: cf.name, type };
      if (cf.entity_type === "lead") cats.find(c => c.id === "custom_lead")?.fields.push(fieldItem);
      if (cf.entity_type === "deal") cats.find(c => c.id === "custom_deal")?.fields.push(fieldItem);
      if (cf.entity_type === "company") cats.find(c => c.id === "custom_company")?.fields.push(fieldItem);
    });

    return cats;
  }, [customFields]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    
    return categories.map(cat => ({
      ...cat,
      fields: cat.fields.filter(f => f.label.toLowerCase().includes(term) || f.id.toLowerCase().includes(term))
    })).filter(cat => cat.fields.length > 0 || cat.label.toLowerCase().includes(term));
  }, [categories, search]);

  const currentCategoryFields = useMemo(() => {
    if (search.trim()) {
      const activeHasResults = filteredCategories.find(c => c.id === activeCategory)?.fields.length > 0;
      if (!activeHasResults && filteredCategories.length > 0) {
        setActiveCategory(filteredCategories[0].id);
        return filteredCategories[0].fields;
      }
      return filteredCategories.find(c => c.id === activeCategory)?.fields || [];
    }
    return filteredCategories.find(c => c.id === activeCategory)?.fields || [];
  }, [filteredCategories, activeCategory, search]);

  const getIconForType = (type?: string) => {
    switch(type) {
      case "number": return <Hash className="h-3.5 w-3.5" />;
      case "date": return <Calendar className="h-3.5 w-3.5" />;
      case "boolean": return <ToggleLeft className="h-3.5 w-3.5" />;
      case "select": return <List className="h-3.5 w-3.5" />;
      default: return <Type className="h-3.5 w-3.5" />;
    }
  };

  const selectedLabel = useMemo(() => {
    for (const cat of categories) {
      const f = cat.fields.find(f => f.id === value);
      if (f) return f.label;
    }
    return value;
  }, [value, categories]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-slate-700 bg-white hover:bg-slate-50 rounded-xl border-slate-200 h-10 px-3"
        >
          <span className="truncate">{selectedLabel || "Selecionar destino..."}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0 rounded-xl overflow-hidden shadow-xl border border-slate-200" align="start">
        <div className="flex items-center px-3 border-b border-slate-100 bg-white">
          <Search className="h-4 w-4 shrink-0 opacity-50 text-slate-400" />
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-0 focus-visible:ring-0 bg-transparent text-sm placeholder:text-slate-400"
          />
        </div>
        <div className="flex h-[320px] bg-slate-50/50">
          <div className="w-[220px] border-r border-slate-100 overflow-y-auto py-2">
            {filteredCategories.map(cat => (
              <div 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-2 text-[11px] font-semibold cursor-pointer mx-2 rounded-lg transition-colors",
                  activeCategory === cat.id ? "bg-[#8A3CFF]/10 text-[#8A3CFF]" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {cat.label}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-1 bg-white">
            {currentCategoryFields.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400 mt-4">Nenhum campo encontrado.</div>
            ) : (
              currentCategoryFields.map(field => (
                <div
                  key={field.id}
                  onClick={() => {
                    onChange(field.id, field.label);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs cursor-pointer rounded-lg mx-1 hover:bg-slate-50 transition-colors group",
                    value === field.id && "bg-[#8A3CFF]/5 text-[#8A3CFF] font-semibold"
                  )}
                >
                  <div className="text-slate-400 group-hover:text-slate-600">
                    {getIconForType(field.type)}
                  </div>
                  <span className="flex-1 text-slate-700 font-medium">{field.label}</span>
                  {value === field.id && <Check className="h-3 w-3 text-[#8A3CFF]" />}
                </div>
              ))
            )}
            
            {activeCategory === "variables" && !search && (
               <div className="px-3 py-3 border-t mt-2">
                 <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed text-[#8A3CFF] hover:text-[#8A3CFF] hover:bg-[#8A3CFF]/5 font-semibold">
                   + Criar nova variável
                 </Button>
               </div>
            )}
            {(activeCategory === "custom_lead" || activeCategory === "custom_deal" || activeCategory === "custom_company") && !search && (
               <div className="px-3 py-3 border-t mt-2">
                 <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed text-[#8A3CFF] hover:text-[#8A3CFF] hover:bg-[#8A3CFF]/5 font-semibold">
                   + Criar novo campo
                 </Button>
               </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
