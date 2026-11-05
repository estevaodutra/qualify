import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyMembers, type CompanyMember } from "@/hooks/useCompanyMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Trash2,
  ShieldAlert,
  UserPlus,
  Edit2,
  Check,
  X,
  PhoneCall,
  CheckCircle2,
  Key,
} from "lucide-react";
import { EditMemberTelephonyDialog } from "@/components/company/EditMemberTelephonyDialog";

const ERROR_MESSAGES: Record<string, string> = {
  not_admin: "Você precisa ser administrador desta empresa.",
  user_not_found: "Nenhum usuário com este email. Peça para que ele crie uma conta primeiro.",
  already_member: "Este usuário já é membro da empresa.",
};

export default function MembersPage() {
  const { activeCompany, isAdmin } = useCompany();
  const { members, isLoading, addMember, removeMember, updateMemberExtension } = useCompanyMembers();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [extension, setExtension] = useState("");
  const [token, setToken] = useState("");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editExtension, setEditExtension] = useState("");
  const [selectedMemberForTelephony, setSelectedMemberForTelephony] = useState<CompanyMember | null>(null);

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
        api4com_token: token.trim() || undefined,
      });
      toast({
        title: "Membro adicionado",
        description: `${result?.member_name || email} agora faz parte de ${activeCompany?.name}.`,
      });
      setEmail("");
      setExtension("");
      setToken("");
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

  const startEditing = (userId: string, currentExt: string) => {
    setEditingUserId(userId);
    setEditExtension(currentExt || "");
  };

  const handleSaveExtension = async (userId: string) => {
    try {
      await updateMemberExtension.mutateAsync({ userId, extension: editExtension.trim() });
      toast({ title: "Ramal atualizado" });
      setEditingUserId(null);
    } catch (err) {
      toast({
        title: "Erro ao salvar",
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
            O usuário precisa já ter uma conta no Qualify. Se preencher o token, o Webphone será habilitado automaticamente para ele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_150px_120px_160px_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="member-email" className="text-xs">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "operator")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-ext" className="text-xs">Ramal (opcional)</Label>
              <Input
                id="member-ext"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder="1001"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-token" className="text-xs">Token Webphone</Label>
              <Input
                id="member-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token API4COM"
                className="h-9 text-xs font-mono"
              />
            </div>
            <Button type="submit" disabled={addMember.isPending} className="h-9 text-xs">
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
                  <TableHead>Ramal</TableHead>
                  <TableHead>Token Webphone</TableHead>
                  <TableHead>Entrou em</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
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
                    <TableCell>
                      {editingUserId === m.user_id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            className="w-20 h-7 text-xs font-mono"
                            value={editExtension}
                            onChange={(e) => setEditExtension(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveExtension(m.user_id);
                              if (e.key === "Escape") setEditingUserId(null);
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-green-600"
                            onClick={() => handleSaveExtension(m.user_id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setEditingUserId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className={!m.extension ? "text-muted-foreground italic text-xs font-mono" : "text-xs font-mono font-bold text-foreground"}>
                            {m.extension || "—"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEditing(m.user_id, m.extension || "")}
                            title="Editar ramal rapidamente"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.api4com_token ? (
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForTelephony(m)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-medium transition-colors border border-emerald-500/20"
                          title="Clique para gerenciar o token e ramal do Webphone"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Configurado</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForTelephony(m)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted text-[10px] transition-colors border border-border"
                          title="Clique para configurar o token do Webphone"
                        >
                          <PhoneCall className="h-2.5 w-2.5 text-purple-600" />
                          <span>Sem Token</span>
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joined_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          onClick={() => setSelectedMemberForTelephony(m)}
                          title="Configurar ramal e token do Webphone"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(m.id, m.full_name || m.email || "este membro")}
                          disabled={removeMember.isPending}
                          title="Remover membro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Configuração de Telefonia e Token do Membro */}
      <EditMemberTelephonyDialog
        member={selectedMemberForTelephony}
        open={!!selectedMemberForTelephony}
        onClose={() => setSelectedMemberForTelephony(null)}
      />
    </div>
  );
}
