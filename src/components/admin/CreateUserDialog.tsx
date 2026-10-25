import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateAdminUser, useGenerateUserInviteLink, type AdminUser } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Copy, Check, MessageSquare, ExternalLink, Loader2, Sparkles } from "lucide-react";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  existingUser?: AdminUser | null;
}

export function CreateUserDialog({ open, onClose, existingUser }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [createdData, setCreatedData] = useState<{
    email: string;
    fullName: string;
    inviteLink: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const createUserMutation = useCreateAdminUser();
  const generateLinkMutation = useGenerateUserInviteLink();

  // Reset or load initial data when dialog opens
  useEffect(() => {
    if (open) {
      if (existingUser) {
        setEmail(existingUser.email);
        setFullName(existingUser.full_name || "");
        // If already passed an existing user, trigger link generation immediately or fill form
      } else {
        setEmail("");
        setFullName("");
        setCreatedData(null);
      }
      setCopiedLink(false);
      setCopiedMessage(false);
    }
  }, [open, existingUser]);

  const handleClose = () => {
    setCreatedData(null);
    setEmail("");
    setFullName("");
    setCopiedLink(false);
    setCopiedMessage(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    try {
      if (existingUser) {
        // Generate link for existing user
        const result = await generateLinkMutation.mutateAsync({
          email: email.trim().toLowerCase(),
        });
        setCreatedData({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          inviteLink: result.inviteLink,
        });
        toast({
          title: "Link gerado com sucesso!",
          description: "Você já pode copiar o link ou a mensagem pronta.",
        });
      } else {
        // Create user
        const result = await createUserMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
        });

        setCreatedData({
          email: result.user.email,
          fullName: result.user.full_name || fullName.trim(),
          inviteLink: result.inviteLink,
        });

        toast({
          title: "Usuário criado com sucesso!",
          description: "O link para criação de senha foi gerado.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao processar",
        description: err.message || "Ocorreu um erro ao criar o usuário ou gerar o link.",
        variant: "destructive",
      });
    }
  };

  const buildReadyMessage = () => {
    if (!createdData) return "";
    const name = createdData.fullName?.split(" ")[0] || "Olá";
    return `Olá, ${name}! 👋\n\nSeu acesso à plataforma Qualify foi criado com sucesso.\n\nPara definir sua senha e começar a usar, acesse o link abaixo:\n${createdData.inviteLink}\n\nQualquer dúvida, estamos à disposição!`;
  };

  const copyToClipboard = async (text: string, type: "link" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast({ title: "Link copiado para a área de transferência!" });
      } else {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
        toast({ title: "Mensagem copiada para a área de transferência!" });
      }
    } catch (err) {
      toast({ title: "Erro ao copiar", description: "Copie manualmente.", variant: "destructive" });
    }
  };

  const openWhatsApp = () => {
    if (!createdData) return;
    const msg = encodeURIComponent(buildReadyMessage());
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const isPending = createUserMutation.isPending || generateLinkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg sm:max-w-[540px]">
        {!createdData ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {existingUser ? "Gerar Link de Acesso" : "Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {existingUser
                  ? "Gere um link para que o usuário possa redefinir sua senha e acessar a plataforma."
                  : "Informe o nome e e-mail. Um link para criação de senha será gerado automaticamente."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="user-name" className="text-sm font-medium">
                  Nome Completo
                </Label>
                <Input
                  id="user-name"
                  placeholder="Ex: Carlos Oliveira"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isPending}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email" className="text-sm font-medium">
                  E-mail
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending || !!existingUser}
                />
                <p className="text-[12px] text-muted-foreground">
                  A pessoa receberá o link para criar a própria senha de acesso.
                </p>
              </div>

              <DialogFooter className="pt-4 gap-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {existingUser ? "Gerando link..." : "Criando usuário..."}
                    </>
                  ) : existingUser ? (
                    "Gerar Link"
                  ) : (
                    "Criar Usuário"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="space-y-5 py-2">
            <DialogHeader className="text-center sm:text-center space-y-1">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mb-1">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {existingUser ? "Link Gerado com Sucesso!" : "Usuário Criado com Sucesso!"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Envie o link abaixo para <strong>{createdData.fullName}</strong> ({createdData.email}) definir a senha de acesso.
              </DialogDescription>
            </DialogHeader>

            {/* Box Link de Definição de Senha */}
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Link de Definição de Senha
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(createdData.inviteLink, "link")}
                  className="h-7 px-2 text-xs font-medium text-primary hover:text-primary/80"
                >
                  {copiedLink ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copiar Link
                    </>
                  )}
                </Button>
              </div>
              <Input
                readOnly
                value={createdData.inviteLink}
                className="h-9 text-xs bg-background font-mono select-all text-muted-foreground"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            {/* Box Mensagem Pronta */}
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mensagem Pronta para Envio
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(buildReadyMessage(), "message")}
                  className="h-7 px-2.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar Mensagem
                    </>
                  )}
                </Button>
              </div>

              <Textarea
                readOnly
                rows={5}
                value={buildReadyMessage()}
                className="text-xs bg-background resize-none text-foreground font-sans leading-relaxed select-all"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />

              <div className="flex items-center justify-end pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openWhatsApp}
                  className="text-xs h-8 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Abrir no WhatsApp
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" onClick={handleClose} className="w-full">
                Concluir
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
