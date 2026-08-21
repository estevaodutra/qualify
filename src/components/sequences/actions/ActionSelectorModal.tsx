import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Zap, Search, Info, AlertTriangle } from "lucide-react";
import { ACTION_CATEGORIES, ACTION_REGISTRY, ActionCategory, ActionDefinition } from "./actionRegistry";
import { cn } from "@/lib/utils";

interface ActionSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAction: (action: ActionDefinition) => void;
}

export const ActionSelectorModal: React.FC<ActionSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelectAction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>("lead");
  const [searchTerm, setSearchTerm] = useState("");

  const activeCategoryInfo = ACTION_CATEGORIES.find((c) => c.id === selectedCategory);

  const availableActions = Object.values(ACTION_REGISTRY).filter((act) => {
    if (act.category !== selectedCategory) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      act.label.toLowerCase().includes(term) ||
      act.description.toLowerCase().includes(term)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl gap-0 border-border/40">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                Selecione a Ação do Workflow
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                {activeCategoryInfo?.description || "Escolha uma categoria e a operação desejada para o CRM"}
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
            {ACTION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left",
                  selectedCategory === cat.id
                    ? "bg-amber-500 text-white shadow-sm font-semibold"
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

          {/* Right Column: Actions list */}
          <div className="flex-1 flex flex-col p-4 bg-white overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Actions list */}
            {activeCategoryInfo?.available ? (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {availableActions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhuma ação encontrada.
                  </div>
                ) : (
                  availableActions.map((act) => (
                    <div
                      key={act.type}
                      onClick={() => {
                        onSelectAction(act);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "group border rounded-xl p-3.5 transition-all cursor-pointer flex items-start justify-between gap-3",
                        act.isDestructive
                          ? "border-rose-100 hover:border-rose-300 bg-rose-50/20 hover:bg-rose-50/50"
                          : "border-slate-100 hover:border-amber-200 hover:bg-amber-50/30"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={cn(
                              "text-xs font-bold transition-colors",
                              act.isDestructive
                                ? "text-rose-700 group-hover:text-rose-800"
                                : "text-slate-800 group-hover:text-amber-600"
                            )}
                          >
                            {act.label}
                          </h4>
                          {act.isDestructive && (
                            <Badge className="bg-rose-500 text-white text-[9px] px-1.5 py-0 font-bold border-none shadow-none flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" /> Destrutiva
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {act.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-center">
                        <span
                          className={cn(
                            "text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity",
                            act.isDestructive ? "text-rose-600" : "text-amber-600"
                          )}
                        >
                          Selecionar
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-all group-hover:translate-x-0.5",
                            act.isDestructive ? "text-rose-400 group-hover:text-rose-600" : "text-slate-400 group-hover:text-amber-600"
                          )}
                        />
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
                  A categoria <strong>{activeCategoryInfo?.label}</strong> estará disponível em breve. Utilize as categorias <strong>Leads</strong> e <strong>Negócios</strong> para automações de CRM.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
