import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminCompanyDetails, useAddCompanyMember, useRemoveCompanyMember, useAdminUsers } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CompanyDetailsDialog({
  companyId, open, onClose, onAddBalance,
}: { companyId: string | null; open: boolean; onClose: () => void; onAddBalance: () => void }) {
  const { data, isLoading } = useAdminCompanyDetails(companyId);
  const { data: allUsers } = useAdminUsers();
  const addMember = useAddCompanyMember();
  const removeMember = useRemoveCompanyMember();

  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("operator");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleAddMember = async () => {
    if (!companyId || !newMemberId) return;

    // Check if user already has a company
    const selectedUser = allUsers?.find(u => u.id === newMemberId);
    if (selectedUser && selectedUser.company_count > 0) {
      toast({
        title: "Usuário já possui empresa",
        description: "Este usuário já está vinculado a uma organização. O sistema permite apenas uma empresa por usuário.",
        variant: "destructive"
      });
      return;
    }

    addMember.mutate(
      { company_id: companyId, user_id: newMemberId, role: newMemberRole },
      {
        onSuccess: () => {
          setNewMemberId("");
          setIsAddingMember(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.company?.name || "Detalhes da empresa"}</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="font-semibold mb-2">Informações</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Status</div>
                <div><Badge variant={data.company.is_active ? "default" : "secondary"}>{data.company.is_active ? "Ativa" : "Inativa"}</Badge></div>
                <div className="text-muted-foreground">Criada em</div>
                <div>{format(new Date(data.company.created_at), "dd/MM/yyyy HH:mm")}</div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Financeiro</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Saldo atual</div>
                <div className="font-mono font-semibold">{fmt(Number(data.wallet?.balance ?? 0))}</div>
                <div className="text-muted-foreground">Saldo reservado</div>
                <div className="font-mono">{fmt(Number(data.wallet?.reserved_balance ?? 0))}</div>
                <div className="text-muted-foreground">Total recarregado</div>
                <div className="font-mono">{fmt(data.totals.recharged)}</div>
                <div className="text-muted-foreground">Total consumido</div>
                <div className="font-mono">{fmt(data.totals.consumed)}</div>
                <div className="text-muted-foreground">Última recarga</div>
                <div>{data.lastDepositAt ? format(new Date(data.lastDepositAt), "dd/MM/yyyy HH:mm") : "—"}</div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Membros ({data.members.length})</h3>
                <Button variant="outline" size="sm" onClick={() => setIsAddingMember(!isAddingMember)}>
                  {isAddingMember ? <X className="h-4 w-4 mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                  {isAddingMember ? "Cancelar" : "Adicionar"}
                </Button>
              </div>

              {isAddingMember && (
                <div className="flex gap-2 mb-4 p-3 bg-muted rounded-md animate-fade-in">
                  <div className="flex-1">
                    <Select value={newMemberId} onValueChange={setNewMemberId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Escolha um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers?.filter(u => !data.members.find((m: any) => m.user_id === u.id)).map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddMember} disabled={!newMemberId || addMember.isPending}>
                    {addMember.isPending ? "..." : "Adicionar"}
                  </Button>
                </div>
              )}

              <ul className="divide-y border rounded-md">
                {data.members.map((m: any) => (
                  <li key={m.id} className="px-3 py-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{m.full_name || m.email}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{m.role}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm("Remover este membro?")) {
                            removeMember.mutate({ company_id: companyId!, user_id: m.user_id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
                {data.members.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum membro</li>}
              </ul>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={onAddBalance}><Plus className="mr-2 h-4 w-4" /> Adicionar saldo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
