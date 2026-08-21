import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, UserCheck, Search, Info } from "lucide-react";
import { CONDITION_CATEGORIES, CONDITION_REGISTRY, ConditionCategory, ConditionDefinition } from "./conditionRegistry";
import { cn } from "@/lib/utils";

interface ConditionSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCondition: (condition: ConditionDefinition) => void;
}

export const ConditionSelectorModal: React.FC<ConditionSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelectCondition,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ConditionCategory>("lead");
  const [searchTerm, setSearchTerm] = useState("");

  const activeCategoryInfo = CONDITION_CATEGORIES.find((c) => c.id === selectedCategory);

  const availableConditions = Object.values(CONDITION_REGISTRY).filter((cond) => {
    if (cond.category !== selectedCategory) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      cond.label.toLowerCase().includes(term) ||
      cond.description.toLowerCase().includes(term)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl gap-0 border-border/40">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                Selecione a Condição
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {activeCategoryInfo?.description || "Escolha uma categoria e a regra desejada para o fluxo"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-[420px] max-h-[540px]">
          {/* Left Column: Categories */}
          <div className="w-56 border-r border-slate-100 bg-slate-50/30 p-3 space-y-1 shrink-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">
              Categorias
            </p>
            {CONDITION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left",
                  selectedCategory === cat.id
                    ? "bg-purple-600 text-white shadow-sm font-semibold"
                    : cat.available
                    ? "text-slate-700 hover:bg-slate-100/80"
                    : "text-slate-400 hover:bg-slate-50 cursor-not-allowed opacity-60"
                )}
              >
                <span>{cat.label}</span>
                {!cat.available ? (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-200 text-slate-400">
                    Em breve
                  </Badge>
                ) : selectedCategory === cat.id ? (
                  <ChevronRight className="h-4 w-4 text-white" />
                ) : null}
              </button>
            ))}
          </div>

          {/* Right Column: Conditions list */}
          <div className="flex-1 flex flex-col p-4 bg-white overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar condição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Conditions list */}
            {activeCategoryInfo?.available ? (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {availableConditions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhuma condição encontrada.
                  </div>
                ) : (
                  availableConditions.map((cond) => (
                    <div
                      key={cond.type}
                      onClick={() => {
                        onSelectCondition(cond);
                        onOpenChange(false);
                      }}
                      className="group border border-slate-100 hover:border-purple-200 rounded-xl p-3.5 hover:bg-purple-50/30 transition-all cursor-pointer flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                          {cond.label}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {cond.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-center">
                        <span className="text-[10px] text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Selecionar
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Info className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">Categoria em Desenvolvimento</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                  A categoria <strong>{activeCategoryInfo?.label}</strong> estará disponível em breve. Utilize a categoria <strong>Leads</strong> para criar condições de público e negócios.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
