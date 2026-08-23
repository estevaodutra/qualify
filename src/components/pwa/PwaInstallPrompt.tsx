import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PwaInstallPrompt() {
  const {
    canShowPrompt,
    showIosModal,
    setShowIosModal,
    promptInstall,
    dismissInstallPrompt,
  } = usePwaInstall();

  if (!canShowPrompt && !showIosModal) return null;

  return (
    <>
      {/* Contextual non-blocking banner/card */}
      {canShowPrompt && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[9990] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#0B0E14]/95 backdrop-blur-2xl border border-primary/30 p-4 rounded-2xl shadow-2xl text-white space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white tracking-tight">
                    Instale a Qualify
                  </h4>
                  <p className="text-xs text-white/70 mt-0.5 leading-snug">
                    Tenha acesso mais rápido e receba notificações de novas mensagens no celular.
                  </p>
                </div>
              </div>

              <button
                onClick={dismissInstallPrompt}
                className="p-1 text-white/40 hover:text-white transition-colors rounded-lg"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissInstallPrompt}
                className="h-8 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10"
              >
                Agora não
              </Button>

              <Button
                size="sm"
                onClick={promptInstall}
                className="h-8 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Instalar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Instruction Modal */}
      <Dialog open={showIosModal} onOpenChange={setShowIosModal}>
        <DialogContent className="sm:max-w-md bg-[#0B0E14] border border-white/10 text-white rounded-2xl p-6 shadow-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> Instalar a Qualify no iOS
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Siga as instruções abaixo para adicionar a Qualify à sua Tela de Início:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs text-white/80">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">
                1
              </div>
              <div className="space-y-1 pt-0.5">
                <p className="font-bold text-white flex items-center gap-1.5">
                  Toque no botão Compartilhar <Share className="h-3.5 w-3.5 text-primary" />
                </p>
                <p className="text-white/60 text-[11px]">
                  Localizado na barra inferior do navegador Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">
                2
              </div>
              <div className="space-y-1 pt-0.5">
                <p className="font-bold text-white flex items-center gap-1.5">
                  Escolha "Adicionar à Tela de Início" <PlusSquare className="h-3.5 w-3.5 text-primary" />
                </p>
                <p className="text-white/60 text-[11px]">
                  Role a lista de opções para baixo até encontrar a opção.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
