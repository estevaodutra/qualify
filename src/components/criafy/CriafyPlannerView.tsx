import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  Filter,
  Flame,
  Layers,
  LayoutGrid,
  List,
  ListTodo,
  MoreHorizontal,
  PenTool,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  Video,
  FileText,
  ChevronRight,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyPlannerItem,
  CriafyPlannerFormat,
  CriafyPlannerStatus,
  CriafyDemand,
  CriafyInstagramAccount,
} from "@/types/criafy";
import { CriafySubsidebar, CriafySubsidebarGroup } from "./CriafySubsidebar";

interface CriafyPlannerViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  onNavigateToCalendar?: () => void;
  onNavigateToDemands?: () => void;
}

export const CriafyPlannerView: React.FC<CriafyPlannerViewProps> = ({
  accounts,
  selectedAccountId = "all",
  onNavigateToCalendar,
  onNavigateToDemands,
}) => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();

  const [plannerItems, setPlannerItems] = useState<CriafyPlannerItem[]>([]);
  const [demands, setDemands] = useState<CriafyDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"lista" | "semana" | "campanhas">("lista");

  // Modal Novo / Editar Item do Planner
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CriafyPlannerItem | null>(null);
  const [formTheme, setFormTheme] = useState("");
  const [formFormat, setFormFormat] = useState<CriafyPlannerFormat>("REEL");
  const [formObjective, setFormObjective] = useState("identificacao");
  const [formPilar, setFormPilar] = useState("Relacionamento");
  const [formAngle, setFormAngle] = useState("");
  const [formHook, setFormHook] = useState("");
  const [formScript, setFormScript] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formResponsible, setFormResponsible] = useState("");
  const [formCampaign, setFormCampaign] = useState("");
  const [formStatus, setFormStatus] = useState<CriafyPlannerStatus>("ideia");
  const [formDesiredDate, setFormDesiredDate] = useState("");
  const [formAccountId, setFormAccountId] = useState("none");

  // Modal Visualizar Detalhes & Roteiro do Item
  const [detailItem, setDetailItem] = useState<CriafyPlannerItem | null>(null);

  // Modal Criar Demanda Rápida para o Item
  const [demandForPlanItem, setDemandForPlanItem] = useState<CriafyPlannerItem | null>(null);
  const [quickDemandTitle, setQuickDemandTitle] = useState("");
  const [quickDemandType, setQuickDemandType] = useState<string>("gravar_video");

  useEffect(() => {
    if (!activeCompanyId) return;
    loadData();
  }, [activeCompanyId]);

  const loadData = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [items, dems] = await Promise.all([
        criafyService.getPlannerItems(activeCompanyId),
        criafyService.getDemands(activeCompanyId),
      ]);
      setPlannerItems(items);
      setDemands(dems);
    } catch (err: any) {
      toast.error("Erro ao carregar Planner: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormTheme("");
    setFormFormat("REEL");
    setFormObjective("identificacao");
    setFormPilar("Relacionamento");
    setFormAngle("");
    setFormHook("");
    setFormScript("");
    setFormCaption("");
    setFormResponsible(user?.name || user?.email || "");
    setFormCampaign("");
    setFormStatus("ideia");
    setFormDesiredDate("");
    setFormAccountId("none");
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: CriafyPlannerItem) => {
    setEditingItem(item);
    setFormTheme(item.theme);
    setFormFormat(item.format);
    setFormObjective((item.objective as string) || "identificacao");
    setFormPilar(item.pillar || "Relacionamento");
    setFormAngle(item.angle || "");
    setFormHook(item.hook || "");
    setFormScript(item.script || "");
    setFormCaption(item.caption || "");
    setFormResponsible(item.responsible_name || "");
    setFormCampaign(item.campaign || "");
    setFormStatus(item.status);
    setFormDesiredDate(item.desired_date ? item.desired_date.slice(0, 10) : "");
    setFormAccountId(item.account_id || "none");
    setIsModalOpen(true);
  };

  const handleSavePlannerItem = async () => {
    if (!activeCompanyId) return;
    if (!formTheme.trim()) {
      toast.error("Informe o tema ou título do conteúdo.");
      return;
    }

    try {
      if (editingItem) {
        const updated = await criafyService.updatePlannerItem(
          editingItem.id,
          {
            theme: formTheme.trim(),
            format: formFormat,
            objective: formObjective,
            pillar: formPilar,
            angle: formAngle.trim(),
            hook: formHook.trim(),
            script: formScript.trim(),
            caption: formCaption.trim(),
            responsible_name: formResponsible.trim(),
            campaign: formCampaign.trim() || null,
            status: formStatus,
            account_id: formAccountId === "none" ? null : formAccountId,
            desired_date: formDesiredDate ? new Date(formDesiredDate).toISOString() : null,
          },
          activeCompanyId
        );
        setPlannerItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Conteúdo do Planner atualizado!");
      } else {
        const created = await criafyService.createPlannerItem({
          company_id: activeCompanyId,
          theme: formTheme.trim(),
          format: formFormat,
          objective: formObjective,
          pillar: formPilar,
          angle: formAngle.trim(),
          hook: formHook.trim(),
          script: formScript.trim(),
          caption: formCaption.trim(),
          responsible_name: formResponsible.trim(),
          campaign: formCampaign.trim() || null,
          status: formStatus,
          account_id: formAccountId === "none" ? null : formAccountId,
          desired_date: formDesiredDate ? new Date(formDesiredDate).toISOString() : null,
          created_by: user?.id,
        });
        setPlannerItems((prev) => [created, ...prev]);
        toast.success("Conteúdo adicionado ao Planner!");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Excluir este conteúdo do Planner?")) return;
    try {
      await criafyService.deletePlannerItem(id, activeCompanyId);
      setPlannerItems((prev) => prev.filter((p) => p.id !== id));
      if (detailItem?.id === id) setDetailItem(null);
      toast.success("Conteúdo removido do Planner.");
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  };

  const handleCreateLinkedDemand = async () => {
    if (!activeCompanyId || !demandForPlanItem) return;
    if (!quickDemandTitle.trim()) {
      toast.error("Informe a descrição da demanda.");
      return;
    }

    try {
      const created = await criafyService.createDemand({
        company_id: activeCompanyId,
        planner_item_id: demandForPlanItem.id,
        account_id: demandForPlanItem.account_id,
        title: quickDemandTitle.trim(),
        description: `Vinculado ao conteúdo do Planner: "${demandForPlanItem.theme}"`,
        type: quickDemandType as any,
        priority: "alta",
        status: "pending",
        origin: "usuario",
        created_by: user?.id,
        responsible_name: demandForPlanItem.responsible_name || "Você",
      });
      setDemands((prev) => [created, ...prev]);
      toast.success("Demanda vinculada criada com sucesso!");
      setDemandForPlanItem(null);
      setQuickDemandTitle("");
    } catch (err: any) {
      toast.error("Erro ao vincular demanda: " + err.message);
    }
  };

  // Contadores para a Subsidebar
  const counts = useMemo(() => {
    return {
      todos: plannerItems.length,
      ideias: plannerItems.filter((i) => i.status === "ideia").length,
      roteirizados: plannerItems.filter((i) => i.status === "roteirizado").length,
      gravacao: plannerItems.filter((i) => i.status === "aguardando_gravacao").length,
      edicao: plannerItems.filter((i) => i.status === "em_edicao").length,
      prontos: plannerItems.filter((i) => i.status === "pronto").length,
      reels: plannerItems.filter((i) => i.format === "REEL").length,
      carrosseis: plannerItems.filter((i) => i.format === "CAROUSEL").length,
    };
  }, [plannerItems]);

  const subsidebarGroups: CriafySubsidebarGroup[] = [
    {
      title: "Visões do Plano",
      items: [
        { id: "todos", label: "Todos os Conteúdos", icon: Layers, count: counts.todos },
        { id: "ideias", label: "Ideias & Pautas", icon: Sparkles, count: counts.ideias },
        { id: "roteirizados", label: "Roteirizados", icon: FileText, count: counts.roteirizados },
        {
          id: "gravacao",
          label: "Aguardando Gravação",
          icon: Video,
          count: counts.gravacao,
        },
        { id: "edicao", label: "Em Edição", icon: PenTool, count: counts.edicao },
        { id: "prontos", label: "Prontos para Agendar", icon: CheckCircle2, count: counts.prontos },
      ],
    },
    {
      title: "Formatos",
      items: [
        { id: "fmt_reels", label: "Reels", icon: Film, count: counts.reels },
        { id: "fmt_carrossel", label: "Carrosséis", icon: BookOpen, count: counts.carrosseis },
      ],
    },
  ];

  // Filtro
  const filteredItems = useMemo(() => {
    return plannerItems.filter((item) => {
      if (activeSubTab === "ideias" && item.status !== "ideia") return false;
      if (activeSubTab === "roteirizados" && item.status !== "roteirizado") return false;
      if (activeSubTab === "gravacao" && item.status !== "aguardando_gravacao") return false;
      if (activeSubTab === "edicao" && item.status !== "em_edicao") return false;
      if (activeSubTab === "prontos" && item.status !== "pronto") return false;
      if (activeSubTab === "fmt_reels" && item.format !== "REEL") return false;
      if (activeSubTab === "fmt_carrossel" && item.format !== "CAROUSEL") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTheme = item.theme.toLowerCase().includes(q);
        const matchesPillar = (item.pillar || "").toLowerCase().includes(q);
        const matchesAngle = (item.angle || "").toLowerCase().includes(q);
        if (!matchesTheme && !matchesPillar && !matchesAngle) return false;
      }
      return true;
    });
  }, [plannerItems, activeSubTab, search]);

  const getFormatBadge = (format: CriafyPlannerFormat) => {
    switch (format) {
      case "REEL":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[9px] px-1.5 py-0 font-bold">REEL</Badge>;
      case "CAROUSEL":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] px-1.5 py-0 font-bold">CARROSSEL</Badge>;
      case "STORIES_LITE":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1.5 py-0 font-bold">STORIES LITE</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold">{format}</Badge>;
    }
  };

  const getStatusBadge = (status: CriafyPlannerStatus) => {
    switch (status) {
      case "ideia":
        return <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">Ideia</Badge>;
      case "roteirizado":
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[9px]">Roteirizado</Badge>;
      case "aguardando_gravacao":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">Gravação</Badge>;
      case "em_edicao":
        return <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20 text-[9px]">Edição</Badge>;
      case "pronto":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">Pronto</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com Modos de Visualização e Novo Conteúdo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Planner Editorial</h2>
            <p className="text-xs text-muted-foreground">
              O que vamos produzir? Transforme a estratégia em plano editorial com roteiros e demandas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Alternador de Visões: Lista / Semana / Campanhas */}
          <div className="flex items-center p-0.5 bg-muted/60 border border-border/70 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "lista"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("semana")}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "semana"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("campanhas")}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "campanhas"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Campanhas
            </button>
          </div>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="h-8 px-3.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Conteúdo</span>
          </Button>
        </div>
      </div>

      {/* Layout com Subsidebar Contextual */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* SUBSIDEBAR */}
        <CriafySubsidebar
          groups={subsidebarGroups}
          activeId={activeSubTab}
          onChange={setActiveSubTab}
          title="Planner"
        />

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          {/* Barra de Busca e Atualização */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por tema, pilar ou ângulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl bg-card border-border/80 shadow-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              title="Recarregar"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Carregando plano editorial...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-2">
              <p className="text-xs font-bold text-foreground">
                Nenhum conteúdo planejado nesta visão.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Planeje um novo conteúdo ou utilize o Estrategista IA para gerar sugestões alinhadas ao Manual da Marca.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  className="h-8 text-xs font-semibold rounded-xl gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Conteúdo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => {
                const linkedDemands = demands.filter(
                  (d) => d.planner_item_id === item.id
                );
                const completedDemands = linkedDemands.filter(
                  (d) => d.status === "completed"
                );

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/40 transition-all shadow-2xs space-y-3 cursor-pointer group"
                    onClick={() => setDetailItem(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getFormatBadge(item.format)}
                          {getStatusBadge(item.status)}
                          {item.pillar && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 text-muted-foreground"
                            >
                              Pilar: {item.pillar}
                            </Badge>
                          )}
                          {item.campaign && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">
                              {item.campaign}
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          "{item.theme}"
                        </h4>

                        {item.angle && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            <span className="font-semibold text-foreground/80">Ângulo:</span>{" "}
                            {item.angle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Linha Inferior: Responsável, Demandas Vinculadas, Ações */}
                    <div
                      className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                        {item.responsible_name && (
                          <span className="flex items-center gap-1 font-medium">
                            <User className="w-3 h-3" />
                            {item.responsible_name}
                          </span>
                        )}

                        {item.desired_date && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            Previsão:{" "}
                            {new Date(item.desired_date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        )}

                        {/* Relação Planner × Demandas */}
                        {linkedDemands.length > 0 ? (
                          <span
                            onClick={onNavigateToDemands}
                            className="flex items-center gap-1 text-primary hover:underline font-bold cursor-pointer"
                          >
                            <ListTodo className="w-3 h-3" />
                            Demandas ({completedDemands.length}/{linkedDemands.length})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDemandForPlanItem(item);
                              setQuickDemandTitle(`Gravar vídeo: ${item.theme}`);
                            }}
                            className="flex items-center gap-1 text-muted-foreground/80 hover:text-primary transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Vincular demanda</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailItem(item)}
                          className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 border-border"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Roteiro</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDemandForPlanItem(item);
                            setQuickDemandTitle(`Gravar ${item.format.toLowerCase()}: ${item.theme}`);
                          }}
                          className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <ListTodo className="w-3 h-3" />
                          <span>Criar Demanda</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar / Editar Item do Planner */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingItem ? "Editar Conteúdo no Planner" : "Novo Conteúdo no Planner"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Planeje a pauta, formato, objetivo, ângulo e roteiro do conteúdo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tema ou Título do Conteúdo *</Label>
              <Input
                placeholder="Ex: 'Vocês viraram colegas de casa?'"
                value={formTheme}
                onChange={(e) => setFormTheme(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Formato</Label>
                <Select
                  value={formFormat}
                  onValueChange={(val) => setFormFormat(val as CriafyPlannerFormat)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REEL">Reels (Vídeo Curto)</SelectItem>
                    <SelectItem value="CAROUSEL">Carrossel</SelectItem>
                    <SelectItem value="POST">Post no Feed (Imagem)</SelectItem>
                    <SelectItem value="STORY">Story</SelectItem>
                    <SelectItem value="STORIES_LITE">Stories Lite</SelectItem>
                    <SelectItem value="VIDEO_LONGO">Vídeo Longo / YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status de Produção</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as CriafyPlannerStatus)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ideia">Ideia / Pauta</SelectItem>
                    <SelectItem value="roteirizado">Roteirizado</SelectItem>
                    <SelectItem value="aguardando_gravacao">Aguardando Gravação</SelectItem>
                    <SelectItem value="em_edicao">Em Edição</SelectItem>
                    <SelectItem value="pronto">Pronto para Agendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pilar Estratégico</Label>
                <Input
                  placeholder="Ex: Relacionamento, Método, Bastidor..."
                  value={formPilar}
                  onChange={(e) => setFormPilar(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Objetivo</Label>
                <Select value={formObjective} onValueChange={setFormObjective}>
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identificacao">Identificação</SelectItem>
                    <SelectItem value="autoridade">Autoridade</SelectItem>
                    <SelectItem value="vendas">Vendas / Conversão</SelectItem>
                    <SelectItem value="conexao">Conexão / Humanização</SelectItem>
                    <SelectItem value="educacao">Educação / Ensino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ângulo / Dor Abordada</Label>
                <Input
                  placeholder="Ex: Dor silenciosa, Falta de tempo..."
                  value={formAngle}
                  onChange={(e) => setFormAngle(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Campanha (Opcional)</Label>
                <Input
                  placeholder="Ex: Lançamento Março, Perpétuo..."
                  value={formCampaign}
                  onChange={(e) => setFormCampaign(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Hook / Gancho Inicial (3 primeiros segundos)</Label>
              <Input
                placeholder="Ex: 'Se você faz isso no seu relacionamento, pare agora!'"
                value={formHook}
                onChange={(e) => setFormHook(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Roteiro Completo / Estrutura</Label>
              <Textarea
                placeholder="Roteiro com gancho, corpo, quebra de objeção e CTA..."
                value={formScript}
                onChange={(e) => setFormScript(e.target.value)}
                rows={4}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Legenda / Copy de Publicação</Label>
              <Textarea
                placeholder="Texto da legenda do post com hashtags..."
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
                rows={3}
                className="text-xs rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSavePlannerItem}
              className="text-xs rounded-xl font-bold bg-primary text-primary-foreground"
            >
              Salvar no Planner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Detalhes & Roteiro */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {detailItem && getFormatBadge(detailItem.format)}
              <DialogTitle className="text-base font-bold truncate">
                {detailItem?.theme}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Estrutura editorial e direcionamento de produção.
            </DialogDescription>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-xl border border-border/60">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Objetivo</span>
                  <p className="font-semibold capitalize text-foreground">{detailItem.objective || "Identificação"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Pilar</span>
                  <p className="font-semibold text-foreground">{detailItem.pillar || "Não informado"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Ângulo</span>
                  <p className="font-medium text-foreground">{detailItem.angle || "Geral"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Responsável</span>
                  <p className="font-medium text-foreground">{detailItem.responsible_name || "Equipe"}</p>
                </div>
              </div>

              {detailItem.hook && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Gancho / Hook (3s)
                  </span>
                  <p className="text-xs font-semibold text-foreground">"{detailItem.hook}"</p>
                </div>
              )}

              {detailItem.script ? (
                <div className="p-3 bg-muted/60 rounded-xl space-y-1 border border-border/70">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Roteiro Completo
                  </span>
                  <pre className="text-xs font-sans text-foreground whitespace-pre-wrap leading-relaxed">
                    {detailItem.script}
                  </pre>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 rounded-xl text-center text-muted-foreground text-xs">
                  Nenhum roteiro cadastrado para este conteúdo.
                </div>
              )}

              {detailItem.caption && (
                <div className="p-3 bg-muted/60 rounded-xl space-y-1 border border-border/70">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Legenda do Post
                  </span>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {detailItem.caption}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2 border-t border-border flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailItem(null)}
              className="text-xs rounded-xl"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (detailItem) {
                  openEditModal(detailItem);
                  setDetailItem(null);
                }
              }}
              className="text-xs rounded-xl font-semibold gap-1"
            >
              <PenTool className="w-3.5 h-3.5" /> Editar
            </Button>
            {onNavigateToCalendar && (
              <Button
                size="sm"
                onClick={() => {
                  setDetailItem(null);
                  onNavigateToCalendar();
                }}
                className="text-xs rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shadow-2xs"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Enviar para Calendário</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Demanda Rápida para o Conteúdo */}
      <Dialog
        open={!!demandForPlanItem}
        onOpenChange={(open) => !open && setDemandForPlanItem(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              <DialogTitle className="text-base font-bold">
                Criar Demanda para o Conteúdo
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Vincule uma ação necessária (gravar, editar, aprovar) para o conteúdo "{demandForPlanItem?.theme}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ação da Demanda *</Label>
              <Input
                value={quickDemandTitle}
                onChange={(e) => setQuickDemandTitle(e.target.value)}
                placeholder="Ex: Gravar áudio ou vídeo do roteiro..."
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tipo de Tarefa</Label>
              <Select value={quickDemandType} onValueChange={setQuickDemandType}>
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gravar_video">Gravar Vídeo</SelectItem>
                  <SelectItem value="gravar_audio">Gravar Áudio</SelectItem>
                  <SelectItem value="editar">Editar Material</SelectItem>
                  <SelectItem value="revisar_copy">Revisar Copy</SelectItem>
                  <SelectItem value="aprovar_conteudo">Aprovar Conteúdo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDemandForPlanItem(null)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLinkedDemand}
              className="text-xs rounded-xl font-bold bg-primary text-primary-foreground"
            >
              Criar Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
