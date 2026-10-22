/**
 * BLOCO 02 — WEBINÁRIO (AJ-023).
 * Bloco independente no Cockpit Operacional com cinco métricas do funil do evento:
 * 01 — RECEBEU CONVITE (Convites recebidos)
 * 02 — CONFIRMOU PARTICIPAÇÃO (Confirmaram presença)
 * 03 — ENTROU AO VIVO (Entraram ao vivo)
 * 04 — FICOU ATÉ O FINAL (Até o final)
 * 05 — COMPROU (Compraram)
 *
 * Taxas de conversão automáticas, seleção por edição do evento, consistência e rastreabilidade.
 */

import React, { useState } from "react";
import {
  Video,
  Plus,
  Minus,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  Clock,
  UserCheck,
  Send,
  Edit2,
  Check,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWebinarData,
  updateWebinarMetric,
  selectWebinarEdition,
  createWebinarEdition,
} from "../../domain/ops";
import type {
  DashboardBlockConfig,
  DashboardCardConfig,
  WebinarEdition,
} from "../../domain/types";
import { fmtDateTime } from "../../scheduler/time";
import { toast } from "sonner";

/**
 * Seletor de Edição do Webinário para ser exibido no cabeçalho do bloco
 */
export const WebinarEditionSelector: React.FC<{
  onOpenNewEdition: () => void;
}> = ({ onOpenNewEdition }) => {
  const { workspace, mutate } = useSprintOSStore();
  const { user } = useAuth();

  if (!workspace) return null;

  const webinarData = getWebinarData(workspace);
  const editions = Object.values(webinarData.editions || {});
  const activeId = webinarData.selectedEditionId || editions[0]?.id || "";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-1 bg-muted/80 border border-border px-1.5 py-0.5 rounded-lg">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <select
          value={activeId}
          onChange={(e) => {
            mutate((ws, ctx) => {
              selectWebinarEdition(ws, ctx, e.target.value);
            }, user?.email || "Operador");
          }}
          className="bg-transparent text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer"
          title="Selecione a edição do webinário"
        >
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id} className="bg-popover text-popover-foreground">
              {ed.title} {ed.eventDate ? `(${ed.eventDate})` : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onOpenNewEdition}
        className="h-6 px-2 text-[10px] font-bold rounded-lg border border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1 transition-all cursor-pointer"
        title="Cadastrar nova edição de webinário"
      >
        <Plus className="h-3 w-3" />
        <span>Nova Edição</span>
      </button>
    </div>
  );
};

interface WebinarBlockProps {
  block: DashboardBlockConfig;
  cards: DashboardCardConfig[];
  isNewEditionModalOpen?: boolean;
  onCloseNewEditionModal?: () => void;
  onOpenNewEditionModal?: () => void;
}

