import { useState, useMemo } from "react";
import { useAdminUsers, useToggleSuperadmin, type AdminUser, useAdminCompanies } from "@/hooks/useAdmin";
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
  Search,
  Shield,
  ShieldOff,
  MoreHorizontal,
  Trash2,
  Plus,
  KeyRound,
  Users,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminUsers() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: users, isLoading } = useAdminUsers(showDeleted);
  const { data: companies = [] } = useAdminCompanies();
  const { isSuperadmin } = useSuperadmin();
  const toggleSuperadmin = useToggleSuperadmin();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUserForLink, setSelectedUserForLink] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      if (
        search &&
        !u.email?.toLowerCase().includes(search.toLowerCase()) &&
        !u.full_name?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (roleFilter === "superadmin" && !u.is_superadmin) return false;
      if (roleFilter === "regular" && u.is_superadmin) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const handleOpenCreate = () => {
    setSelectedUserForLink(null);
    setIsCreating(true);
  };

  const handleGenerateLink = (user: AdminUser) => {
    setSelectedUserForLink(user);
    setIsCreating(true);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários da Plataforma</h1>
            <Badge variant="outline" className="text-xs">
              {filteredUsers.length} {filteredUsers.length === 1 ? "usuário" : "usuários"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão global de acessos, privilégios de superadmin e vínculos com empresas.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="h-8 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo Usuário
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Privilégio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Privilégios</SelectItem>
                <SelectItem value="superadmin">Apenas Superadmins</SelectItem>
                <SelectItem value="regular">Usuários Padrão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSuperadmin && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-deleted-users"
                checked={showDeleted}
                onCheckedChange={setShowDeleted}
              />
              <Label htmlFor="show-deleted-users" className="text-xs text-muted-foreground cursor-pointer">
                Exibir excluídos
              </Label>
            </div>
          )}
        </div>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground text-sm">Nenhum usuário encontrado</p>
            <p className="text-xs mt-1">Ajuste os filtros ou crie um novo usuário para a plataforma.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/40">
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold text-center">Privilégio</TableHead>
                  <TableHead className="font-semibold text-center">Empresas Vinculadas</TableHead>
                  <TableHead className="font-semibold text-center">Criado em</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                    {/* Nome */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{u.full_name || "—"}</span>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="font-mono text-muted-foreground">
                      {u.email}
                    </TableCell>

                    {/* Privilégio */}
                    <TableCell className="text-center">
                      {u.is_superadmin ? (
                        <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0.5">
                          <Shield className="h-3 w-3" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Membro
                        </Badge>
                      )}
                    </TableCell>

                    {/* Empresas Vinculadas */}
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {u.company_count ?? 0} {u.company_count === 1 ? "empresa" : "empresas"}
                      </Badge>
                    </TableCell>

                    {/* Criado em */}
                    <TableCell className="text-center text-muted-foreground">
                      {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : "—"}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => handleGenerateLink(u)}>
                            <KeyRound className="mr-2 h-3.5 w-3.5 text-primary" /> Link de Acesso / Senha
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              toggleSuperadmin.mutate({ user_id: u.id, make: !u.is_superadmin })
                            }
                          >
                            {u.is_superadmin ? (
                              <>
                                <ShieldOff className="mr-2 h-3.5 w-3.5 text-amber-500" /> Revogar Superadmin
                              </>
                            ) : (
                              <>
                                <Shield className="mr-2 h-3.5 w-3.5 text-destructive" /> Promover a Superadmin
                              </>
                            )}
                          </DropdownMenuItem>

                          {isSuperadmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingUser(u)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir Usuário
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
          </div>
        )}
      </Card>

      {/* Modais */}
      <CreateUserDialog
        open={isCreating}
        onClose={() => {
          setIsCreating(false);
          setSelectedUserForLink(null);
        }}
        prefillUser={selectedUserForLink}
      />

      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}
