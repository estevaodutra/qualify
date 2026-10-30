import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAdminCompanyDetailView } from "@/hooks/useAdminExtended";
import { useToggleCompanyActive } from "@/hooks/useAdmin";
import { AdminSubSidebar, SubSidebarItem } from "@/components/admin/AdminSubSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Building2,
  Users,
  CreditCard,
  Gauge,
  Workflow,
  Sparkles,
  ScrollText,
  Settings,
  ArrowLeft,
  Power,
  PowerOff,
  UserPlus,
  Trash2,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Activity,
  Plus,
} from "lucide-react";
import { AddBalanceManualDialog } from "@/components/admin/AddBalanceManualDialog";
import { toast } from "sonner";

const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtUsd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useAdminCompanyDetailView(id);
  const toggleActive = useToggleCompanyActive();

  const [activeSection, setActiveSection] = useState<string>("visao-geral");
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const { company, owner, wallet, members, plan, stats, instances, metaAccounts, recentAiExecutions } = data;

  const handleToggleStatus = async () => {
    try {
      await toggleActive.mutateAsync({ id: company.id, is_active: !company.is_active });
      toast.success(company.is_active ? "Empresa suspensa com sucesso." : "Empresa reativada com sucesso.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status da empresa.");
    }
  };

  // Subsidebar Items
  const sidebarItems: SubSidebarItem[] = [
    { title: "Visão Geral", url: `#visao-geral`, icon: Building2, description: "Resumo da conta" },
    { title: "Usuários", url: `#usuarios`, icon: Users, badge: members.length, description: "Membros da equipe" },
    { title: "Plano", url: `#plano`, icon: CreditCard, description: "Limites e assinatura" },
    { title: "Uso & Carteira", url: `#uso`, icon: Gauge, description: "Consumo e saldo" },
    { title: "Integrações", url: `#integracoes`, icon: Radio, badge: stats.connectedAccountsCount, description: "WhatsApp & Meta" },
    { title: "IA", url: `#ia`, icon: Sparkles, badge: stats.aiExecutionsCount, description: "Execuções e tokens" },
    { title: "Logs", url: `#logs`, icon: ScrollText, description: "Auditoria e tráfego" },
    { title: "Configurações", url: `#configuracoes`, icon: Settings, description: "Parâmetros técnicos" },
  ];

  return (
    <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Subsidebar Contextual da Empresa */}
      <AdminSubSidebar
        title={company.name}
        subtitle={owner?.email || "Sem proprietário"}
        icon={Building2}
        badge={
          <Badge
            variant={company.is_active ? "outline" : "secondary"}
            className={`text-[10px] ${
              company.is_active
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {company.is_active ? "Ativa" : "Suspensa"}
          </Badge>
        }
        items={sidebarItems.map((item) => ({
          ...item,
          url: item.url,
          end: activeSection === item.url.replace("#", ""),
        }))}
        headerActions={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate("/admin/empresas")}
            title="Voltar para empresas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      {/* Conteúdo Contextual da Empresa */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl">
        {/* Barra superior de identificação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{company.name}</h2>
              <Badge variant={company.is_active ? "default" : "secondary"}>
                {company.is_active ? "Em Operação" : "Inativa"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ID: <span className="font-mono">{company.id}</span> • Criada em{" "}
              {format(new Date(company.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={company.is_active ? "destructive" : "default"}
              size="sm"
              className="h-8 text-xs"
              onClick={handleToggleStatus}
              disabled={toggleActive.isPending}
            >
              {company.is_active ? (
                <>
                  <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Suspender
                </>
              ) : (
                <>
                  <Power className="mr-1.5 h-3.5 w-3.5" /> Reativar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setBalanceDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Ajustar Saldo
            </Button>
          </div>
        </div>

        {/* 1. VISÃO GERAL */}
        <section id="visao-geral" className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visão Geral Operacional
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium">Saldo Atual</span>
              <div className="text-lg font-bold font-mono mt-1">{fmtBrl(wallet?.balance || 0)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reservado: {fmtBrl(wallet?.reserved_balance || 0)}</p>
            </Card>

            <Card className="p-3 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium">Consumo Total</span>
              <div className="text-lg font-bold font-mono mt-1 text-destructive">
                {fmtBrl(stats.consumedTotal)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Recarregado: {fmtBrl(stats.rechargedTotal)}</p>
            </Card>

            <Card className="p-3 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium">Contas Conectadas</span>
              <div className="text-lg font-bold mt-1">{stats.connectedAccountsCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {instances.length} WhatsApp • {metaAccounts.length} Meta
              </p>
            </Card>

            <Card className="p-3 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium">Execuções de IA</span>
              <div className="text-lg font-bold text-purple-600 mt-1">{fmtNum(stats.aiExecutionsCount)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fmtNum(stats.aiTokensTotal)} tokens ({fmtUsd(stats.aiCostEstimatedUsd)})
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold">Ficha Cadastral</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Proprietário:</span>
                <p className="font-medium text-foreground mt-0.5">{owner?.full_name || "Não informado"}</p>
                <p className="text-muted-foreground font-mono text-[11px]">{owner?.email || "Sem email"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plano Atual:</span>
                <p className="font-medium text-foreground mt-0.5">{plan.name}</p>
                <Badge variant="outline" className="text-[10px] mt-1">{plan.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Última Recarga:</span>
                <p className="font-medium text-foreground mt-0.5">
                  {stats.lastDepositAt ? format(new Date(stats.lastDepositAt), "dd/MM/yyyy HH:mm") : "Nenhuma recarga"}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 2. USUÁRIOS */}
        <section id="usuarios" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Membros da Equipe ({members.length})
            </h3>
          </div>
          <Card>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">Nenhum membro associado a esta empresa.</p>
              ) : (
                <div className="divide-y text-xs">
                  {members.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{m.full_name || m.email || "Sem nome"}</p>
                        <p className="text-[11px] text-muted-foreground">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {m.role || "membro"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {m.joined_at ? format(new Date(m.joined_at), "dd/MM/yyyy") : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 3. INTEGRAÇÕES */}
        <section id="integracoes" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Canais &amp; Integrações Conectadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* WhatsApp */}
            <Card>
              <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-emerald-500" />
                  Instâncias WhatsApp ({instances.length})
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {instances.length === 0 ? (
                  <p className="p-3 text-muted-foreground text-xs">Nenhum número conectado.</p>
                ) : (
                  <div className="divide-y">
                    {instances.map((i) => (
                      <div key={i.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{i.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{i.phone}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            i.status === "connected"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {i.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta */}
            <Card>
              <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  <Workflow className="h-3.5 w-3.5 text-indigo-500" />
                  Contas Meta / Instagram ({metaAccounts.length})
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {metaAccounts.length === 0 ? (
                  <p className="p-3 text-muted-foreground text-xs">Nenhum perfil de Instagram vinculado.</p>
                ) : (
                  <div className="divide-y">
                    {metaAccounts.map((a) => (
                      <div key={a.id} className="p-2.5 flex items-center justify-between">
                        <span className="font-medium">@{a.username}</span>
                        <Badge variant={a.is_active ? "outline" : "secondary"} className="text-[10px]">
                          {a.status || (a.is_active ? "Conectada" : "Desconectada")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. IA */}
        <section id="ia" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execuções Recentes de IA
          </h3>
          <Card>
            <CardContent className="p-0">
              {recentAiExecutions.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">Esta empresa ainda não executou Skills de IA.</p>
              ) : (
                <div className="divide-y text-xs">
                  {recentAiExecutions.map((ex) => (
                    <div key={ex.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{ex.skill_name || ex.action}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{ex.model}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {ex.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {ex.total_tokens ? `${fmtNum(ex.total_tokens)} tok` : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Modal de Adicionar Saldo */}
      {company && (
        <AddBalanceManualDialog
          company={{
            id: company.id,
            name: company.name,
            balance: wallet?.balance || 0,
            reserved_balance: wallet?.reserved_balance || 0,
            is_active: company.is_active,
            owner_id: company.owner_id,
            created_at: company.created_at,
          }}
          open={balanceDialogOpen}
          onClose={() => {
            setBalanceDialogOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
