import { useState } from "react";
import { useAdminTransactions } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminTransactions() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("all");
  const { data, isLoading } = useAdminTransactions({
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
    type,
  });

  const totals = (data || []).reduce(
    (acc: any, t: any) => {
      const a = Number(t.amount);
      if (t.type === "deposit" && a > 0) acc.deposits += a;
      if (t.type === "consumption") acc.consumption += Math.abs(a);
      if (t.type === "adjustment") acc.adjustments += a;
      return acc;
    },
    { deposits: 0, consumption: 0, adjustments: 0 },
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        <p className="text-muted-foreground">Histórico financeiro consolidado</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[180px]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[180px]" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="deposit">Recargas</SelectItem>
              <SelectItem value="consumption">Consumo</SelectItem>
              <SelectItem value="adjustment">Ajustes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-sm text-muted-foreground">Recargas</div><div className="text-xl font-bold text-success">{fmt(totals.deposits)}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Consumo</div><div className="text-xl font-bold text-destructive">{fmt(totals.consumption)}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Ajustes</div><div className="text-xl font-bold">{fmt(totals.adjustments)}</div></Card>
      </div>

      <Card>
        {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo após</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma transação</TableCell></TableRow>
              ) : (data || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                  <TableCell className="text-sm">{t.category || "—"}</TableCell>
                  <TableCell className="text-sm max-w-md truncate">{t.description || "—"}</TableCell>
                  <TableCell className={`text-right font-mono ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>{fmt(Number(t.amount))}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(Number(t.balance_after))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
