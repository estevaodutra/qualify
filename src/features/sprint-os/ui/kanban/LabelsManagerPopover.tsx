/**
 * Gerenciador e Seletor de Etiquetas Personalizáveis (AJ-022).
 * Padrão Trello: etiquetas compartilhadas no projeto com nome, cor, preview e ações.
 */

import React, { useState } from "react";
import {
  Tag,
  Plus,
  Check,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSprintOSStore } from "../../state/sprintOsStore";
import {
  createWorkspaceLabel,
  updateWorkspaceLabel,
  archiveWorkspaceLabel,
  toggleTaskLabel,
} from "../../domain/ops";
import type { WorkspaceLabel } from "../../domain/types";
import { toast } from "sonner";

const QUICK_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Esmeralda
  "#ec4899", // Rosa
  "#f59e0b", // Âmbar
  "#06b6d4", // Ciano
  "#8b5cf6", // Roxo
  "#ef4444", // Vermelho
  "#3b82f6", // Azul
  "#14b8a6", // Teal
  "#84cc16", // Lime
];

interface LabelsManagerPopoverProps {
  taskId: string;
  trigger?: React.ReactNode;
}

export const LabelsManagerPopover: React.FC<LabelsManagerPopoverProps> = ({
  taskId,
  trigger,
}) => {
  const { workspace, mutate } = useSprintOSStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modo de criação / edição de etiqueta
  const [isEditing, setIsEditing] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(QUICK_COLORS[0]);

  // Aba de exibição: ativas vs arquivadas
  const [showArchived, setShowArchived] = useState(false);

  if (!workspace) return null;

  const task = workspace.tasks[taskId];
  const taskLabelIds = new Set(task?.labelIds || []);
  const allLabels = Object.values(workspace.labels || {});

  const activeLabels = allLabels.filter((l) => !l.archived);
  const archivedLabels = allLabels.filter((l) => l.archived);

  const displayedLabels = (showArchived ? archivedLabels : activeLabels).filter(
    (l) => l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setIsEditing(true);
    setEditingLabelId(null);
    setLabelName("");
    setLabelColor(QUICK_COLORS[Math.floor(Math.random() * QUICK_COLORS.length)]);
  };

  const handleOpenEdit = (lbl: WorkspaceLabel) => {
    setIsEditing(true);
    setEditingLabelId(lbl.id);
    setLabelName(lbl.name);
    setLabelColor(lbl.color);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingLabelId(null);
    setLabelName("");
  };

  const handleSaveLabel = async () => {
    if (!labelName.trim()) {
      toast.error("Informe o nome da etiqueta");
      return;
    }

    await mutate((ws, ctx) => {
      if (editingLabelId) {
        updateWorkspaceLabel(ws, ctx, editingLabelId, {
          name: labelName.trim(),
          color: labelColor,
        });
      } else {
        const created = createWorkspaceLabel(
          ws,
          ctx,
          labelName.trim(),
          labelColor
        );
        // Aplica automaticamente à tarefa atual se estiver criando
        toggleTaskLabel(ws, ctx, taskId, created.id);
      }
    });

    toast.success(
      editingLabelId ? "Etiqueta atualizada!" : "Etiqueta criada e vinculada!"
    );
    handleCancelEdit();
  };

  const handleToggleTaskLabel = async (labelId: string) => {
    await mutate((ws, ctx) => {
      toggleTaskLabel(ws, ctx, taskId, labelId);
    });
  };

  const handleArchive = async (labelId: string, archive: boolean) => {
    await mutate((ws, ctx) => {
      archiveWorkspaceLabel(ws, ctx, labelId, archive);
    });
    toast.info(archive ? "Etiqueta arquivada" : "Etiqueta restaurada");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
          >
            <Tag className="h-2.5 w-2.5" />
            <span>Etiquetas</span>
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-72 p-3 rounded-2xl shadow-2xl bg-popover border-border space-y-3 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Popover */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            {isEditing
              ? editingLabelId
                ? "Editar Etiqueta"
                : "Criar Etiqueta"
              : "Etiquetas do Projeto"}
          </span>

          {isEditing && (
            <button
              onClick={handleCancelEdit}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isEditing ? (
          /* Formulário de Criação / Edição de Etiqueta */
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Nome da Etiqueta
              </label>
              <Input
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Ex: Copy & Conteúdo"
                className="h-7 text-xs bg-background border-input rounded-xl"
                autoFocus
              />
            </div>

            {/* Prévia da Etiqueta */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Prévia
              </label>
              <div
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: `${labelColor}15`,
                  borderColor: `${labelColor}40`,
                  color: labelColor,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: labelColor }}
                />
                <span className="truncate">
                  {labelName.trim() || "Nova Etiqueta"}
                </span>
              </div>
            </div>

            {/* Paleta Rápida de Cores */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Cores Rápidas
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLabelColor(c)}
                    className={`h-6 rounded-lg transition-transform flex items-center justify-center ${
                      labelColor.toLowerCase() === c.toLowerCase()
                        ? "ring-2 ring-foreground scale-105"
                        : "hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {labelColor.toLowerCase() === c.toLowerCase() && (
                      <Check className="h-3 w-3 text-white drop-shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor Customizado HEX/RGB */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Cor Personalizada (HEX)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={labelColor}
                  onChange={(e) => setLabelColor(e.target.value)}
                  className="h-7 w-8 rounded-lg cursor-pointer bg-transparent border border-input p-0.5"
                />
                <Input
                  value={labelColor}
                  onChange={(e) => setLabelColor(e.target.value)}
                  placeholder="#6366f1"
                  className="h-7 text-xs font-mono bg-background border-input rounded-xl uppercase flex-1"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLabel}
                className="h-7 text-xs bg-primary text-primary-foreground font-bold rounded-xl"
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          /* Lista de Etiquetas do Projeto com Checkbox para Aplicar */
          <div className="space-y-2.5">
            {/* Campo de Busca */}
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar etiquetas..."
              className="h-7 text-xs bg-background border-input rounded-xl"
            />

            {/* Lista com Scroll */}
            <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
              {displayedLabels.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground/60 italic text-[11px]">
                  {showArchived
                    ? "Nenhuma etiqueta arquivada"
                    : "Nenhuma etiqueta encontrada"}
                </div>
              ) : (
                displayedLabels.map((lbl) => {
                  const isChecked = taskLabelIds.has(lbl.id);

                  return (
                    <div
                      key={lbl.id}
                      className="group flex items-center justify-between p-1.5 rounded-xl hover:bg-muted/50 transition-colors gap-2 text-xs"
                    >
                      {/* Botão de Marcar / Desmarcar da Tarefa */}
                      <button
                        type="button"
                        onClick={() => handleToggleTaskLabel(lbl.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div
                          className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>

                        {/* Tag Preview */}
                        <div
                          className="px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 truncate max-w-[170px]"
                          style={{
                            backgroundColor: `${lbl.color}15`,
                            borderColor: `${lbl.color}40`,
                            color: lbl.color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: lbl.color }}
                          />
                          <span className="truncate">{lbl.name}</span>
                        </div>
                      </button>

                      {/* Ações da Etiqueta: Editar & Arquivar */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(lbl)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title="Editar nome e cor"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(lbl.id, !lbl.archived)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title={lbl.archived ? "Restaurar" : "Arquivar"}
                        >
                          {lbl.archived ? (
                            <RotateCcw className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Archive className="h-3 w-3 text-amber-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé: Criar Nova Etiqueta & Alternar Arquivadas */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Criar etiqueta</span>
              </button>

              {archivedLabels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-muted-foreground hover:text-foreground text-[10px]"
                >
                  {showArchived
                    ? "Ver ativas"
                    : `Arquivadas (${archivedLabels.length})`}
                </button>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
