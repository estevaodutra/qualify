import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminCompanies, useToggleCompanyActive, type AdminCompany } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  Power,
  PowerOff,
  Trash2,
  DollarSign,
  ScrollText,
  Gauge,
  Radio,
  Sparkles,
  Building2,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { AddBalanceManualDialog } from "@/components/admin/AddBalanceManualDialog";
import { CreateCompanyDialog } from "@/components/admin/CreateCompanyDialog";
import { DeleteCompanyDialog } from "@/components/admin/DeleteCompanyDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

export default function AdminCompanies() {
  const navigate = useNavigate();
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading } = useAdminCompanies(showDeleted);
  const { isSuperadmin } = useSuperadmin();
  const toggle = useToggleCompanyActive();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [credit, setCredit] = useState<AdminCompany | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<AdminCompany | null>(null);

  const filtered = useMemo(() => {
    return (data || []).filter((c) => {
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.owner_email?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (balanceFilter === "with" && (c.balance ?? 0) <= 0) return false;
      if (balanceFilter === "without" && (c.balance ?? 0) > 0) return false;
      if (balanceFilter === "low" && ((c.balance ?? 0) >= 50 || (c.balance ?? 0) <= 0)) return false;
      return true;
    });
  }, [data, search, statusFilter, balanceFilter]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Empresas &amp; Tenants</h1>
            <Badge variant="outline" className="text-xs">
              {filtered.length} {filtered.length === 1 ? "empresa" : "empresas"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão operacional centralizada de contas, limites, planos e acessos.
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)} className="h-8 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova Empresa
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Apenas Ativas</SelectItem>
                <SelectItem value="inactive">Apenas Inativas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue placeholder="Saldo / Uso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Saldos</SelectItem>
                <SelectItem value="with">Com saldo positivo</SelectItem>
                <SelectItem value="without">Sem saldo (zeradas)</SelectItem>
                <SelectItem value="low">Saldo baixo (&lt; R$ 50)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSuperadmin && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-deleted-companies"
                checked={showDeleted}
                onCheckedChange={setShowDeleted}
              />
              <Label htmlFor="show-deleted-companies" className="text-xs text-muted-foreground cursor-pointer">
                Exibir excluídas
              </Label>
            </div>
          )}
        </div>
      </Card>

      {/* Tabela de Empresas */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground text-sm">Nenhuma empresa encontrada</p>
            <p className="text-xs mt-1">Ajuste os filtros ou crie uma nova empresa para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/40">
                  <TableHead className="font-semibold">Empresa</TableHead>
                  <TableHead className="font-semibold">Plano</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Usuários</TableHead>
                  <TableHead className="font-semibold text-center">Contas Conectadas</TableHead>
                  <TableHead className="font-semibold text-right">Saldo / Consumo</TableHead>
                  <TableHead className="font-semibold text-center">Criada em</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/admin/empresas/${c.id}`)}
                  >
                    {/* Empresa */}
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/empresas/${c.id}`)}
                      >
                        <div className="font-semibold text-foreground hover:text-primary transition-colors">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{c.owner_email || "Sem email"}</div>
                      </div>
                    </TableCell>

                    {/* Plano */}
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {c.plan_name || "Padrão"}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={c.is_active ? "outline" : "secondary"}
                        className={`text-[10px] ${
                          c.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {c.is_active ? "Ativa" : "Suspensa"}
                      </Badge>
                    </TableCell>

                    {/* Usuários */}
                    <TableCell className="text-center">
                      <span className="font-medium">{c.member_count ?? 1}</span>
                    </TableCell>

                    {/* Contas conectadas */}
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {c.connected_accounts_count ?? 0}
                      </Badge>
                    </TableCell>

                    {/* Saldo / Consumo */}
                    <TableCell className="text-right">
                      <div className="font-mono font-medium">{fmtBrl(c.balance ?? 0)}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Consumo: {fmtBrl(c.month_consumption ?? 0)}
                      </div>
                    </TableCell>

                    {/* Criada em */}
                    <TableCell className="text-center text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy")}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => navigate(`/admin/empresas/${c.id}`)}>
                            <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> Abrir Cockpit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCredit(c)}>
                            <DollarSign className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Ajustar Saldo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/uso?company_id=${c.id}`)}>
                            <Gauge className="mr-2 h-3.5 w-3.5" /> Ver Uso &amp; Limites
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/sistema/logs?company_id=${c.id}`)}>
                            <ScrollText className="mr-2 h-3.5 w-3.5" /> Ver Logs
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => toggle.mutate({ id: c.id, is_active: !c.is_active })}
                          >
                            {c.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-3.5 w-3.5 text-amber-500" /> Suspender Empresa
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Reativar Empresa
                              </>
                            )}
                          </DropdownMenuItem>

                          {isSuperadmin && (
                            <DropdownMenuItem
                              onClick={() => setDeletingCompany(c)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir Permanentemente
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Modais de Operação */}
      {credit && (
        <AddBalanceManualDialog
          company={credit}
          open={!!credit}
          onClose={() => setCredit(null)}
        />
      )}

      <CreateCompanyDialog open={isCreating} onClose={() => setIsCreating(false)} />

      {deletingCompany && (
        <DeleteCompanyDialog
          company={deletingCompany}
          open={!!deletingCompany}
          onClose={() => setDeletingCompany(null)}
        />
      )}
    </div>
  );
}
