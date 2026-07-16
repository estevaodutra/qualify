// src/components/quiz/builder/QuizBuilderTopbar.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor,
  Undo2,
  Redo2,
  Save,
  Globe,
  Copy,
  Eye,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizBuilderStore, SaveStatus } from "@/stores/quiz/useQuizBuilderStore";
import { useToast } from "@/hooks/use-toast";

interface TopbarProps {
  onSave: () => void;
  onPublish: () => void;
  onOpenSettings: () => void;
}

export const QuizBuilderTopbar: React.FC<TopbarProps> = ({ onSave, onPublish, onOpenSettings }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const funnel = useQuizBuilderStore((s) => s.funnel);
  const deviceMode = useQuizBuilderStore((s) => s.deviceMode);
  const setDeviceMode = useQuizBuilderStore((s) => s.setDeviceMode);
  const isPreviewMode = useQuizBuilderStore((s) => s.isPreviewMode);
  const setIsPreviewMode = useQuizBuilderStore((s) => s.setIsPreviewMode);

  const saveStatus = useQuizBuilderStore((s) => s.saveStatus);
  const canUndo = useQuizBuilderStore((s) => s.canUndo);
  const canRedo = useQuizBuilderStore((s) => s.canRedo);
  const undo = useQuizBuilderStore((s) => s.undo);
  const redo = useQuizBuilderStore((s) => s.redo);

  const publicUrl = funnel ? `${window.location.origin}/q/${funnel.slug}` : "";

  const handleCopyLink = () => {
    if (!funnel) return;
    navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link copiado!", description: "A URL pública do quiz foi copiada." });
  };

  const getStatusBadge = (status: SaveStatus) => {
    switch (status) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full font-medium">
            <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
          </span>
        );
      case "dirty":
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full font-medium">
            Alterações pendentes
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" /> Salvo
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full font-medium">
            <AlertCircle className="w-3 h-3" /> Erro ao salvar
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-14 bg-card border-b border-border px-4 flex items-center justify-between shrink-0 select-none z-30 shadow-xs">
      {/* Left: Back & Funnel Name */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/quiz")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm truncate max-w-[200px]">{funnel?.name || "Editor de Funil"}</span>
          {getStatusBadge(saveStatus)}
        </div>
      </div>

      {/* Center: Device Switcher & Undo/Redo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
          <Button
            variant={deviceMode === "mobile" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setDeviceMode("mobile")}
            title="Visualização Mobile"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={deviceMode === "tablet" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setDeviceMode("tablet")}
            title="Visualização Tablet"
          >
            <Tablet className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={deviceMode === "desktop" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setDeviceMode("desktop")}
            title="Visualização Desktop"
          >
            <Monitor className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={undo} title="Desfazer (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={redo} title="Refazer (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Right: Actions (Settings Gear, Preview, Link, Save, Publish) */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onOpenSettings}
          title="Configurações do Quiz"
        >
          <Settings className="w-4 h-4 text-slate-700" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
        >
          <Eye className="w-3.5 h-3.5" />
          {isPreviewMode ? "Editar" : "Preview"}
        </Button>

        {funnel?.status === "published" && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCopyLink}>
            <Copy className="w-3.5 h-3.5" /> Link Público
          </Button>
        )}

        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" onClick={onSave}>
          <Save className="w-3.5 h-3.5" /> Salvar
        </Button>

        <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={onPublish}>
          <Globe className="w-3.5 h-3.5" /> Publicar
        </Button>
      </div>
    </div>
  );
};
