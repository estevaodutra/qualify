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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyMembers, type CompanyMember } from "@/hooks/useCompanyMembers";

interface EditMemberTelephonyDialogProps {
  member: CompanyMember | null;
  open: boolean;
  onClose: () => void;
}

export function EditMemberTelephonyDialog({
  member,
  open,
  onClose,
}: EditMemberTelephonyDialogProps) {
  const { toast } = useToast();
  const { updateMemberTelephony } = useCompanyMembers();

  const [extension, setExtension] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (member && open) {
      setExtension(member.extension || "");
      setToken(member.api4com_token || "");
      setShowToken(false);
      setCopied(false);
    }
  }, [member, open]);

  if (!member) return null;

  const hasToken = Boolean(token.trim());

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Token copiado para a área de transferência!" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMemberTelephony.mutateAsync({
        userId: member.user_id,
        extension: extension.trim() || null,
        api4com_token: token.trim() || null,
      });

      toast({
        title: "Telefonia atualizada com sucesso!",
        description: token.trim()
          ? "Ramal e Token configurados. O Webphone estará disponível para este usuário."
          : "Ramal atualizado. Webphone desabilitado (sem token).",
      });
      onClose();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message || "Não foi possível salvar as configurações de telefonia.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAutomatic = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("api4com-manage-user", {
        body: {
          action: "generate-token",
          user_id: member.user_id,
          email: member.email,
          name: member.full_name || undefined,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Falha ao gerar na API4COM");
      }

      if (data.token) {
        setToken(data.token);
      }
      if (data.extension) {
        setExtension(data.extension);
      }

      // Salva imediatamente no banco para a empresa
      await updateMemberTelephony.mutateAsync({
        userId: member.user_id,
        extension: data.extension || extension.trim() || null,
        api4com_token: data.token,
      });

      toast({
        title: "Token gerado e configurado!",
        description: data.extension
          ? `Ramal ${data.extension} vinculado. O Webphone já está pronto para uso!`
          : "Token gerado com sucesso.",
      });
      onClose();
    } catch (err: any) {
      toast({
        title: "Erro ao gerar token na API4COM",
        description: err.message || "Verifique se a conta API4COM possui permissão ou se o token mestre está configurado.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearToken = () => {
    setToken("");
    toast({ title: "Token limpo. Clique em Salvar para confirmar." });
  };

  const isSaving = updateMemberTelephony.isPending || isGenerating;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Configurar Telefonia & Webphone
              </DialogTitle>
              <DialogDescription className="text-xs">
                Membro: <strong className="text-foreground">{member.full_name || member.email}</strong> ({member.email})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Status do Webphone */}
          <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Status do Webphone:</span>
            {hasToken ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[11px] gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Habilitado (Token Configurado)
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-[11px] text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" /> Desabilitado (Sem Token)
              </Badge>
            )}
          </div>

          {/* Campo Ramal */}
          <div className="space-y-1.5">
            <Label htmlFor="member-dialog-ext" className="text-xs font-medium">
              Ramal SIP (Opcional)
            </Label>
            <Input
              id="member-dialog-ext"
              placeholder="Ex: 1002"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              disabled={isSaving}
              className="h-9 text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Número do ramal da telefonia API4COM atribuído a este usuário nesta empresa.
            </p>
          </div>

          {/* Campo Token do Webphone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="member-dialog-token" className="text-xs font-medium">
                Token do Webphone / API4COM
              </Label>
              {token && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copiado!" : "Copiar"}</span>
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={handleClearToken}
                    className="text-[11px] text-destructive hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                id="member-dialog-token"
                type={showToken ? "text" : "password"}
                placeholder="Cole o token da API4COM (ex: rMExNa0RUY8s7a...)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isSaving}
                className="h-9 text-xs font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showToken ? "Ocultar" : "Exibir"}
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O Webphone flutuante só ficará visível para este usuário se este token estiver preenchido.
            </p>
          </div>

          {/* Card de Geração Automática */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  Gerar Conta & Token na API4COM
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Gera automaticamente a conta e o token perpétuo na API4COM para este usuário e vincula o ramal SIP.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAutomatic}
              disabled={isSaving}
              className="w-full h-8 text-xs border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Gerando na API4COM...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                  Gerar Token Automaticamente
                </>
              )}
            </Button>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="text-xs h-8">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="text-xs h-8 bg-primary">
              {updateMemberTelephony.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Telefonia"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
