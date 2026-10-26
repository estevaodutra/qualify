import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSprintStore } from "../state/sprintStore";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Kanban,
  Plus,
  Star,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BG_PRESETS = [
  { name: "Padrão", value: "#3b82f6" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Grafite", value: "#475569" },
];

interface SprintSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SprintSidebar: React.FC<SprintSidebarProps> = ({
  isOpen,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId?: string }>();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { boards, currentBoard, loadBoards, createBoard } = useSprintStore();

  const [filterQuery, setFilterQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeCompanyId && boards.length === 0) {
      loadBoards(activeCompanyId);
    }
  }, [activeCompanyId, boards.length]);

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

  const filteredBoards = boards.filter((b) =>
    (b.title || "").toLowerCase().includes(filterQuery.toLowerCase())
  );

  const favoriteBoards = filteredBoards.filter((b) => b.is_favorite);
  const otherBoards = filteredBoards.filter((b) => !b.is_favorite);

  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-3 px-1.5 bg-card border-r border-border shrink-0 select-none z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground mb-3"
          title="Expandir lista de quadros"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/sprint")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground mb-4"
          title="Todos os quadros"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>

        {/* Mini lista de bolinhas com as cores dos quadros */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)] py-1">
          {boards.slice(0, 10).map((b) => {
            const isActive = b.id === (boardId || currentBoard?.id);
            return (
              <button
                key={b.id}
                onClick={() => navigate(`/sprint/b/${b.id}`)}
                className={cn(
                  "h-6 w-6 rounded-lg flex items-center justify-center transition-all cursor-pointer p-0.5",
                  isActive
                    ? "ring-2 ring-primary scale-110 shadow-xs"
                    : "opacity-75 hover:opacity-100 hover:scale-105"
                )}
                title={b.title}
              >
                <div
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: b.background_value }}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 bg-card/90 backdrop-blur-xs border-r border-border flex flex-col h-full shrink-0 select-none z-20 transition-all">
      {/* Topo da Sidebar: Título, Novo Quadro e Botão de Recolher */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/70 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Kanban className="h-4 w-4" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-foreground truncate font-['Sora']">
            Quadros
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCreateOpen(true)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Criar novo quadro"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Recolher barra lateral"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Busca de Quadros (se houver mais de 3) */}
      {boards.length > 3 && (
        <div className="px-3 pt-2.5 pb-1">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Buscar quadros..."
              className="h-7 pl-8 text-xs bg-muted/40 border-border/60 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Lista de Quadros Rolável */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* Seção Favoritos */}
        {favoriteBoards.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span>Favoritos</span>
            </div>
            {favoriteBoards.map((b) => {
              const isActive = b.id === (boardId || currentBoard?.id);
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/sprint/b/${b.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left group cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: b.background_value }}
                  />
                  <span className="truncate flex-1">{b.title}</span>
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0 opacity-80" />
                </button>
              );
            })}
          </div>
        )}

        {/* Seção Todos os Quadros */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Seus Quadros</span>
            <span className="text-[10px] font-mono text-muted-foreground/80">
              {boards.length}
            </span>
          </div>

          {filteredBoards.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground text-center italic">
              Nenhum quadro encontrado.
            </p>
          ) : (
            (favoriteBoards.length > 0 ? otherBoards : filteredBoards).map((b) => {
              const isActive = b.id === (boardId || currentBoard?.id);
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/sprint/b/${b.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left group cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: b.background_value }}
                  />
                  <span className="truncate flex-1">{b.title}</span>
                  {b.is_favorite && (
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0 opacity-80" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Rodapé da Sidebar: Atalho para Home de Quadros */}
      <div className="p-2 border-t border-border/70 shrink-0">
        <button
          onClick={() => navigate("/sprint")}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Ver todos os quadros</span>
        </button>
      </div>

      {/* Modal: Criar Novo Quadro */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm rounded-2xl bg-card border border-border text-foreground p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Kanban className="h-4 w-4 text-primary" />
              <span>Novo Quadro</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBoard} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Título do Quadro *</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: IPV — Implementação"
                autoFocus
                className="h-8 text-xs bg-background"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Cor de Destaque</label>
              <div className="flex items-center gap-2 flex-wrap">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedBg(preset.value)}
                    style={{ backgroundColor: preset.value }}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform cursor-pointer",
                      selectedBg === preset.value
                        ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "opacity-80 hover:opacity-100"
                    )}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !newTitle.trim()}
                className="text-xs font-bold"
              >
                {isSubmitting ? "Criando..." : "Criar Quadro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
};
