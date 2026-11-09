import { useState } from "react";
import { useDepartments, useDepartmentMembers } from "@/hooks/useDepartments";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Users, Trash2, Edit2, UserPlus, UserMinus, ShieldAlert, Sparkles, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDepartments() {
  const { toast } = useToast();
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const { users = [], companies = [] } = useAdmin();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#8A3CFF");
  const [formCompanyId, setFormCompanyId] = useState<string>("global");

  // Selected department members
  const { members: deptMembers = [], addMember, removeMember, isLoading: isMembersLoading } = useDepartmentMembers(selectedDeptId || undefined);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");

  const activeDepartment = departments.find(d => d.id === selectedDeptId) || departments[0] || null;
  const currentDeptId = activeDepartment?.id || null;

  const handleOpenCreate = () => {
    setFormName("");
    setFormDescription("");
    setFormColor("#8A3CFF");
    setFormCompanyId("global");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (dept: any) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormDescription(dept.description || "");
    setFormColor(dept.color || "#8A3CFF");
    setFormCompanyId(dept.company_id || "global");
  };

  const handleSaveDepartment = async () => {
    if (!formName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome do departamento", variant: "destructive" });
      return;
    }

    try {
      if (editingDept) {
        await updateDepartment.mutateAsync({
          id: editingDept.id,
          name: formName,
          description: formDescription,
          color: formColor,
        });
        toast({ title: "Departamento atualizado com sucesso!" });
        setEditingDept(null);
      } else {
        await createDepartment.mutateAsync({
          name: formName,
          description: formDescription,
          color: formColor,
          companyIdOverride: formCompanyId === "global" ? undefined : formCompanyId,
        });
        toast({ title: "Departamento criado com sucesso!" });
        setIsCreateOpen(false);
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o departamento "${name}"?`)) return;
    try {
      await deleteDepartment.mutateAsync(id);
      if (selectedDeptId === id) setSelectedDeptId(null);
      toast({ title: "Departamento removido!" });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  const handleAddMemberToActiveDept = async () => {
    if (!currentDeptId || !selectedUserIdToAdd) return;
    try {
      await addMember.mutateAsync({ userId: selectedUserIdToAdd, deptId: currentDeptId });
      setSelectedUserIdToAdd("");
      toast({ title: "Membro adicionado ao departamento!" });
    } catch (err: any) {
      toast({ title: "Erro ao adicionar membro", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentDeptId) return;
    try {
      await removeMember.mutateAsync({ userId, deptId: currentDeptId });
      toast({ title: "Membro removido do departamento" });
    } catch (err: any) {
      toast({ title: "Erro ao remover membro", description: err.message, variant: "destructive" });
    }
  };

  // Filter available users to add
  const existingMemberUserIds = new Set(deptMembers.map(m => m.user_id));
  const availableUsersToAdd = users.filter(u => !existingMemberUserIds.has(u.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-[#8A3CFF]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Departamentos & Setores</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organize os usuários em departamentos (ex: Vendas, Suporte, Financeiro) para notificações segmentadas e regras de negócio.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-[#8A3CFF] hover:bg-[#7828ea] text-white gap-2">
          <Plus className="h-4 w-4" />
          Novo Departamento
        </Button>
      </div>

      {/* Main Grid: Departments list + Department detail / Members */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Department Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Departamentos Cadastrados ({departments.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
              Carregando departamentos...
            </div>
          ) : departments.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <FolderTree className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Nenhum departamento cadastrado</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Crie departamentos para agrupar atendentes e direcionar notificações de workflow.</p>
              <Button onClick={handleOpenCreate} size="sm" variant="outline" className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Criar Primeiro Departamento
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {departments.map((dept) => {
                const isSelected = (currentDeptId === dept.id);
                return (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? "border-[#8A3CFF] ring-2 ring-[#8A3CFF]/10 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: dept.color || "#8A3CFF" }}
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 text-sm truncate">{dept.name}</h3>
                          {dept.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{dept.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="gap-1 text-[11px] font-medium bg-slate-100 text-slate-700">
                          <Users className="h-3 w-3" />
                          {dept.member_count ?? 0}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(dept);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(dept.id, dept.name);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Manage Users in Department */}
        <div className="lg:col-span-7">
          {activeDepartment ? (
            <Card className="shadow-xs border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: activeDepartment.color || "#8A3CFF" }}
                    />
                    <div>
                      <CardTitle className="text-base">{activeDepartment.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {activeDepartment.description || "Gerencie os membros vinculados a este setor"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-slate-600">
                    {deptMembers.length} {deptMembers.length === 1 ? "membro" : "membros"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Add member select */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Adicionar usuário ao departamento</Label>
                  <div className="flex gap-2">
                    <Select value={selectedUserIdToAdd} onValueChange={setSelectedUserIdToAdd}>
                      <SelectTrigger className="bg-white flex-1 text-xs">
                        <SelectValue placeholder="Selecione um usuário para adicionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsersToAdd.length === 0 ? (
                          <div className="p-2 text-xs text-slate-400 text-center">Nenhum usuário disponível</div>
                        ) : (
                          availableUsersToAdd.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-xs">
                              {u.full_name || u.email} {u.email && u.full_name ? `(${u.email})` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleAddMemberToActiveDept}
                      disabled={!selectedUserIdToAdd || addMember.isPending}
                      className="bg-[#8A3CFF] hover:bg-[#7828ea] text-white shrink-0 gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                </div>

                {/* Members list */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block px-1">
                    Membros do Setor
                  </Label>

                  {isMembersLoading ? (
                    <div className="p-6 text-center text-xs text-slate-400">Carregando usuários do departamento...</div>
                  ) : deptMembers.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-xl bg-slate-50/50">
                      <Users className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-600 font-medium">Nenhum usuário vinculado ainda</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Selecione um usuário acima para adicioná-lo a este departamento.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      {deptMembers.map((member) => (
                        <div key={member.id} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-[#8A3CFF] font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {(member.user_name || member.user_email || "U").slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {member.user_name || "Sem nome"}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {member.user_email || member.user_id}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 text-xs"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={removeMember.isPending}
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center border-dashed">
              <FolderTree className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">Selecione ou crie um departamento</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Clique em um departamento à esquerda para visualizar e vincular os operadores e administradores.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Create / Edit Department */}
      <Dialog open={isCreateOpen || !!editingDept} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingDept(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDept ? "Editar Departamento" : "Novo Departamento"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do departamento para segmentação e envio de notificações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nome do Departamento *</Label>
              <Input
                placeholder="Ex: Vendas, Suporte N2, Financeiro..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Descrição (Opcional)</Label>
              <Textarea
                placeholder="Explique o propósito deste departamento..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cor de Identificação</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="font-mono text-xs max-w-[120px]"
                />
              </div>
            </div>

            {!editingDept && companies.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Empresa (Opcional)</Label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Global (Todas as empresas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global" className="text-xs font-medium text-[#8A3CFF]">
                      Global (Visível para todas as empresas)
                    </SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingDept(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDepartment}
              className="bg-[#8A3CFF] hover:bg-[#7828ea] text-white"
              disabled={createDepartment.isPending || updateDepartment.isPending}
            >
              {editingDept ? "Salvar Alterações" : "Criar Departamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
