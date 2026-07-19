import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDeleteCompany, type AdminCompany } from "@/hooks/useAdmin";
import { useCompany } from "@/contexts/CompanyContext";
import { AlertTriangle } from "lucide-react";

interface DeleteCompanyDialogProps {
  company: AdminCompany | null;
  open: boolean;
  onClose: () => void;
}

export function DeleteCompanyDialog({ company, open, onClose }: DeleteCompanyDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const deleteMutation = useDeleteCompany();
  const { isImpersonating, activeCompanyId, stopImpersonating } = useCompany();

  if (!company) return null;

  const isCurrentImpersonation = isImpersonating && activeCompanyId === company.id;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName.trim().toLowerCase() !== company.name.toLowerCase()) return;

    try {
      await deleteMutation.mutateAsync({ id: company.id, name: company.name });
      if (isCurrentImpersonation) {
        stopImpersonating();
      }
      setConfirmName("");
      onClose();
    } catch (err) {
      // toast is already handled inside the hook
    }
  };

  const isMatched = confirmName.trim().toLowerCase() === company.name.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Excluir empresa</DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <div>
              Você está prestes a excluir a empresa:
              <div className="font-semibold text-foreground mt-1 text-base">
                {company.name}
              </div>
            </div>
            <div className="text-amber-600 font-medium">
              Esta ação bloqueará o acesso à empresa e desativará operações vinculadas. Os dados serão preservados para auditoria e recuperação.
            </div>
          </DialogDescription>
        </DialogHeader>

        {isCurrentImpersonation && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Personificação Ativa</AlertTitle>
            <AlertDescription className="text-sm">
              Você está personificando esta empresa. Ao excluir, a personificação será encerrada.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleConfirm} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-foreground font-semibold">
              Para confirmar, digite o nome da empresa:
            </Label>
            <Input
              id="confirm-name"
              placeholder={company.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="border-destructive focus-visible:ring-destructive font-medium"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmName("");
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
              {deleteMutation.isPending ? "Excluindo..." : "Excluir empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
