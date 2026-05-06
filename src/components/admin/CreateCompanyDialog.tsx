import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCompany, useAdminUsers } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";

interface CreateCompanyDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCompanyDialog({ open, onClose }: CreateCompanyDialogProps) {
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const { data: users } = useAdminUsers();
  const create = useCreateCompany();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerId) return;

    // Check if user already has a company
    const selectedUser = users?.find(u => u.id === ownerId);
    if (selectedUser && selectedUser.company_count > 0) {
      toast({
        title: "Usuário já possui empresa",
        description: "Este usuário já está vinculado a uma organização. O sistema agora permite apenas uma empresa por usuário.",
        variant: "destructive"
      });
      return;
    }

    create.mutate(
      { name, owner_id: ownerId },
      {
        onSuccess: () => {
          setName("");
          setOwnerId("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input
              id="company-name"
              placeholder="Ex: Qualify Tech"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-owner">Dono da Empresa</Label>
            <Select value={ownerId} onValueChange={setOwnerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Criando..." : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
