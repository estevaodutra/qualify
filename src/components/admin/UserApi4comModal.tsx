import React, { useState, useEffect } from "react";
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
import {
  PhoneCall,
  Key,
  Sparkles,
  Check,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  type AdminUser,
  useSaveUserApi4comToken,
  useGenerateUserApi4comToken,
  useRemoveUserApi4comToken,
} from "@/hooks/useAdmin";

interface UserApi4comModalProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
}

export function UserApi4comModal({ user, open, onClose }: UserApi4comModalProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // Campos para geração automática
  const [customPassword, setCustomPassword] = useState("");
  const [customPhone, setCustomPhone] = useState("");

  const saveTokenMutation = useSaveUserApi4comToken();
  const generateTokenMutation = useGenerateUserApi4comToken();
  const removeTokenMutation = useRemoveUserApi4comToken();

  useEffect(() => {
    if (user && open) {
      setTokenInput(user.api4com_token || "");
      setShowToken(false);
      setCopied(false);
      setCustomPassword("");
      setCustomPhone("");
    }
  }, [user, open]);

  if (!user) return null;

  const hasToken = Boolean(user.api4com_token);

  const handleCopy = () => {
    if (!user.api4com_token) return;
    navigator.clipboard.writeText(user.api4com_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Token copiado para a área de transferência!" });
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast({
        title: "Informe o token",
        description: "Cole o token de acesso da API4COM.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveTokenMutation.mutateAsync({
        user_id: user.id,
        api4com_token: tokenInput.trim(),
      });
      onClose();
    } catch (_) {
      // toast is already fired by mutation
    }
  };

  const handleGenerateAutomatic = async () => {
    try {
      await generateTokenMutation.mutateAsync({
        user_id: user.id,
        email: user.email,
        name: user.full_name || undefined,
        password: customPassword.trim() || undefined,
        phone: customPhone.trim() || undefined,
      });
      onClose();
    } catch (_) {
      // toast is already fired by mutation
    }
  };

  const handleRemove = async () => {
    if (!confirm("Deseja realmente remover o token da API4COM deste usuário?")) return;
    try {
      await removeTokenMutation.mutateAsync({ user_id: user.id });
      setTokenInput("");
    } catch (_) {
      // toast fired by mutation
    }
  };

  const isLoading =
    saveTokenMutation.isPending ||
    generateTokenMutation.isPending ||
    removeTokenMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                API4COM — {user.full_name || user.email}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gerencie o token de acesso e a vinculação do ramal SIP para chamadas e Webphone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status Atual do Usuário na API4COM */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status da Conexão
              </span>
              {hasToken ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" /> Token Ativo
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <AlertCircle className="h-3 w-3" /> Sem Token
                </Badge>
              )}
            </div>

            {hasToken && (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border/50">
                <div>
                  <span className="text-muted-foreground">Ramal SIP:</span>{" "}
                  <strong className="text-foreground font-mono">
                    {user.api4com_extension || "Não identificado"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Domínio SIP:</span>{" "}
                  <span className="text-foreground font-mono truncate">
                    {user.api4com_domain || "api.api4com.com"}
                  </span>
                </div>
              </div>
            )}

            {hasToken && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] text-muted-foreground">Token Armazenado:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    type={showToken ? "text" : "password"}
                    value={user.api4com_token || ""}
                    className="h-8 text-xs font-mono bg-background select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? "Ocultar token" : "Exibir token"}
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleCopy}
                    title="Copiar token"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={handleRemove}
                    disabled={isLoading}
                    title="Remover token"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Opção 1: Gerar Automaticamente */}
          <div className="rounded-lg border-2 border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Gerar Usuário e Token Automaticamente
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cria ou autentica o usuário na API4COM, gera um Token perpétuo (sem expiração), sincroniza o Ramal SIP e configura o Webhook.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5"
                onClick={handleGenerateAutomatic}
                disabled={isLoading}
              >
                {generateTokenMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Gerando Token na API4COM...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {hasToken ? "Regerar Token na API4COM" : "Gerar Usuário & Token na API4COM"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium text-[10px]">
                Ou informe o Token manualmente
              </span>
            </div>
          </div>

          {/* Opção 2: Informar Token Manual */}
          <form onSubmit={handleSaveManual} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="token-manual-input" className="text-xs font-medium">
                Token de Acesso da API4COM
              </Label>
              <Input
                id="token-manual-input"
                placeholder="Cole o token da API4COM (ex: rMExNa0RUY8s7a...)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                disabled={isLoading}
                className="font-mono text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Ao salvar, validaremos o token na API4COM, capturaremos o ramal SIP associado e ativaremos o Webhook.
              </p>
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full text-xs h-8"
              disabled={isLoading || !tokenInput.trim()}
            >
              {saveTokenMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Key className="mr-1.5 h-3.5 w-3.5" />
                  Salvar e Sincronizar Ramal
                </>
              )}
            </Button>
          </form>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="text-xs h-8">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
