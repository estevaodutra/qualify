/**
 * Modal: 🚀 ATIVAR SPRINT (Camada A / Seção 9).
 * Registra a linha de base imutável do planejamento aprovado:
 * - Nome da sprint
 * - Data e hora inicial
 * - Total de dias úteis
 * - Prazo contratual
 * - Valor contratado
 */

import React, { useState } from "react";
import {
  Rocket,
  Lock,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { dateOf, nowInSaoPaulo } from "../../scheduler/time";

export const ActivateSprintModal: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    isActivateModalOpen,
    setIsActivateModalOpen,
    activateSprintAction,
  } = useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  const sprint = workspace.sprints[activeSprintId];
  const now = nowInSaoPaulo();

  const [name, setName] = useState(sprint?.name || "Sprint 01");
  const [startDate, setStartDate] = useState(sprint?.startDate || dateOf(now));
  const [startTime, setStartTime] = useState(sprint?.startTime || "09:00");
  const [businessDays, setBusinessDays] = useState(sprint?.businessDays || 10);
  const [contractValue, setContractValue] = useState(sprint?.contractValue || 2500);

  const handleActivate = async () => {
    await activateSprintAction({
      name,
      startDate,
      startTime,
      businessDays: Number(businessDays),
      contractValue: Number(contractValue),
      managerId: null,
    });
  };

  return (
    <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
      <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Rocket className="h-4 w-4" />
            <span className="text-xs uppercase font-black tracking-wider">
              Ativação Operacional
            </span>
          </div>
          <DialogTitle className="text-base font-black text-white">
            Ativar Sprint e Fixar Linha de Base
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            A ativação grava uma cópia imutável dos prazos e metas originais contratadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          <div>
            <label className="font-bold text-white/70 block mb-1">Nome da Sprint</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black border-white/10 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-white/70 block mb-1">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black border-white/10 text-white"
              />
            </div>
            <div>
              <label className="font-bold text-white/70 block mb-1">Horário Inicial</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-black border-white/10 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-white/70 block mb-1">Dias Úteis</label>
              <Input
                type="number"
                value={businessDays}
                onChange={(e) => setBusinessDays(Number(e.target.value))}
                className="bg-black border-white/10 text-white"
              />
            </div>
            <div>
              <label className="font-bold text-white/70 block mb-1">Valor Contratado (R$)</label>
              <Input
                type="number"
                value={contractValue}
                onChange={(e) => setContractValue(Number(e.target.value))}
                className="bg-black border-white/10 text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-white/70 text-[11px] flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Ao ativar, a linha de base original permanecerá gravada e servirá de comparativo para desvios em futuras revisões de cronograma.
            </span>
          </div>
        </div>

        <DialogFooter className="border-t border-white/5 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsActivateModalOpen(false)}
            className="text-xs text-white/50"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleActivate}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-900/40"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>Confirmar Ativação</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
