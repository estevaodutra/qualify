import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminCompanies, useAdminTransactions } from "@/hooks/useAdmin";
import {
  CreditCard,
  Check,
  Shield,
  Layers,
  Sparkles,
  Radio,
  Workflow,
  ArrowRight,
  TrendingUp,
  History,
  Info,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const platformPlans = [
  {
    id: "free",
    name: "Free / Degustação",
    price: "R$ 0",
    period: "para testes",
    dispatches: "1.000 msgs",
    instances: "1 WhatsApp",
    campaigns: "1 ativa",
    aiSkills: "Básicas",
    description: "Ideal para homologação e onboarding inicial de novos clientes.",
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 197",
    period: "/mês",
    dispatches: "10.000 msgs",
    instances: "3 WhatsApp",
    campaigns: "5 ativas",
    aiSkills: "Estrategista + Roteirista",
    description: "Para pequenas operações comerciais com automação de atendimento.",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 497",
    period: "/mês",
    dispatches: "35.000 msgs",
    instances: "10 WhatsApp",
    campaigns: "15 ativas",
    aiSkills: "Todas as Skills + Criafy",
    description: "Para empresas escalando múltiplos times e automação de redes.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sob Consulta",
    period: "customizado",
    dispatches: "Ilimitado*",
    instances: "Customizado",
    campaigns: "Ilimitadas",
    aiSkills: "Modelos Dedicados & Fine-tuning",
    description: "Infraestrutura dedicada com suporte SLA e limites customizados.",
  },
];

export default function AdminPlans() {
  const { data: companies = [], isLoading: compLoading } = useAdminCompanies();
  const { data: transactions = [], isLoading: txLoading } = useAdminTransactions();

  const totalActiveCompanies = companies.filter((c) => c.is_active).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Planos &amp; Assinaturas</h1>
            <Badge variant="outline" className="text-xs">
              Módulo de Cobrança Pré-paga
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Estrutura de precificação, limites de franquia, assinaturas e histórico financeiro de recargas.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3 text-xs">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Cobrança Pré-paga Ativa</p>
          <p className="text-muted-foreground mt-0.5">
            Atualmente a plataforma opera no modelo pré-pago baseado no saldo da carteira da empresa (wallets),
            onde o consumo de disparos, instâncias e tokens é debitado automaticamente. Gateways de assinatura recorrente por cartão estão prontos para ativação nas integrações.
          </p>
        </div>
      </div>

      {/* Grid de Planos da Plataforma */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Tabela de Planos da Plataforma
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {platformPlans.map((p) => (
            <Card
              key={p.id}
              className={`relative flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm ${
                p.popular ? "border-primary/50 shadow-md bg-primary/[0.02]" : ""
              }`}
            >
              {p.popular && (
                <Badge className="absolute -top-2.5 right-4 text-[10px] bg-primary">
                  Mais Usado
                </Badge>
              )}
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold">{p.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.period}</span>
                </div>
                <CardDescription className="text-xs mt-2 line-clamp-2">{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2.5 text-xs">
                <div className="divide-y text-muted-foreground">
                  <div className="py-1.5 flex justify-between">
                    <span>Disparos:</span>
                    <span className="font-semibold text-foreground">{p.dispatches}</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Instâncias WhatsApp:</span>
                    <span className="font-semibold text-foreground">{p.instances}</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Campanhas:</span>
                    <span className="font-semibold text-foreground">{p.campaigns}</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Skills de IA:</span>
                    <span className="font-semibold text-foreground">{p.aiSkills}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Histórico Recente de Recargas Reais */}
      <Card>
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-500" />
              Histórico de Recargas &amp; Transações Financeiras
            </CardTitle>
            <CardDescription className="text-xs">
              Extrato consolidado de depósitos e ajustes manuais nas carteiras das empresas.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {transactions.length} registros
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <p className="p-6 text-xs text-muted-foreground text-center">Carregando transações...</p>
          ) : transactions.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground text-center">
              Nenhuma recarga ou transação financeira registrada até o momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/40">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Empresa / ID</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {transactions.slice(0, 15).map((t: any) => (
                    <TableRow key={t.id} className="hover:bg-muted/40">
                      <TableCell className="text-muted-foreground">
                        {t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.company_name || t.company_id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            t.type === "deposit"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : t.type === "adjustment"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {t.description || "Ajuste de saldo operacional"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span className={Number(t.amount) >= 0 ? "text-emerald-600" : "text-destructive"}>
                          {fmtBrl(Number(t.amount))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
