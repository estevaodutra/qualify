import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Instagram, Youtube, Music, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type SocialPlatform = "instagram" | "tiktok" | "youtube";

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const { activeCompanyId } = useCompany();
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) {
      toast.error("Nenhuma empresa selecionada na plataforma Qualify.");
      return;
    }

    if (!username.trim()) {
      toast.error("Informe o @username da conta.");
      return;
    }

    setLoading(true);
    try {
      const cleanUsername = username.replace("@", "").trim();
      await criafyService.addAccount({
        company_id: activeCompanyId,
        username: cleanUsername,
        name: name.trim() || cleanUsername,
        instagram_account_id: instagramAccountId.trim() || undefined,
        access_token: accessToken.trim() || undefined,
        connection_status: "CONNECTED",
      });

      toast.success(`Conta @${cleanUsername} conectada ao Criafy com sucesso!`);
      setUsername("");
      setName("");
      setInstagramAccountId("");
      setAccessToken("");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao conectar conta: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!activeCompanyId) {
      toast.error("Nenhuma empresa selecionada na plataforma Qualify.");
      return;
    }
    try {
      const redirectUri = `${window.location.origin}/criafy`;
      const authUrl = await criafyService.getOAuthUrl(activeCompanyId, redirectUri);

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
        toast.info("Redirecionando para o OAuth oficial da Meta Instagram API...");
        window.location.href = authUrl;
        return;
      }

      toast.info("Janela de autorização da Meta aberta. Conclua o acesso nela.", { id: "oauth-popup" });
      popup.focus();

      const handlePopupMessage = async (event: MessageEvent) => {
        if (event.data?.type === "CRIAFY_OAUTH_CALLBACK") {
          window.removeEventListener("message", handlePopupMessage);
          const { code, state, error } = event.data;

          if (error) {
            toast.error(`Autorização do Instagram cancelada ou recusada: ${error}`, { id: "oauth-popup" });
            return;
          }

          if (code && state) {
            toast.loading("Processando autorização da Meta e conectando conta...", { id: "oauth-process" });
            try {
              const redirectUri = `${window.location.origin}/criafy`;
              const res = await criafyService.exchangeOAuthCode(activeCompanyId, code, redirectUri, state);
              const count = res.count || (res.accounts ? res.accounts.length : 1);
              toast.success(`Sucesso! ${count} conta(s) do Instagram conectada(s).`, {
                id: "oauth-process",
              });
              onSuccess();
              onOpenChange(false);
            } catch (err: any) {
              toast.error(`Falha ao conectar conta via Meta OAuth: ${err.message}`, {
                id: "oauth-process",
                duration: 12000,
              });
            }
          }
        }
      };
      window.addEventListener("message", handlePopupMessage);
    } catch (err: any) {
      toast.error(`Erro ao iniciar OAuth Meta: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white shadow-xs">
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

        {/* 1. SELETOR DE PLATAFORMA (INSTAGRAM ATIVO, TIKTOK E YOUTUBE PREPARADOS) */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Selecione a Plataforma
          </Label>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Instagram (Ativo / Oficial) */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("instagram")}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 relative ${
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

            {/* TikTok (Em breve) */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("tiktok")}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 relative opacity-75 hover:opacity-100 ${
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
                  Em breve
                </Badge>
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">TikTok</span>
                <span className="text-[10px] text-muted-foreground block">Vídeos curtos</span>
              </div>
            </button>

            {/* YouTube (Em breve) */}
            <button
              type="button"
              onClick={() => setSelectedPlatform("youtube")}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 relative opacity-75 hover:opacity-100 ${
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
                  Em breve
                </Badge>
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">YouTube</span>
                <span className="text-[10px] text-muted-foreground block">Data API</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. PRÓXIMOS PASSOS: QUANDO INSTAGRAM ESTIVER SELECIONADO */}
        {selectedPlatform === "instagram" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOAuthConnect}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 text-white font-medium hover:opacity-95 transition-all border-0 shadow-sm flex items-center justify-center gap-2 py-5 rounded-xl cursor-pointer"
              >
                <Instagram className="w-5 h-5" />
                Conectar via Meta (Facebook & Business Manager)
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Permite selecionar sua BM, Página do Facebook e Conta do Instagram profissional vinculada.
              </p>
            </div>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium text-[10px]">
                  Ou cadastro manual de credenciais
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium">
                Username do Instagram *
              </Label>
              <Input
                id="username"
                placeholder="@sua_conta"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Nome de Exibição / Marca
              </Label>
              <Input
                id="name"
                placeholder="Ex: Qualify Oficial"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ig_id" className="text-xs font-medium">
                ID da Conta Meta Business (opcional)
              </Label>
              <Input
                id="ig_id"
                placeholder="17841400000000000"
                value={instagramAccountId}
                onChange={(e) => setInstagramAccountId(e.target.value)}
                className="rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs font-medium">
                Access Token (opcional)
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="EAA..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="rounded-xl text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl text-xs font-semibold gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar e Conectar
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* PLATAFORMA EM BREVE (TIKTOK OU YOUTUBE) */
          <div className="p-8 text-center space-y-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 my-2">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-xs bg-muted text-foreground">
              {selectedPlatform === "tiktok" ? (
                <Music className="w-6 h-6 text-cyan-400" />
              ) : (
                <Youtube className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">
                Integração com {selectedPlatform === "tiktok" ? "TikTok" : "YouTube"} em breve
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Estamos finalizando o conector oficial. Por enquanto, selecione o Instagram para usufruir de todas as automações e inteligência da Criafy.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setSelectedPlatform("instagram")}
              className="text-xs font-semibold gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              <Instagram className="w-3.5 h-3.5" /> Conectar Instagram Agora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
