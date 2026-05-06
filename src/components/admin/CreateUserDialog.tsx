import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { signUp } = useAuth();
  const qc = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;

    setIsPending(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;

      toast({ 
        title: "Usuário criado", 
        description: "O usuário foi registrado. Ele pode precisar confirmar o email dependendo das configurações do Supabase." 
      });
      
      setEmail("");
      setFullName("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nome Completo</Label>
            <Input
              id="user-name"
              placeholder="Ex: João Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">Senha Provisória</Label>
            <Input
              id="user-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
