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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, Eye, Power, PowerOff } from "lucide-react";
import { format } from "date-fns";
import { CompanyDetailsDialog } from "@/components/admin/CompanyDetailsDialog";
import { AddBalanceManualDialog } from "@/components/admin/AddBalanceManualDialog";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminCompanies() {
  const { data, isLoading } = useAdminCompanies();
  const toggle = useToggleCompanyActive();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [details, setDetails] = useState<AdminCompany | null>(null);
  const [credit, setCredit] = useState<AdminCompany | null>(null);

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
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
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
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.owner_email || "—"}</TableCell>
                  <TableCell>{c.member_count}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(c.balance ?? 0)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(c.month_consumption ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetails(c)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCredit(c)}>
                          <Plus className="mr-2 h-4 w-4" /> Adicionar saldo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggle.mutate({ id: c.id, is_active: !c.is_active })}
                          className={c.is_active ? "text-destructive" : ""}
                        >
                          {c.is_active ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                          {c.is_active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
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
    </div>
  );
}
