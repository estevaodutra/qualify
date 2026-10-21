/**
 * Modal: ⧉ TEMPLATES & EXPORTAÇÃO (Camada A / Seções 36 e 39).
 * - Salvar projeto ou sprint como template reutilizável
 * - Exportar JSON completo com schema validado
 * - Importar JSON para restaurar estado
 * - Reinicializar com o Template Matriz "Percurso da Vida"
 */

import React, { useRef } from "react";
import {
  FolderArchive,
  Download,
  Upload,
  RotateCcw,
  Copy,
  CheckCircle2,
  FileCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { SprintOSRepository } from "../../persistence/repository";
import { createPercursoDaVidaSeed } from "../../seed/percursoDaVidaSeed";

export const TemplatesModal: React.FC = () => {
  const { workspace, isTemplatesModalOpen, setIsTemplatesModalOpen, initWorkspace } =
    useSprintOSStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!workspace) return null;

  const handleExportJson = () => {
    const jsonStr = SprintOSRepository.exportToJson(workspace);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sprint-os-${workspace.project.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo JSON exportado com sucesso!");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = SprintOSRepository.importFromJson(content);
        await SprintOSRepository.saveWorkspace(imported, 1);
        await initWorkspace(null, imported.project.id);
        toast.success("Workspace importado e restaurado com sucesso!");
        setIsTemplatesModalOpen(false);
      } catch (err: any) {
        toast.error(`Falha ao importar: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSeed = async () => {
    if (confirm("Deseja realmente restaurar os dados matriz do template 'Percurso da Vida'? Todas as alterações locais não exportadas serão sobrescritas.")) {
      const seed = createPercursoDaVidaSeed();
      await SprintOSRepository.saveWorkspace(seed, 1);
      await initWorkspace(null, seed.project.id);
      toast.success("Template matriz 'Percurso da Vida' restaurado!");
      setIsTemplatesModalOpen(false);
    }
  };

  return (
    <Dialog open={isTemplatesModalOpen} onOpenChange={setIsTemplatesModalOpen}>
      <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-violet-400 mb-1">
            <FolderArchive className="h-4 w-4" />
            <span className="text-xs uppercase font-black tracking-wider">
              Templates & Portabilidade
            </span>
          </div>
          <DialogTitle className="text-base font-black text-white">
            Gerenciamento de Templates e Dados
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            Exporte ou importe a estrutura completa da sua implementação em formato JSON aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Exportar JSON */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-primary" />
                Exportar Workspace (JSON)
              </div>
              <div className="text-[11px] text-white/40">Download do backup completo</div>
            </div>
            <Button onClick={handleExportJson} size="sm" className="h-8 text-xs bg-primary font-bold">
              Exportar
            </Button>
          </div>

          {/* Importar JSON */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-indigo-400" />
                Importar Workspace (JSON)
              </div>
              <div className="text-[11px] text-white/40">Carregar arquivo existente</div>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                variant="outline"
                className="h-8 text-xs border-white/10 text-white font-bold"
              >
                Importar
              </Button>
            </div>
          </div>

          {/* Restaurar Seed Matriz */}
          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar Template Inicial
              </div>
              <div className="text-[11px] text-rose-300/60">Recarrega o seed 'Percurso da Vida'</div>
            </div>
            <Button
              onClick={handleResetToSeed}
              size="sm"
              variant="outline"
              className="h-8 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
            >
              Restaurar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
