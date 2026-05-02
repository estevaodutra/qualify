import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ShieldAlert, UserPlus } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  not_admin: "Você precisa ser administrador desta empresa.",
  user_not_found: "Nenhum usuário com este email. Peça para que ele crie uma conta primeiro.",
  already_member: "Este usuário já é membro da empresa.",
};

export default function MembersPage() {
  const { activeCompany, isAdmin } = useCompany();
  const { members, isLoading, addMember, removeMember } = useCompanyMembers();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [extension, setExtension] = useState("");

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acesso restrito</CardTitle>
            </div>
            <CardDescription>
              Apenas administradores podem gerenciar membros desta empresa.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const result: any = await addMember.mutateAsync({
        email: email.trim().toLowerCase(),
        role,
        extension: extension.trim() || undefined,
      });
      toast({
        title: "Membro adicionado",
        description: `${result?.member_name || email} agora faz parte de ${activeCompany?.name}.`,
      });
      setEmail("");
      setExtension("");
      setRole("operator");
    } catch (err) {
      const code = (err as Error).message;
      toast({
        title: "Não foi possível adicionar",
        description: ERROR_MESSAGES[code] || code,
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remover ${name} desta empresa?`)) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast({ title: "Membro removido" });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Membros da empresa</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie quem tem acesso a {activeCompany?.name || "esta empresa"}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Adicionar membro</CardTitle>
          </div>
          <CardDescription>
            O usuário precisa já ter uma conta no DispatchOne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-[1fr_180px_140px_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "operator")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-ext">Ramal (opcional)</Label>
              <Input
                id="member-ext"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder="1001"
              />
            </div>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Adicionar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros atuais</CardTitle>
          <CardDescription>{members.length} membro(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum membro ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Entrou em</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                        {m.role === "admin" ? "Administrador" : "Operador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joined_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(m.id, m.full_name || m.email || "este membro")}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
