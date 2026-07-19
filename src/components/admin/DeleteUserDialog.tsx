import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteUser, type AdminUser } from "@/hooks/useAdmin";

interface DeleteUserDialogProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
}

export function DeleteUserDialog({ user, open, onClose }: DeleteUserDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const deleteMutation = useDeleteUser();

  if (!user) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return;

    try {
      await deleteMutation.mutateAsync({ id: user.id, email: user.email });
      setConfirmEmail("");
      onClose();
    } catch (err) {
      // toast is already handled inside the hook
    }
  };

  const isMatched = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Excluir usuário</DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <div>
              Você está prestes a excluir o usuário:
              <div className="font-semibold text-foreground mt-1">Nome: {user.full_name || "—"}</div>
              <div className="font-semibold text-foreground">E-mail: {user.email}</div>
            </div>
            <div className="text-amber-600 font-medium">
              Esta ação removerá o acesso do usuário à plataforma. Históricos e registros antigos serão preservados.
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="confirm-email" className="text-foreground font-semibold">
              Para confirmar, digite o e-mail:
            </Label>
            <Input
              id="confirm-email"
              placeholder={user.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="border-destructive focus-visible:ring-destructive font-medium"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmEmail("");
                onClose();
              }}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isMatched || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
