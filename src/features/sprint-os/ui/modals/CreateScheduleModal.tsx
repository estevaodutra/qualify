/**
 * Modal de Criação de Cronograma.
 * Especificação: Master Prompt v9.0 — Seção 5.
 * Oferece duas opções claras:
 * A) Cronograma em Branco (100% vazio, sem etapas predefinidas)
 * B) Utilizar Template (Importa estrutura oficial ou salva)
 */

import React, { useState } from "react";
import {
  Rocket,
  FilePlus,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useCompany } from "@/contexts/CompanyContext";

export const CreateScheduleModal: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    templatesList,
    createBlank,
    createFromTemplateAction,
  } = useSprintOSStore();

  const [mode, setMode] = useState<"blank" | "template">("blank");
  const [name, setName] = useState("Implementação Comercial");
  const [client, setClient] = useState("Cliente");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("seed_percurso_da_vida");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (mode === "blank") {
        await createBlank(name.trim(), client.trim() || "Cliente", activeCompanyId);
      } else {
        await createFromTemplateAction(selectedTemplateId, name.trim(), client.trim() || "Cliente", activeCompanyId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent className="bg-card border border-border text-card-foreground shadow-2xl max-w-lg p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Rocket className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Sprint OS</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">Criar Novo Cronograma</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Escolha se deseja começar uma estrutura do zero ou acelerar com um modelo pronto.
          </p>
        </DialogHeader>

        {/* Escolha do Modo: Em Branco vs Template */}
        <div className="grid grid-cols-2 gap-3 my-3">
          <button
            type="button"
            onClick={() => setMode("blank")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              mode === "blank"
                ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-sm"
                : "bg-muted/40 border-border text-muted-foreground hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <FilePlus className={`h-4 w-4 ${mode === "blank" ? "text-primary" : "text-muted-foreground"}`} />
              {mode === "blank" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            </div>
            <div className="text-xs font-bold text-foreground">Em Branco</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              100% limpo, sem tarefas ou etapas iniciais.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("template")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              mode === "template"
                ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-sm"
                : "bg-muted/40 border-border text-muted-foreground hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Sparkles className={`h-4 w-4 ${mode === "template" ? "text-primary" : "text-muted-foreground"}`} />
              {mode === "template" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            </div>
            <div className="text-xs font-bold text-foreground">Utilizar Template</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              Importa estrutura pronta (ex: Sprint 10 Dias).
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "template" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Selecionar Modelo</Label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-background border-input text-foreground text-xs focus:outline-none focus:border-primary"
              >
                {templatesList.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.stageCount} etapas · {tpl.taskCount} tarefas)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome do Cronograma / Sprint</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Colocar a Máquina para Rodar"
              className="h-9 text-xs bg-background border-input text-foreground rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Projeto / Cliente</Label>
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Ex: Percurso da Vida — Pablo e Flávia"
              className="h-9 text-xs bg-background border-input text-foreground rounded-xl"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="text-xs bg-primary hover:bg-primary/90 text-foreground font-medium px-4 h-9 rounded-xl flex items-center gap-1.5"
            >
              <span>{mode === "blank" ? "Criar Cronograma em Branco" : "Criar a partir do Template"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
