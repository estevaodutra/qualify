import { useState } from "react";
import { useAdminCompanies, useToggleCompanyActive, type AdminCompany } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, Eye, Power, PowerOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { CompanyDetailsDialog } from "@/components/admin/CompanyDetailsDialog";
import { AddBalanceManualDialog } from "@/components/admin/AddBalanceManualDialog";
import { CreateCompanyDialog } from "@/components/admin/CreateCompanyDialog";
import { DeleteCompanyDialog } from "@/components/admin/DeleteCompanyDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/contexts/CompanyContext";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminCompanies() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading } = useAdminCompanies(showDeleted);
  const { isSuperadmin } = useSuperadmin();
  const toggle = useToggleCompanyActive();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [details, setDetails] = useState<AdminCompany | null>(null);
  const [credit, setCredit] = useState<AdminCompany | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<AdminCompany | null>(null);
  const { impersonateCompany } = useCompany();

  const filtered = (data || []).filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.owner_email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !c.is_active) return false;
    if (statusFilter === "inactive" && c.is_active) return false;
    if (balanceFilter === "with" && (c.balance ?? 0) <= 0) return false;
    if (balanceFilter === "without" && (c.balance ?? 0) > 0) return false;
    if (balanceFilter === "low" && ((c.balance ?? 0) >= 50 || (c.balance ?? 0) <= 0)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gerencie todas as empresas da plataforma</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos saldos</SelectItem>
                <SelectItem value="with">Com saldo</SelectItem>
                <SelectItem value="without">Sem saldo</SelectItem>
                <SelectItem value="low">Saldo baixo (&lt;R$ 50)</SelectItem>
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
              <Label htmlFor="show-deleted-companies" className="cursor-pointer">Mostrar excluídas</Label>
            </div>
          )}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Consumo do mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className={c.is_deleted ? "opacity-60 bg-muted/20" : ""}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {c.name}
                      {c.is_deleted && (
                        <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">
                          Excluída
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.owner_email || "—"}</TableCell>
                  <TableCell>{c.is_deleted ? "—" : c.member_count}</TableCell>
                  <TableCell className="text-right font-mono">{c.is_deleted ? "—" : fmt(c.balance ?? 0)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{c.is_deleted ? "—" : fmt(c.month_consumption ?? 0)}</TableCell>
                  <TableCell>
                    {c.is_deleted ? (
                      <Badge variant="destructive">Excluída</Badge>
                    ) : (
                      <Badge variant={c.is_active ? "default" : "secondary"}>
                        {c.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetails(c)} disabled={c.is_deleted}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCredit(c)} disabled={c.is_deleted}>
                          <Plus className="mr-2 h-4 w-4" /> Adicionar saldo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggle.mutate({ id: c.id, is_active: !c.is_active })}
                          className={c.is_active ? "text-destructive" : ""}
                          disabled={c.is_deleted}
                        >
                          {c.is_active ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                          {c.is_active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { impersonateCompany(c.id); window.location.href = "/"; }}
                          disabled={c.is_deleted}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Personificar
                        </DropdownMenuItem>
                        {isSuperadmin && !c.is_deleted && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingCompany(c)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir Empresa
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CompanyDetailsDialog
        companyId={details?.id ?? null}
        open={!!details}
        onClose={() => setDetails(null)}
        onAddBalance={() => { if (details) { setCredit(details); setDetails(null); } }}
      />

      <AddBalanceManualDialog
        company={credit}
        open={!!credit}
        onClose={() => setCredit(null)}
      />

      <CreateCompanyDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />

      <DeleteCompanyDialog
        company={deletingCompany}
        open={!!deletingCompany}
        onClose={() => setDeletingCompany(null)}
      />
    </div>
  );
}
