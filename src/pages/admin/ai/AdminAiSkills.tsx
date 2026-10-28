import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Layers,
  Plus,
  Search,
  Filter,
  PlayCircle,
  Copy,
  Download,
  Power,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { AiSkill, AiSkillCategory, AiSkillStatus } from "@/types/aiSkills";
import { CreateSkillModal } from "@/components/admin/ai/CreateSkillModal";

export default function AdminAiSkills() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Buscar skills
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["admin_ai_skills", categoryFilter, statusFilter, search],
    queryFn: () =>
      AIExecutionService.getSkills({
        category: categoryFilter,
        status: statusFilter,
        search: search || undefined,
      }),
  });

  // Mutação para duplicar
  const duplicateMutation = useMutation({
    mutationFn: (skillId: string) => AIExecutionService.duplicateSkill(skillId),
    onSuccess: (newSkill) => {
      toast.success(`Skill "${newSkill.name}" duplicada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skills"] });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao duplicar skill."),
  });

  // Mutação para alternar status (ativar/desativar)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ skillId, status }: { skillId: string; status: AiSkillStatus }) =>
      AIExecutionService.toggleSkillStatus(skillId, status),
    onSuccess: () => {
      toast.success("Status da Skill atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skills"] });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar status."),
  });

  // Exportar ZIP
  const handleExportZip = async (skill: AiSkill) => {
    try {
      const versions = await AIExecutionService.getSkillVersions(skill.id);
      const activeVer = versions.find((v) => v.id === skill.active_version_id) || versions[0];
      if (!activeVer) {
        toast.error("Nenhuma versão encontrada para exportar.");
        return;
      }
      const blob = await AIExecutionService.exportSkillZip(skill, activeVer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${skill.slug}-v${activeVer.version}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Bundle .zip da Skill ${skill.name} exportado!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao exportar ZIP.");
    }
  };

  const statusBadge = (status: AiSkillStatus) => {
    switch (status) {
      case "published":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Publicada</Badge>;
      case "testing":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Em Testes</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-[10px]">Rascunho</Badge>;
      case "disabled":
        return <Badge variant="destructive" className="text-[10px]">Desativada</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Skills Globais</h1>
            <Badge variant="secondary" className="font-mono text-xs">{skills.length} cadastradas</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            As Skills definem como a inteligência artificial executa tarefas. Elas pertencem à plataforma Criafy e são orquestradas para todas as contas.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova Skill
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, slug ou descrição..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Categorias</SelectItem>
              <SelectItem value="CONTEÚDO">CONTEÚDO</SelectItem>
              <SelectItem value="ESTRATÉGIA">ESTRATÉGIA</SelectItem>
              <SelectItem value="ANÁLISE">ANÁLISE</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos Status</SelectItem>
              <SelectItem value="published">Publicada</SelectItem>
              <SelectItem value="testing">Em Testes</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="disabled">Desativada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Skills */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">Carregando catálogo de Skills...</div>
        ) : skills.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <div className="text-sm font-medium text-foreground">Nenhuma Skill encontrada</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tente alterar os filtros ou cadastre uma nova Skill para enriquecer a biblioteca da plataforma.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                  <th className="py-3 px-4">Nome & Slug</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Versão Ativa</th>
                  <th className="py-3 px-3">Perfil de Modelo</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Atualização</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {skills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/admin/ia/skills/${skill.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        {skill.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
                      </Link>
                      <div className="font-mono text-[11px] text-muted-foreground">{skill.slug}</div>
                      {skill.description && (
                        <div className="text-[11px] text-muted-foreground/80 line-clamp-1 max-w-md mt-0.5">
                          {skill.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {skill.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] font-semibold text-foreground">
                        {skill.active_version ? `v${skill.active_version.version}` : "v1"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {skill.openai_default_version || "OpenAI v1.0"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {skill.default_model_profile}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">{statusBadge(skill.status)}</td>
                    <td className="py-3 px-3 text-muted-foreground text-[11px]">
                      {new Date(skill.updated_at || skill.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => navigate(`/admin/ia/playground?skillSlug=${skill.slug}`)}
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-1 text-primary" />
                          Testar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => navigate(`/admin/ia/skills/${skill.id}`)}>
                              Abrir Detalhes & Arquivos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportZip(skill)}>
                              <Download className="h-3.5 w-3.5 mr-2" />
                              Exportar Bundle (.zip)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(skill.id)}>
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Duplicar Skill
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {skill.status !== "disabled" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({ skillId: skill.id, status: "disabled" })
                                }
                                className="text-destructive"
                              >
                                <Power className="h-3.5 w-3.5 mr-2" />
                                Desativar Skill
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({ skillId: skill.id, status: "published" })
                                }
                                className="text-emerald-600"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                Reativar Skill
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateSkillModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin_ai_skills"] })}
      />
    </div>
  );
}
