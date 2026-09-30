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
import { Instagram, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const { activeCompanyId } = useCompany();
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
      toast.info("Redirecionando para o OAuth oficial da Meta Instagram API...");
      window.location.href = authUrl;
    } catch (err: any) {
      toast.error(`Erro ao iniciar OAuth Meta: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Conectar Conta do Instagram</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Associe uma nova conta ao perfil da sua empresa na Qualify.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleOAuthConnect}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-medium hover:opacity-90 transition-all border-0 shadow-sm flex items-center justify-center gap-2 py-5"
          >
            <Instagram className="w-5 h-5" />
            Conectar via OAuth Oficial Meta
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">
                Ou cadastro manual / credenciais
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
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar e Conectar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
