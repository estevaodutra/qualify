import { useState } from "react";
import { useAdminUsers, useToggleSuperadmin } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Shield, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsers() {
  const { data, isLoading } = useAdminUsers();
  const toggle = useToggleSuperadmin();
  const [search, setSearch] = useState("");

  const filtered = (data || []).filter((u) =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Todos os usuários da plataforma</p>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>{u.company_count}</TableCell>
                  <TableCell>
                    {u.is_superadmin ? <Badge variant="destructive">Superadmin</Badge> :
                      u.company_count === 0 ? <Badge variant="outline">Aguardando</Badge> :
                      <Badge variant="secondary">Usuário</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(u.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => toggle.mutate({ user_id: u.id, make: !u.is_superadmin })}
                    >
                      {u.is_superadmin ? <><ShieldOff className="mr-2 h-3.5 w-3.5" /> Remover admin</> : <><Shield className="mr-2 h-3.5 w-3.5" /> Tornar admin</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
