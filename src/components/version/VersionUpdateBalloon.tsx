import { useState } from "react";
import { useVersionNotifier } from "@/hooks/useVersionNotifier";
import { GitCommit, RotateCw, X, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VersionUpdateBalloon() {
  const { hasUpdate, updateInfo, dismiss, reloadPage } = useVersionNotifier();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!hasUpdate || !updateInfo) return null;

  const handleUpdateClick = () => {
    setIsUpdating(true);
    reloadPage();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-6 fade-in duration-300"
    >
      <div className="relative overflow-hidden bg-[#0B0E14]/95 text-white backdrop-blur-2xl border border-primary/40 rounded-2xl p-4 shadow-[0_12px_45px_rgba(0,0,0,0.6)]">
        {/* Subtle accent glow line at the top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Glowing icon container with green live indicator */}
            <div className="relative h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 text-primary mt-0.5">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#0B0E14]" />
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                  O sistema foi atualizado!
                </h4>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Git push OK
                </span>
              </div>

              <p className="text-xs text-white/75 leading-snug line-clamp-2">
                {updateInfo.message
                  ? updateInfo.message
                  : "Uma nova versão do sistema foi publicada via git push com sucesso."}
              </p>

              {/* Commit meta tag */}
              <div className="flex items-center gap-2 pt-0.5 text-[11px] text-white/50">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                  <GitCommit className="w-3 h-3 text-primary" />
                  {updateInfo.shortCommit}
                </span>
                {updateInfo.author && (
                  <span className="truncate max-w-[140px]">por {updateInfo.author}</span>
                )}
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            disabled={isUpdating}
            className="p-1 text-white/40 hover:text-white transition-colors rounded-lg -mr-1 -mt-1 cursor-pointer"
            title="Fechar"
            aria-label="Fechar notificação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            disabled={isUpdating}
            className="h-8 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            Depois
          </Button>

          <Button
            size="sm"
            onClick={handleUpdateClick}
            disabled={isUpdating}
            className="h-8 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md shadow-primary/25 cursor-pointer transition-transform active:scale-95"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            {isUpdating ? "Atualizando..." : "Atualizar agora"}
          </Button>
        </div>
      </div>
    </div>
  );
}
