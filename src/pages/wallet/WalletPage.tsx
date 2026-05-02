import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet as WalletIcon, Plus, ArrowRight, Phone, Bot, ArrowDownToLine, ArrowUpFromLine, Settings } from "lucide-react";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { useWallet, useWalletTransactions, useMonthConsumption, type WalletTransaction } from "@/hooks/useWallet";
import { AddBalanceDialog } from "@/components/wallet/AddBalanceDialog";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const fmt = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function statusOf(balance: number, alert: number | null) {
  if (balance <= 0) return { label: "Sem saldo", color: "bg-destructive text-destructive-foreground" };
  if (alert && balance < alert) return { label: "Saldo baixo", color: "bg-warning text-warning-foreground" };
  return { label: "Saldo OK", color: "bg-success text-success-foreground" };
}

function txIcon(t: WalletTransaction) {
  if (t.type === "deposit" || t.type === "refund" || t.type === "adjustment") return <ArrowDownToLine className="h-4 w-4 text-success" />;
  if (t.category === "call") return <Phone className="h-4 w-4 text-destructive" />;
  if (t.category === "ura") return <Bot className="h-4 w-4 text-destructive" />;
  return <ArrowUpFromLine className="h-4 w-4 text-destructive" />;
}

export default function WalletPage() {
  const [openAdd, setOpenAdd] = useState(false);
  const wallet = useWallet();
  const txs = useWalletTransactions({ limit: 5 });
  const month = useMonthConsumption();

  const balance = Number(wallet.data?.balance || 0);
  const reserved = Number(wallet.data?.reserved_balance || 0);
  const available = balance - reserved;
  const status = statusOf(balance, wallet.data?.low_balance_alert ?? null);
  const callMinutesEstimate = Math.floor(available / 0.40);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carteira"
        description="Saldo e recargas para ligações e URA"
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/carteira/extrato">Ver extrato</Link>
            </Button>
            <Button asChild variant="outline" size="icon">
              <Link to="/carteira/configuracoes" aria-label="Configurações"><Settings className="h-4 w-4" /></Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Balance card */}
        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletIcon className="h-4 w-4" />
                <span>Saldo atual</span>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              {wallet.isLoading ? (
                <Skeleton className="mt-2 h-12 w-48" />
              ) : (
                <div className="mt-2 text-5xl font-bold tracking-tight">{fmt(balance)}</div>
              )}
              <div className="mt-2 text-sm text-muted-foreground">
                Disponível: <span className="font-medium text-foreground">{fmt(available)}</span>
                {reserved > 0 && <> · Reservado: {fmt(reserved)}</>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                ≈ {callMinutesEstimate} minutos de ligação
              </div>
            </div>
            <Button size="lg" onClick={() => setOpenAdd(true)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar saldo
            </Button>
          </div>
        </Card>

        {/* Quick recharge */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold">Recarga rápida</h3>
          <p className="mt-1 text-xs text-muted-foreground">Valores em PIX</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[250, 500, 1000, 2000].map((v) => (
              <Button key={v} variant="outline" onClick={() => setOpenAdd(true)}>{fmt(v)}</Button>
            ))}
          </div>
          <Button variant="ghost" className="mt-3 w-full" onClick={() => setOpenAdd(true)}>
            Outro valor <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Last transactions */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Últimas transações</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/carteira/extrato">Ver extrato completo <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <div className="mt-4 divide-y">
            {txs.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-10 w-full" />)
            ) : !txs.data || txs.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma transação ainda.</p>
            ) : (
              txs.data.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {txIcon(t)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description || t.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                    {Number(t.amount) >= 0 ? "+" : ""}{fmt(Number(t.amount))}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Month consumption */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold">Consumo do mês</h3>
          {month.isLoading ? (
            <Skeleton className="mt-3 h-10 w-32" />
          ) : (
            <>
              <div className="mt-2 text-3xl font-bold">{fmt(month.data?.total || 0)}</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Ligações</span>
                  <span className="font-medium">{fmt(month.data?.callTotal || 0)} <span className="text-xs text-muted-foreground">({month.data?.callMinutes || 0} min)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Bot className="h-3.5 w-3.5" /> URA</span>
                  <span className="font-medium">{fmt(month.data?.uraTotal || 0)} <span className="text-xs text-muted-foreground">({Math.round((month.data?.uraSeconds || 0) / 60)} min)</span></span>
                </div>
              </div>
              {month.data && month.data.daily.length > 0 && (
                <div className="mt-4 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={month.data.daily}>
                      <XAxis dataKey="day" tickFormatter={(d) => d.slice(8, 10)} fontSize={10} />
                      <YAxis hide />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} labelFormatter={(l) => new Date(l as string).toLocaleDateString("pt-BR")} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <AddBalanceDialog open={openAdd} onOpenChange={setOpenAdd} />
    </div>
  );
}