export const WebinarBlock: React.FC<WebinarBlockProps> = ({
  cards,
  isNewEditionModalOpen: externalModalOpen,
  onCloseNewEditionModal,
}) => {
  const { workspace, mutate } = useSprintOSStore();
  const { user } = useAuth();

  // Modal para criar nova edição do webinário
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = (open: boolean) => {
    if (externalModalOpen !== undefined && onCloseNewEditionModal) {
      if (!open) onCloseNewEditionModal();
    } else {
      setInternalModalOpen(open);
    }
  };

  const [newEditionTitle, setNewEditionTitle] = useState("");
  const [newEditionDate, setNewEditionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Edição direta de número inline
  const [editingMetricKey, setEditingMetricKey] = useState<string | null>(null);
  const [editingValueInput, setEditingValueInput] = useState("");

  if (!workspace) return null;

  const webinarData = getWebinarData(workspace);
  const editions = Object.values(webinarData.editions || {});
  const activeEdition: WebinarEdition =
    webinarData.editions[webinarData.selectedEditionId] ||
    editions[0] || {
      id: "default",
      projectId: workspace.project.id,
      title: "Webinário PVD #1 — Ao Vivo",
      eventDate: new Date().toISOString().slice(0, 10),
      period: "all",
      metrics: {
        invites: { value: 0, source: "manual" },
        confirmed: { value: 0, source: "manual" },
        liveAttendance: { value: 0, source: "manual" },
        retention: { value: 0, source: "manual" },
        buyers: { value: 0, source: "manual" },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  const m = activeEdition.metrics;
  const invitesVal = m.invites?.value ?? 0;
  const confirmedVal = m.confirmed?.value ?? 0;
  const liveVal = m.liveAttendance?.value ?? 0;
  const retentionVal = m.retention?.value ?? 0;
  const buyersVal = m.buyers?.value ?? 0;

  // -------------------------------------------------------------
  // CÁLCULO DAS TAXAS DO FUNIL DE CONVERSÃO (SEÇÃO 4 DO AJ-023)
  // Regra estrita: Quando denominador for 0 ou inexistente, exibir "—".
  // Não apresentar 0% quando não existir dado suficiente.
  // -------------------------------------------------------------
  const confirmationRate =
    invitesVal > 0 ? `${((confirmedVal / invitesVal) * 100).toFixed(1)}%` : "—";

  const liveRate =
    confirmedVal > 0 ? `${((liveVal / confirmedVal) * 100).toFixed(1)}%` : "—";

  const retentionRate =
    liveVal > 0 ? `${((retentionVal / liveVal) * 100).toFixed(1)}%` : "—";

  const liveConversionRate =
    liveVal > 0 ? `${((buyersVal / liveVal) * 100).toFixed(1)}%` : "—";

  const overallConversionRate =
    invitesVal > 0 ? `${((buyersVal / invitesVal) * 100).toFixed(1)}%` : "—";

  // -------------------------------------------------------------
  // VERIFICAÇÕES DE CONSISTÊNCIA (SEÇÃO 7 DO AJ-023)
  // Preserva valores legítimos e sinaliza com aviso visual amigável.
  // -------------------------------------------------------------
  const hasConfirmationInconsistency =
    invitesVal > 0 && confirmedVal > invitesVal;
  const hasRetentionInconsistency = liveVal > 0 && retentionVal > liveVal;

  // Atualização rápida de métrica (+1, -1, ou valor direto)
  const handleDelta = async (
    metricKey: keyof WebinarEdition["metrics"],
    delta: number
  ) => {
    const current = activeEdition.metrics[metricKey]?.value ?? 0;
    const nextVal = Math.max(0, current + delta);
    await mutate((ws, ctx) => {
      updateWebinarMetric(
        ws,
        ctx,
        activeEdition.id,
        metricKey,
        nextVal,
        "manual"
      );
    }, user?.email || "Operador");
  };

  const handleStartInlineEdit = (
    metricKey: keyof WebinarEdition["metrics"],
    currentVal: number
  ) => {
    setEditingMetricKey(metricKey);
    setEditingValueInput(String(currentVal));
  };

  const handleCommitInlineEdit = async (
    metricKey: keyof WebinarEdition["metrics"]
  ) => {
    const parsed = parseInt(editingValueInput, 10);
    const nextVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    await mutate((ws, ctx) => {
      updateWebinarMetric(
        ws,
        ctx,
        activeEdition.id,
        metricKey,
        nextVal,
        "manual"
      );
    }, user?.email || "Operador");
    setEditingMetricKey(null);
    toast.success("Métrica atualizada!");
  };

  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditionTitle.trim()) return;
    await mutate((ws, ctx) => {
      createWebinarEdition(ws, ctx, newEditionTitle.trim(), newEditionDate);
    }, user?.email || "Operador");
    setModalOpen(false);
    setNewEditionTitle("");
    toast.success("Nova edição de webinário criada!");
  };

  // Configuração dos 5 Cards Obrigatórios
  const CARDS_CONFIG: Record<
    string,
    {
      metricKey: keyof WebinarEdition["metrics"];
      defaultTitle: string;
      desc: string;
      icon: React.ReactNode;
      colorClass: string;
    }
  > = {
    webinar_invites: {
      metricKey: "invites",
      defaultTitle: "Convites recebidos",
      desc: "Pessoas únicas que receberam o convite",
      icon: <Send className="h-3.5 w-3.5 text-blue-500" />,
      colorClass: "text-foreground",
    },
    webinar_confirmed: {
      metricKey: "confirmed",
      defaultTitle: "Confirmaram presença",
      desc: "Intenção de participar ao vivo",
      icon: <UserCheck className="h-3.5 w-3.5 text-indigo-500" />,
      colorClass: "text-indigo-600 dark:text-indigo-400",
    },
    webinar_live: {
      metricKey: "liveAttendance",
      defaultTitle: "Entraram ao vivo",
      desc: "Acessaram efetivamente o evento",
      icon: <Video className="h-3.5 w-3.5 text-amber-500" />,
      colorClass: "text-amber-600 dark:text-amber-400",
    },
    webinar_retention: {
      metricKey: "retention",
      defaultTitle: "Até o final",
      desc: "Permaneceram até o encerramento",
      icon: <Clock className="h-3.5 w-3.5 text-purple-500" />,
      colorClass: "text-purple-600 dark:text-purple-400",
    },
    webinar_buyers: {
      metricKey: "buyers",
      defaultTitle: "Compraram",
      desc: "Compras confirmadas no evento",
      icon: <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />,
      colorClass: "text-emerald-600 dark:text-emerald-400 font-black",
    },
  };

  // Garante os 5 cards obrigatórios caso o array esteja vazio
  const displayCards =
    cards && cards.length > 0
      ? cards
      : [
          { id: "webinar_invites", blockId: "webinario", title: "Convites recebidos", order: 0 },
          { id: "webinar_confirmed", blockId: "webinario", title: "Confirmaram presença", order: 1 },
          { id: "webinar_live", blockId: "webinario", title: "Entraram ao vivo", order: 2 },
          { id: "webinar_retention", blockId: "webinario", title: "Até o final", order: 3 },
          { id: "webinar_buyers", blockId: "webinario", title: "Compraram", order: 4 },
        ];

  return (
    <div className="space-y-2.5">
      {/* 1. BARRA COMPACTA DO FUNIL DE CONVERSÃO (TAXAS AJ-023) */}
      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>Funil do Webinário: {activeEdition.title}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[11px] font-mono">
            {/* Confirmação */}
            <div className="flex items-center gap-1 bg-background/60 px-1.5 py-0.5 rounded border border-border/40">
              <span className="text-muted-foreground font-sans text-[10px]">
                Confirmação:
              </span>
              <strong className="text-foreground">{confirmationRate}</strong>
            </div>

            <span className="text-muted-foreground/40">→</span>

            {/* Entrada */}
            <div className="flex items-center gap-1 bg-background/60 px-1.5 py-0.5 rounded border border-border/40">
              <span className="text-muted-foreground font-sans text-[10px]">
                Entrada:
              </span>
              <strong className="text-indigo-600 dark:text-indigo-400">
                {liveRate}
              </strong>
            </div>

            <span className="text-muted-foreground/40">→</span>

            {/* Retenção */}
            <div className="flex items-center gap-1 bg-background/60 px-1.5 py-0.5 rounded border border-border/40">
              <span className="text-muted-foreground font-sans text-[10px]">
                Retenção:
              </span>
              <strong className="text-purple-600 dark:text-purple-400">
                {retentionRate}
              </strong>
            </div>

            <span className="text-muted-foreground/40">→</span>

            {/* Conversão Participantes */}
            <div className="flex items-center gap-1 bg-background/60 px-1.5 py-0.5 rounded border border-border/40">
              <span className="text-muted-foreground font-sans text-[10px]">
                Conv. Participantes:
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                {liveConversionRate}
              </strong>
            </div>

            <span className="text-muted-foreground/40">•</span>

            {/* Conversão Geral */}
            <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <span className="text-muted-foreground font-sans text-[10px]">
                Conv. Geral:
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                {overallConversionRate}
              </strong>
            </div>
          </div>
        </div>

        {/* Alertas de Inconsistência (Seção 7 do AJ-023) */}
        {(hasConfirmationInconsistency || hasRetentionInconsistency) && (
          <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {hasConfirmationInconsistency &&
                "Confirmaram presença excede convites recebidos. "}
              {hasRetentionInconsistency &&
                "Pessoas até o final excede participantes que entraram ao vivo."}
            </span>
          </div>
        )}
      </div>

      {/* 2. GRID COM OS 5 CARDS OBRIGATÓRIOS (LADO A LADO NO DESKTOP) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {displayCards.map((card) => {
          const cfg = CARDS_CONFIG[card.id] || CARDS_CONFIG.webinar_invites;
          const metricData = activeEdition.metrics[cfg.metricKey];
          const val = metricData?.value ?? 0;
          const isInline = editingMetricKey === cfg.metricKey;

          return (
            <div
              key={card.id}
              className="rounded-xl border border-border/80 bg-card p-2.5 flex flex-col justify-between hover:border-primary/40 hover:shadow-xs transition-all relative group"
            >
              {/* Linha Superior: Ícone, Título e Badge de Origem */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {cfg.icon}
                  <h4
                    className="text-[11px] font-bold text-foreground truncate"
                    title={card.title || cfg.defaultTitle}
                  >
                    {card.title || cfg.defaultTitle}
                  </h4>
                </div>

                <Badge
                  variant="outline"
                  className="text-[8px] font-mono uppercase px-1 py-0 border-border text-muted-foreground"
                >
                  {metricData?.source === "api" ? "API" : "Manual"}
                </Badge>
              </div>

              {/* Valor Numérico em Destaque + Controles +/- */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-1">
                  {isInline ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        type="number"
                        min="0"
                        value={editingValueInput}
                        onChange={(e) => setEditingValueInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitInlineEdit(cfg.metricKey);
                          if (e.key === "Escape") setEditingMetricKey(null);
                        }}
                        autoFocus
                        className="h-7 text-xs font-mono font-bold bg-background border-primary text-foreground rounded-lg"
                      />
                      <button
                        onClick={() => handleCommitInlineEdit(cfg.metricKey)}
                        className="h-6 w-6 flex items-center justify-center bg-primary text-primary-foreground rounded-lg cursor-pointer"
                        title="Salvar"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => handleStartInlineEdit(cfg.metricKey, val)}
                      className={`text-2xl font-black font-mono tracking-tight cursor-pointer hover:underline ${cfg.colorClass}`}
                      title="Clique para editar valor diretamente"
                    >
                      {val.toLocaleString("pt-BR")}
                    </span>
                  )}

                  {/* Controles de Incremento e Decremento */}
                  {!isInline && (
                    <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelta(cfg.metricKey, -1)}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                        title="-1"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelta(cfg.metricKey, 1)}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                        title="+1"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartInlineEdit(cfg.metricKey, val)}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                        title="Editar valor"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Descrição Curta */}
                <p className="text-[10px] text-muted-foreground line-clamp-1" title={cfg.desc}>
                  {cfg.desc}
                </p>

                {/* Rastreabilidade: Data e Responsável da última alteração */}
                {metricData?.updatedAt && (
                  <div className="text-[9px] text-muted-foreground/60 pt-0.5 border-t border-border/30 truncate">
                    Atualizado em {fmtDateTime(metricData.updatedAt).split(" ")[1]}
                    {metricData.updatedBy ? ` por ${metricData.updatedBy}` : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MODAL: NOVA EDIÇÃO DE WEBINÁRIO */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span>Nova Edição de Webinário</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre uma nova edição ou relançamento do evento para acompanhar o funil de forma isolada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEdition} className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Título do Evento *</label>
              <Input
                value={newEditionTitle}
                onChange={(e) => setNewEditionTitle(e.target.value)}
                placeholder="Ex: Webinário PVD #2 — Relaunch"
                className="h-8 text-xs bg-background border-input rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Data do Evento</label>
              <Input
                type="date"
                value={newEditionDate}
                onChange={(e) => setNewEditionDate(e.target.value)}
                className="h-8 text-xs bg-background border-input rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-primary text-primary-foreground font-bold rounded-xl cursor-pointer"
              >
                Criar Edição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
