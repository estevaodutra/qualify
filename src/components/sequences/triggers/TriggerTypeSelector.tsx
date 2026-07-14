import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TriggerDefinition, TriggerEngine, TriggerCategory } from "./types";
import { TRIGGER_CATEGORY_LABELS, TRIGGER_CATEGORY_ORDER } from "./types";
import { getTriggerDefinitionsForEngine } from "./triggerDefinitions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Briefcase, User, MessageCircle, Instagram, Facebook, 
  List, Globe, Settings, Calendar, Plus, ArrowRight
} from "lucide-react";

interface TriggerTypeSelectorProps {
  engine: TriggerEngine;
  value: string;
  onChange: (type: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraDefinitions?: TriggerDefinition[];
}

const CATEGORY_ICONS: Record<TriggerCategory, React.ElementType> = {
  negocios: Briefcase,
  leads: User,
  mensagens: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  campos: List,
  http: Globe,
  sistema: Settings,
  atividades: Calendar
};

export function TriggerTypeSelector({ 
  engine, 
  value, 
  onChange, 
  open, 
  onOpenChange,
  extraDefinitions = [] 
}: TriggerTypeSelectorProps) {
  const definitions = [...getTriggerDefinitionsForEngine(engine), ...extraDefinitions];
  
  // Agrupar e filtrar apenas categorias que possuem itens
  const byCategory = TRIGGER_CATEGORY_ORDER.map((category) => ({
    category,
    items: definitions.filter((d) => d.category === category),
  })).filter((group) => group.items.length > 0);

  // Selecionar a primeira categoria disponível por padrão, ou a categoria do gatilho atual
  const currentTriggerCategory = definitions.find(d => d.type === value)?.category;
  
  const [activeCategory, setActiveCategory] = useState<TriggerCategory | null>(null);

  useEffect(() => {
    if (open) {
      if (currentTriggerCategory) {
        setActiveCategory(currentTriggerCategory);
      } else if (byCategory.length > 0) {
        setActiveCategory(byCategory[0].category);
      }
    }
  }, [open, currentTriggerCategory]);

  const activeGroup = byCategory.find(g => g.category === activeCategory);

  const handleSelect = (type: string) => {
    onChange(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[860px] p-0 gap-0 overflow-hidden bg-slate-50 flex h-[600px] max-h-[85vh]">
        {/* Sidebar (Categorias) */}
        <div className="w-[240px] bg-slate-100/50 border-r flex flex-col h-full shrink-0">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold text-slate-800">Gatilhos</h2>
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-1">
            {byCategory.map(({ category }) => {
              const Icon = CATEGORY_ICONS[category];
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    isActive 
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" 
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{TRIGGER_CATEGORY_LABELS[category]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content (Gatilhos) */}
        <div className="flex-1 flex flex-col h-full bg-white">
          <DialogHeader className="px-8 py-6 border-b shrink-0 bg-white">
            <DialogTitle className="text-xl font-bold text-slate-800">
              {activeCategory ? TRIGGER_CATEGORY_LABELS[activeCategory] : "Selecione uma categoria"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Adicione gatilhos para acionar sua automação
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {activeGroup?.items.map((def) => {
                const Icon = def.icon;
                const isSelected = value === def.type;
                const isAvailable = def.status === "available";
                
                return (
                  <button
                    key={def.type}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => isAvailable && handleSelect(def.type)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border text-left transition-all bg-white group",
                      isAvailable ? "hover:border-primary/40 hover:shadow-sm" : "opacity-50 cursor-not-allowed",
                      isSelected && isAvailable ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <ArrowRight className="h-5 w-5 text-primary" />
                      ) : (
                        <Plus className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">{def.label}</span>
                        {!isAvailable && (
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider shrink-0 bg-slate-100 text-slate-500 border-slate-200">
                            Em breve
                          </Badge>
                        )}
                        {isSelected && isAvailable && (
                          <Badge variant="default" className="text-[9px] font-bold uppercase tracking-wider shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{def.description}</p>
                    </div>
                  </button>
                );
              })}
              
              {activeGroup?.items.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm italic">
                  Nenhum gatilho disponível nesta categoria.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
