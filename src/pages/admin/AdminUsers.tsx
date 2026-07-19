import { useState } from "react";
import { useAdminUsers, useToggleSuperadmin, type AdminUser } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Shield, ShieldOff, MoreHorizontal, Trash2, Plus } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminUsers() {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading } = useAdminUsers(showDeleted);
  const { isSuperadmin } = useSuperadmin();
  const toggle = useToggleSuperadmin();
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  const filtered = (data || []).filter((u) =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Todos os usuários da plataforma</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        
        {isSuperadmin && (
          <div className="flex items-center space-x-2">
            <Switch
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={setShowDeleted}
            />
            <Label htmlFor="show-deleted" className="cursor-pointer">Mostrar excluídos</Label>
          </div>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresas</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id} className={u.is_deleted ? "opacity-60 bg-muted/20" : ""}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {u.full_name || "—"}
                      {u.is_deleted && <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">Excluído</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>{u.company_count}</TableCell>
                  <TableCell>
                    {u.is_superadmin ? <Badge variant="destructive">Superadmin</Badge> :
                      u.company_count === 0 ? <Badge variant="outline">Aguardando</Badge> :
                      <Badge variant="secondary">Usuário</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(u.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => toggle.mutate({ user_id: u.id, make: !u.is_superadmin })}
                        disabled={u.is_deleted}
                      >
                        {u.is_superadmin ? <><ShieldOff className="mr-2 h-3.5 w-3.5" /> Remover admin</> : <><Shield className="mr-2 h-3.5 w-3.5" /> Tornar admin</>}
                      </Button>

                      {isSuperadmin && !u.is_deleted && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDeletingUser(u)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreateUserDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />

      <DeleteUserDialog
        user={deletingUser}
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
      />
    </div>
  );
}
