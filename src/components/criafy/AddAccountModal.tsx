import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  Youtube,
  Music,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Link2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (account?: any) => void;
}

type SocialPlatform = "instagram" | "tiktok" | "youtube";

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const { activeCompanyId } = useCompany();
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");
  const [acceptedYouTubePrivacy, setAcceptedYouTubePrivacy] = useState(false);

  // Estados de conexão OAuth e compartilhamento de link
  const [connectionUrl, setConnectionUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const popupMessageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Limpeza de listener ao desmontar ou fechar
  useEffect(() => {
    return () => {
      if (popupMessageListenerRef.current) {
        window.removeEventListener("message", popupMessageListenerRef.current);
        popupMessageListenerRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, []);

  // Pré-carrega a URL de autorização da Meta quando o modal é aberto
  useEffect(() => {
    let isMounted = true;
    if (open && activeCompanyId && selectedPlatform === "instagram") {
      const redirectUri = `${window.location.origin}/criafy`;
      setLoadingUrl(true);
      criafyService
        .getOAuthUrl(activeCompanyId, redirectUri)
        .then((url) => {
          if (isMounted) {
            setConnectionUrl(url);
          }
        })
        .catch((err) => {
          console.warn("[AddAccountModal] Falha ao pré-carregar link OAuth:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingUrl(false);
        });
    }

    if (!open) {
      setAcceptedYouTubePrivacy(false);
      setCopied(false);
      setLoadingConnect(false);
      if (popupMessageListenerRef.current) {
        window.removeEventListener("message", popupMessageListenerRef.current);
        popupMessageListenerRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [open, activeCompanyId, selectedPlatform]);

  const getOrFetchAuthUrl = async (): Promise<string> => {
    if (connectionUrl) return connectionUrl;
    if (!activeCompanyId) throw new Error("Nenhuma empresa selecionada.");
    const redirectUri = `${window.location.origin}/criafy`;
    const url = await criafyService.getOAuthUrl(activeCompanyId, redirectUri);
    setConnectionUrl(url);
    return url;
  };

  // Conexão direta na mesma aba (100% à prova de bloqueio de pop-up e isolamento de janelas)
  const handleDirectConnect = async () => {
    if (!activeCompanyId) {
      toast.error("Nenhuma empresa selecionada na plataforma Qualify.");
      return;
    }

    setLoadingConnect(true);
    try {
      const authUrl = await getOrFetchAuthUrl();
      toast.info("Redirecionando para a autorização oficial da Meta...");
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(`Erro ao iniciar conexão: ${err.message || err}`);
      setLoadingConnect(false);
    }
  };

  const handleTikTokConnect = async () => {
    if (!activeCompanyId) {
      toast.error("Selecione um workspace antes de conectar o TikTok.");
      return;
    }
    setLoadingConnect(true);
    try {
      const authUrl = await criafyService.getTikTokOAuthUrl(activeCompanyId);
      window.location.assign(authUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar conexão TikTok.");
      setLoadingConnect(false);
    }
  };

  const handleYouTubeConnect = async () => {
    if (!activeCompanyId) { toast.error("Selecione um workspace antes de conectar o YouTube."); return; }
    setLoadingConnect(true);
    try {
      window.location.assign(await criafyService.getYouTubeOAuthUrl(activeCompanyId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar conexão YouTube.");
      setLoadingConnect(false);
    }
  };

  // Conexão via Janela Pop-up (alternativa para quem deseja continuar na mesma tela)
  const handlePopupConnect = async () => {
    if (!activeCompanyId) {
      toast.error("Nenhuma empresa selecionada na plataforma Qualify.");
      return;
    }

    setLoadingConnect(true);
    try {
      const authUrl = await getOrFetchAuthUrl();

      const width = 600;
      const height = 750;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

      const popup = window.open(
        authUrl,
        "criafy_instagram_oauth",
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,resizable=yes,scrollbars=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        toast.info("Pop-up bloqueado pelo navegador. Redirecionando diretamente...");
        window.location.href = authUrl;
        return;
      }

      toast.info("Janela da Meta aberta. Conclua o acesso nela.", { id: "oauth-popup" });
      popup.focus();

      const handleReceivedOAuth = async (data: { code?: string | null; state?: string | null; error?: string | null }) => {
        if (popupMessageListenerRef.current) {
          window.removeEventListener("message", popupMessageListenerRef.current);
          popupMessageListenerRef.current = null;
        }
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close();
          broadcastChannelRef.current = null;
        }

        const { code, state, error } = data;
        if (error) {
          toast.error(`Autorização do Instagram cancelada ou recusada: ${error}`, { id: "oauth-popup" });
          setLoadingConnect(false);
          return;
        }

        if (code && state) {
          toast.loading("Processando autorização da Meta e validando conta...", { id: "oauth-process" });
          try {
            const redirectUri = `${window.location.origin}/criafy`;
            const res = await criafyService.exchangeOAuthCode(activeCompanyId, code, redirectUri, state);
            const count = res.count || (res.accounts ? res.accounts.length : 1);
            toast.success(`Sucesso! ${count} conta(s) do Instagram conectada(s).`, {
              id: "oauth-process",
            });
            onSuccess(res.accounts?.[0]);
            onOpenChange(false);
          } catch (err: any) {
            toast.error(`Falha ao conectar conta via Meta OAuth: ${err.message}`, {
              id: "oauth-process",
              duration: 12000,
            });
          } finally {
            setLoadingConnect(false);
          }
        }
      };

      // Listener 1: BroadcastChannel (funciona entre abas/popups da mesma origem mesmo com opener nulo)
      if (typeof BroadcastChannel !== "undefined") {
        if (broadcastChannelRef.current) broadcastChannelRef.current.close();
        const bc = new BroadcastChannel("criafy_oauth_channel");
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "CRIAFY_OAUTH_CALLBACK") {
            handleReceivedOAuth(event.data);
          }
        };
      }

      // Listener 2: postMessage clássico
      if (popupMessageListenerRef.current) {
        window.removeEventListener("message", popupMessageListenerRef.current);
      }
      const handlePopupMessage = (event: MessageEvent) => {
        if (event.data?.type === "CRIAFY_OAUTH_CALLBACK") {
          handleReceivedOAuth(event.data);
        }
      };
      popupMessageListenerRef.current = handlePopupMessage;
      window.addEventListener("message", handlePopupMessage);
    } catch (err: any) {
      toast.error(`Erro ao iniciar OAuth Meta: ${err.message}`);
      setLoadingConnect(false);
    }
  };

  // Copia o link de conexão para enviar ao cliente
  const handleCopyLink = async () => {
    if (!activeCompanyId) {
      toast.error("Nenhuma empresa selecionada na plataforma Qualify.");
      return;
    }

    setCopyingLink(true);
    try {
      const url = await getOrFetchAuthUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link de conexão copiado! Envie para o responsável autorizar a conta no navegador dele.");
      setTimeout(() => setCopied(false), 3000);
    } catch (err: any) {
      toast.error(`Erro ao obter link de conexão: ${err.message || err}`);
    } finally {
      setCopyingLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Conectar Conta</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione a plataforma e conecte sua conta oficial à empresa na Qualify.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 1. SELETOR DE PLATAFORMA */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Selecione a Plataforma
          </span>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Instagram (Ativo / Oficial) */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("instagram")}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 relative cursor-pointer ${
                selectedPlatform === "instagram"
                  ? "border-pink-500/60 bg-pink-500/10 ring-2 ring-pink-500/30"
                  : "border-border/70 hover:border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Instagram className="w-4 h-4" />
                </div>
                {selectedPlatform === "instagram" && (
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                )}
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">Instagram</span>
                <span className="text-[10px] text-muted-foreground block">Oficial Meta API</span>
              </div>
            </button>

            {/* TikTok */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("tiktok")}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 relative cursor-pointer ${
                selectedPlatform === "tiktok"
                  ? "border-cyan-500/60 bg-cyan-500/10 ring-2 ring-cyan-500/30"
                  : "border-border/70 bg-card"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-cyan-400 shadow-xs">
                  <Music className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border bg-background text-muted-foreground font-semibold">
                  OAuth oficial
                </Badge>
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">TikTok</span>
                <span className="text-[10px] text-muted-foreground block">Vídeos curtos</span>
              </div>
            </button>

            {/* YouTube */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("youtube")}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 relative cursor-pointer ${
                selectedPlatform === "youtube"
                  ? "border-red-500/60 bg-red-500/10 ring-2 ring-red-500/30"
                  : "border-border/70 bg-card"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
                  <Youtube className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border bg-background text-muted-foreground font-semibold">
                  OAuth oficial
                </Badge>
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">YouTube</span>
                <span className="text-[10px] text-muted-foreground block">Data API</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. ÁREA DE CONEXÃO DO INSTAGRAM */}
        {selectedPlatform === "instagram" ? (
          <div className="space-y-4 pt-1">
            {/* Opção 1: Conectar diretamente */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Conectar neste dispositivo
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                  Recomendado
                </Badge>
              </div>

              {/* Botão Principal: Navegação Direta */}
              <Button
                type="button"
                onClick={handleDirectConnect}
                disabled={loadingConnect}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 hover:from-blue-700 hover:via-indigo-700 hover:to-pink-700 text-white font-bold text-xs py-5 rounded-xl shadow-xs gap-2 cursor-pointer transition-all"
              >
                {loadingConnect ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Instagram className="w-4 h-4" />
                )}
                <span>Conectar via Meta (Recomendado)</span>
              </Button>

              {/* Botão Secundário: Pop-up Lateral */}
              <Button
                type="button"
                variant="outline"
                onClick={handlePopupConnect}
                disabled={loadingConnect}
                className="w-full text-xs h-9 rounded-xl border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Janela Pop-up</span>
              </Button>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Abre a tela oficial da Meta para autorizar sua Página do Facebook e Conta Profissional do Instagram com validação automática.
              </p>
            </div>

            {/* Separador */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-bold text-[10px] tracking-wider">
                  Ou compartilhar link de conexão
                </span>
              </div>
            </div>

            {/* Opção 2: Copiar Link de Conexão para o Cliente */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Link2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    Enviar link direto para o cliente
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Copie o link abaixo e envie para a pessoa responsável autorizar a conta no navegador dela, sem precisar acessar sua conta Qualify.
                  </p>
                </div>
              </div>

              {/* Campo do link + Botão de Copiar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    value={
                      connectionUrl ||
                      (loadingUrl ? "Gerando link de autorização seguro..." : "Clique em 'Copiar Link' para gerar")
                    }
                    className="pr-8 font-mono text-[11px] bg-background text-muted-foreground select-all rounded-xl h-10 truncate border-border/80 cursor-pointer"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  {loadingUrl && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={copyingLink}
                  variant={copied ? "default" : "secondary"}
                  className={`gap-1.5 font-bold text-xs rounded-xl h-10 px-4 shrink-0 cursor-pointer transition-all ${
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border border-border/80 hover:bg-muted font-semibold"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado!</span>
                    </>
                  ) : copyingLink ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Selo de Segurança */}
              <div className="flex items-center gap-2 pt-0.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Login 100% oficial pela Meta. Nenhuma senha pessoal é compartilhada.
                </span>
              </div>
            </div>
          </div>
        ) : selectedPlatform === "tiktok" ? (
          <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
            <h4 className="text-sm font-bold">Conectar TikTok</h4>
            <p className="text-xs text-muted-foreground">
              Você será redirecionado ao TikTok para autorizar esta conta no workspace atual.
            </p>
            <Button type="button" className="w-full gap-2 bg-slate-950 text-white hover:bg-slate-800"
              onClick={handleTikTokConnect} disabled={loadingConnect}>
              {loadingConnect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
              Autorizar com TikTok
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
            <h4 className="text-sm font-bold">Conectar canal YouTube</h4>
            <p className="text-xs text-muted-foreground">
              Você será redirecionado ao Google para autorizar upload de vídeos e identificar seu canal.
            </p>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={acceptedYouTubePrivacy}
                onChange={(event) => setAcceptedYouTubePrivacy(event.target.checked)} />
              <span>Li e aceito a <a href="/politica-de-privacidade" target="_blank" rel="noreferrer" className="underline">Política de Privacidade</a> e os <a href="/termos-de-uso" target="_blank" rel="noreferrer" className="underline">Termos do Criafy</a>, incluindo os <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="underline">Termos do YouTube</a>.</span>
            </label>
            <Button type="button" className="w-full gap-2 bg-red-600 text-white hover:bg-red-700"
              onClick={handleYouTubeConnect} disabled={loadingConnect || !acceptedYouTubePrivacy}>
              {loadingConnect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
              Autorizar com Google
            </Button>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-medium w-full sm:w-auto cursor-pointer"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
