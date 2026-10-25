import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSprintStore } from "../state/sprintStore";
import {
  Plus,
  Star,
  Kanban,
  Layout,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BG_PRESETS = [
  { name: "Slate Dark", value: "#0F172A" },
  { name: "Ocean Deep", value: "#1E293B" },
  { name: "Indigo Night", value: "#312E81" },
  { name: "Emerald Forest", value: "#064E3B" },
  { name: "Wine Berry", value: "#831843" },
  { name: "Midnight Purple", value: "#4C1D95" },
];

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
    <div className="flex-1 min-h-[calc(100vh-65px)] bg-[#0B0E14] text-slate-100 p-8 space-y-8 overflow-y-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Kanban className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sprint
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Quadros de trabalho estilo Trello com menções universais (@) e fluxos Kanban ágeis.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white font-semibold gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>Criar novo quadro</span>
        </Button>
      </div>

      {/* Favorites Section (if any) */}
      {favoriteBoards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 uppercase tracking-wider">
            <Star className="h-4 w-4 fill-amber-400" />
            <span>Quadros Favoritos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => navigate(`/sprint/b/${board.id}`)}
                style={{ backgroundColor: board.background_value }}
                className="group relative h-28 rounded-2xl p-4 cursor-pointer border border-white/10 hover:border-white/30 shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base leading-snug group-hover:underline">
                    {board.title}
                  </h3>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Boards Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
          <Layout className="h-4 w-4" />
          <span>Seus Quadros</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Create Board Card Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-28 rounded-2xl border-2 border-dashed border-slate-800 hover:border-primary/60 bg-slate-900/30 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white group"
          >
            <div className="h-8 w-8 rounded-full bg-slate-800 group-hover:bg-primary/20 group-hover:text-primary flex items-center justify-center transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold">Criar novo quadro</span>
          </button>

          {/* Boards List */}
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => navigate(`/sprint/b/${board.id}`)}
              style={{ backgroundColor: board.background_value }}
              className="group relative h-28 rounded-2xl p-4 cursor-pointer border border-white/10 hover:border-white/30 shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white text-base leading-snug group-hover:underline">
                  {board.title}
                </h3>
                {board.is_favorite && (
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                )}
              </div>
              {board.description && (
                <p className="text-xs text-white/70 line-clamp-1">
                  {board.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Board Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              Criar Novo Quadro
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBoard} className="space-y-4 mt-2">
            {/* Board Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Título do Quadro <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Lançamento de Produto, Marketing, Roadmap..."
                required
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Board Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Objetivo principal deste quadro..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Background Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Cor de Fundo
              </label>
              <div className="grid grid-cols-6 gap-2">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedBg(preset.value)}
                    style={{ backgroundColor: preset.value }}
                    className={cn(
                      "h-10 rounded-xl border transition-all active:scale-95",
                      selectedBg === preset.value
                        ? "ring-2 ring-primary border-white"
                        : "border-transparent opacity-80 hover:opacity-100"
                    )}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="bg-primary hover:bg-primary/90 text-white"
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
