import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWalletTransactions } from "@/hooks/useWallet";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const fmt = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  deposit: { label: "Recarga", variant: "default" },
  consumption: { label: "Consumo", variant: "destructive" },
  refund: { label: "Estorno", variant: "secondary" },
  adjustment: { label: "Ajuste", variant: "outline" },
};

export default function ExtratoPage() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("30d");
  const [filter, setFilter] = useState<"all" | "deposit" | "consumption" | "adjustment">("all");

  const { from } = useMemo(() => {
    const now = new Date();
    if (period === "today") { now.setHours(0, 0, 0, 0); return { from: now.toISOString() }; }
    if (period === "7d") return { from: new Date(Date.now() - 7 * 86400000).toISOString() };
    if (period === "30d") return { from: new Date(Date.now() - 30 * 86400000).toISOString() };
    return { from: undefined };
  }, [period]);

  const types = filter === "all"
    ? undefined
    : filter === "adjustment" ? ["adjustment", "refund"] : [filter];

  const txs = useWalletTransactions({ limit: 200, types, from });

  const summary = useMemo(() => {
    const rows = txs.data || [];
    let credits = 0, debits = 0;
    for (const r of rows) {
      const a = Number(r.amount);
      if (a >= 0) credits += a; else debits += Math.abs(a);
    }
    const last = rows[0]; const first = rows[rows.length - 1];
    return {
      credits, debits,
      initial: first ? Number(first.balance_before) : 0,
      final: last ? Number(last.balance_after) : 0,
    };
  }, [txs.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extrato"
        description="Histórico completo de movimentações"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/carteira"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="deposit">Recargas</SelectItem>
            <SelectItem value="consumption">Consumo</SelectItem>
            <SelectItem value="adjustment">Ajustes/Estornos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total recargas</p><p className="mt-1 text-xl font-semibold text-success">{fmt(summary.credits)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total consumo</p><p className="mt-1 text-xl font-semibold text-destructive">{fmt(summary.debits)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo inicial</p><p className="mt-1 text-xl font-semibold">{fmt(summary.initial)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo final</p><p className="mt-1 text-xl font-semibold">{fmt(summary.final)}</p></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Saldo após</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : !txs.data || txs.data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Sem transações no período.</TableCell></TableRow>
            ) : (
              txs.data.map((t) => {
                const meta = typeMap[t.type] || { label: t.type, variant: "outline" as const };
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{new Date(t.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-sm">{t.description || "-"}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                      {Number(t.amount) >= 0 ? "+" : ""}{fmt(Number(t.amount))}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmt(Number(t.balance_after))}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
