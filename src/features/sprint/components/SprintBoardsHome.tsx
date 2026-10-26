import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSprintStore } from "../state/sprintStore";
import { SprintBoard } from "../types";
import {
  Plus,
  Star,
  Kanban,
  Layout,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BG_PRESETS = [
  { name: "Padrão", value: "#3b82f6" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Grafite", value: "#475569" },
];

const SprintBoardCard: React.FC<{
  board: SprintBoard;
  onClick: () => void;
}> = ({ board, onClick }) => {
  const metrics = board.metrics || {
    total_cards: board.cards_count || 0,
    completed_cards: 0,
    in_progress_cards: 0,
    pending_cards: board.cards_count || 0,
    progress_percent: 0,
    total_checklists: 0,
    completed_checklists: 0,
    members_count: 0,
  };

  const isCompleted = metrics.total_cards > 0 && metrics.progress_percent === 100;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl border border-border bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all p-4 cursor-pointer flex flex-col justify-between min-h-[172px] overflow-hidden gap-3"
    >
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: board.background_value }}
      />

      {/* Cabeçalho */}
      <div>
        <div className="flex items-start justify-between gap-2 pt-0.5">
          <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">
            {board.title}
          </h3>
          {board.is_favorite && (
            <Star className="h-4 w-4 fill-amber-500 text-amber-500 shrink-0" />
          )}
        </div>
        {board.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {board.description}
          </p>
        )}
      </div>

      {/* Métricas de Evolução do Sprint */}
      <div className="space-y-2 py-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>Evolução do Sprint</span>
          </span>
          <span
            className={cn(
              "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
              isCompleted
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : metrics.progress_percent > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {metrics.progress_percent}%
          </span>
        </div>

        {/* Barra de Progresso da Evolução */}
        <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isCompleted ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${Math.max(metrics.progress_percent, metrics.total_cards > 0 ? 3 : 0)}%` }}
          />
        </div>

        {/* Contadores e Indicadores */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <span className="flex items-center gap-1">
            <strong className="text-foreground font-semibold">{metrics.completed_cards}</strong>/{metrics.total_cards} tarefas
          </span>
          {metrics.in_progress_cards > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              {metrics.in_progress_cards} em andamento
            </span>
          )}
          {metrics.total_checklists > 0 && (
            <span
              className="text-[10px] flex items-center gap-1 text-muted-foreground"
              title="Subtarefas de checklist concluídas"
            >
              <CheckSquare className="h-3 w-3 text-primary/70" />
              <span>{metrics.completed_checklists}/{metrics.total_checklists}</span>
            </span>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40 mt-auto">
        <span className="group-hover:text-primary transition-colors">Abrir quadro</span>
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
      </div>
    </div>
  );
};

export const SprintBoardsHome: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { boards, loadBoards, createBoard, isLoading } = useSprintStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadBoards(activeCompanyId);
    }
  }, [activeCompanyId]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeCompanyId) return;

    try {
      setIsSubmitting(true);
      const created = await createBoard({
        companyId: activeCompanyId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        background_value: selectedBg,
        userId: user?.id,
      });

      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      navigate(`/sprint/b/${created.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const favoriteBoards = boards.filter((b) => b.is_favorite);

  return (
    <div className="flex-1 bg-background text-foreground p-6 md:p-8 space-y-8 overflow-y-auto">
      {/* Top Header com Padrão do Sistema */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-['Sora']">
              Sprint
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Gestão visual de fluxos em Kanban com menções universais (@) e checklists integrados.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shadow-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Criar novo quadro</span>
        </Button>
      </div>

      {/* Seção Favoritos (se houver) */}
      {favoriteBoards.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>Quadros Favoritos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteBoards.map((board) => (
              <SprintBoardCard
                key={board.id}
                board={board}
                onClick={() => navigate(`/sprint/b/${board.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Seção Todos os Quadros */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Layout className="h-3.5 w-3.5" />
          <span>Seus Quadros</span>
        </div>

        {boards.length === 0 ? (
          <div className="p-8 rounded-xl border border-border/60 bg-card text-center space-y-1.5">
            <p className="text-sm font-medium text-foreground">Nenhum quadro encontrado</p>
            <p className="text-xs text-muted-foreground">Clique no botão "Criar novo quadro" no canto superior direito para criar seu primeiro fluxo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board) => (
              <SprintBoardCard
                key={board.id}
                board={board}
                onClick={() => navigate(`/sprint/b/${board.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Novo Quadro */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Criar Novo Quadro
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBoard} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Título do Quadro <span className="text-destructive">*</span>
              </label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Lançamento, Marketing, Operações..."
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Descrição (opcional)
              </label>
              <Textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Objetivo principal deste quadro..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Cor de Destaque
              </label>
              <div className="flex items-center gap-2.5">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedBg(preset.value)}
                    style={{ backgroundColor: preset.value }}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all active:scale-95 cursor-pointer",
                      selectedBg === preset.value
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-white"
                        : "border-transparent opacity-80 hover:opacity-100"
                    )}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
              >
                {isSubmitting ? "Criando..." : "Criar Quadro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
