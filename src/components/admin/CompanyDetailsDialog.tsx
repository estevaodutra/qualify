import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminCompanyDetails } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CompanyDetailsDialog({
  companyId, open, onClose, onAddBalance,
}: { companyId: string | null; open: boolean; onClose: () => void; onAddBalance: () => void }) {
  const { data, isLoading } = useAdminCompanyDetails(companyId);

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
              <h3 className="font-semibold mb-2">Membros ({data.members.length})</h3>
              <ul className="divide-y border rounded-md">
                {data.members.map((m: any) => (
                  <li key={m.id} className="px-3 py-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{m.full_name || m.email}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                    <Badge variant="outline">{m.role}</Badge>
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
