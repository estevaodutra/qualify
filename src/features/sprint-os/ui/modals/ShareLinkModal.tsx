/**
 * Modal: 🔗 COMPARTILHAR LINK (Seção 40 / Solicitação do Usuário).
 * Gera link público somente-leitura com token seguro para clientes/externos.
 */

import React, { useState } from "react";
import { Share2, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { SprintOSRepository } from "../../persistence/repository";

export const ShareLinkModal: React.FC = () => {
  const { workspace, isShareModalOpen, setIsShareModalOpen } = useSprintOSStore();
  const [shareUrl, setShareUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!workspace) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await SprintOSRepository.createShareLink(
        workspace.project.id,
        null,
        `Visualização Externa - ${workspace.project.name}`
      );
      setShareUrl(res.url);
      toast.success("Link gerado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao gerar link de compartilhamento");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
      <DialogContent className="max-w-md bg-card border border-border text-card-foreground shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Share2 className="h-4 w-4" />
            <span className="text-xs uppercase font-black tracking-wider">
              Acesso Externo
            </span>
          </div>
          <DialogTitle className="text-base font-black text-foreground">
            Compartilhar Cronograma com Externos
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gera um link de visualização somente-leitura. Dados financeiros confidenciais são removidos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {shareUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="bg-background border-input text-xs text-foreground"
                />
                <Button onClick={handleCopy} size="sm" className="bg-primary font-bold text-xs gap-1.5 shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar</span>
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Link ativo e acessível sem necessidade de login.</span>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-foreground font-bold text-xs gap-1.5 shadow-lg"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{isGenerating ? "Gerando link..." : "Gerar Link de Visualização"}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
