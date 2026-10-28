import React, { useState, useEffect, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Layers,
  ListTodo,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  User,
  Video,
  X,
  Camera,
  FileEdit,
  Send,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  Eye,
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
  CriafyDemand,
  CriafyDemandType,
  CriafyDemandPriority,
  CriafyDemandStatus,
  CriafyInstagramAccount,
} from "@/types/criafy";
import { CriafySubsidebar, CriafySubsidebarGroup } from "./CriafySubsidebar";

interface CriafyDemandsViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  onNavigateToPlanner?: (plannerId?: string) => void;
}

export const CriafyDemandsView: React.FC<CriafyDemandsViewProps> = ({
  accounts,
  selectedAccountId = "all",
  onNavigateToPlanner,
}) => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();

  const [demands, setDemands] = useState<CriafyDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<string>("todas");

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<CriafyDemand | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalType, setModalType] = useState<CriafyDemandType>("tarefa_generica");
  const [modalPriority, setModalPriority] = useState<CriafyDemandPriority>("media");
  const [modalAccountId, setModalAccountId] = useState<string>("none");
  const [modalDueDate, setModalDueDate] = useState<string>("");

  // Modal Detalhes Stories Lite
  const [selectedStoryLite, setSelectedStoryLite] = useState<CriafyDemand | null>(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    loadDemands();
  }, [activeCompanyId]);

  const loadDemands = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const data = await criafyService.getDemands(activeCompanyId);
      setDemands(data);
    } catch (err: any) {
      toast.error("Erro ao carregar demandas: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!activeCompanyId) return;
    if (!modalTitle.trim()) {
      toast.error("Informe o título da demanda.");
      return;
    }

    try {
      if (editingDemand) {
        const updated = await criafyService.updateDemand(
          editingDemand.id,
          {
            title: modalTitle.trim(),
            description: modalDescription.trim(),
            type: modalType,
            priority: modalPriority,
            account_id: modalAccountId === "none" ? null : modalAccountId,
            due_date: modalDueDate ? new Date(modalDueDate).toISOString() : null,
          },
          activeCompanyId
        );
        setDemands((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        toast.success("Demanda atualizada com sucesso!");
      } else {
        const created = await criafyService.createDemand({
          company_id: activeCompanyId,
          title: modalTitle.trim(),
          description: modalDescription.trim(),
          type: modalType,
          priority: modalPriority,
          status: "pending",
          origin: "usuario",
          created_by: user?.id,
          responsible_name: user?.name || user?.email || "Você",
          account_id: modalAccountId === "none" ? null : modalAccountId,
          due_date: modalDueDate ? new Date(modalDueDate).toISOString() : null,
        });
        setDemands((prev) => [created, ...prev]);
        toast.success("Demanda criada com sucesso!");
      }
      setIsModalOpen(false);
      resetModalForm();
    } catch (err: any) {
      toast.error("Erro ao salvar demanda: " + (err.message || ""));
    }
  };

  const resetModalForm = () => {
    setEditingDemand(null);
    setModalTitle("");
    setModalDescription("");
    setModalType("tarefa_generica");
    setModalPriority("media");
    setModalAccountId("none");
    setModalDueDate("");
  };

  const openCreateModal = (typeDefault: CriafyDemandType = "tarefa_generica") => {
    resetModalForm();
    setModalType(typeDefault);
    setIsModalOpen(true);
  };

  const openEditModal = (demand: CriafyDemand) => {
    setEditingDemand(demand);
    setModalTitle(demand.title);
    setModalDescription(demand.description || "");
    setModalType(demand.type);
    setModalPriority(demand.priority);
    setModalAccountId(demand.account_id || "none");
    setModalDueDate(demand.due_date ? demand.due_date.slice(0, 16) : "");
    setIsModalOpen(true);
  };

  const handleDeleteDemand = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta demanda?")) return;
    try {
      await criafyService.deleteDemand(id, activeCompanyId);
      setDemands((prev) => prev.filter((d) => d.id !== id));
      toast.success("Demanda removida.");
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const handleUpdateStatus = async (
    demand: CriafyDemand,
    newStatus: CriafyDemandStatus
  ) => {
    try {
      const updated = await criafyService.updateDemand(
        demand.id,
        {
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        },
        activeCompanyId
      );
      setDemands((prev) => prev.map((d) => (d.id === demand.id ? updated : d)));
      if (newStatus === "completed") {
        toast.success("Demanda concluída!");
      } else if (newStatus === "not_occurred") {
        toast.info("Stories Lite marcado como 'Não aconteceu'. (Sem atraso!)");
      }
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    }
  };

  // Gerar Set de Stories Lite (Oportunidades inteligentes baseadas em rotina)
  const handleGenerateStoriesLiteSet = async () => {
    if (!activeCompanyId) return;
    try {
      const contexts = [
        {
          context: "cafe",
          contextLabel: "Café / Pausa matinal",
          hook: "Tem coisas no seu negócio que você só percebe quando para para tomar um café...",
          bridge: "Hoje cedo lembrei de uma conversa com um cliente que achava que faltava tráfego.",
          coreMessage: "Na verdade, faltava alinhamento entre promessa e entrega.",
          connectionToMethod: "É exatamente o Pilar 1 do nosso método.",
          cta: "Comente 'MÉTODO' se você sente isso hoje.",
        },
        {
          context: "carro",
          contextLabel: "Carro / Deslocamento",
          hook: "3 minutos entre uma reunião e outra pra te falar uma verdade desconfortável...",
          bridge: "Muitos empreendedores perdem horas criando conteúdo sem saber pra quem estão falando.",
          coreMessage: "Sem clareza de posicionamento, você só queima energia.",
          connectionToMethod: "Defina sua tese única antes de ligar a câmera.",
          cta: "Me manda um direct se quiser revisar sua tese.",
        },
        {
          context: "bastidor",
          contextLabel: "Bastidor / Mesa de trabalho",
          hook: "Olha só o que acabou de acontecer aqui no escritório...",
          bridge: "Estávamos ajustando a copy de uma campanha e cortamos metade do texto.",
          coreMessage: "Menos é mais quando a mensagem é cirúrgica.",
          connectionToMethod: "A clareza bate a complexidade sempre.",
          cta: "Guarda esse insight pra sua próxima postagem.",
        },
      ];

      for (const item of contexts) {
        await criafyService.createDemand({
          company_id: activeCompanyId,
          title: `Stories Lite: ${item.contextLabel}`,
          description: `Grave este Story caso o momento aconteça hoje: "${item.hook}"`,
          type: "stories_lite",
          priority: "media",
          origin: "ia",
          responsible_name: user?.name || user?.email || "Você",
          stories_lite: {
            ...item,
            script: `GANCHO: ${item.hook}\n\nPONTE: ${item.bridge}\n\nMENSAGEM: ${item.coreMessage}\n\nCONEXÃO: ${item.connectionToMethod}\n\nCTA: ${item.cta}`,
          },
        });
      }

      await loadDemands();
      toast.success("Set de 3 Stories Lite gerado com sucesso como oportunidades!");
    } catch (err: any) {
      toast.error("Erro ao gerar Stories Lite: " + err.message);
    }
  };

  // Contadores para a Subsidebar
  const counts = useMemo(() => {
    return {
      todas: demands.filter((d) => d.status !== "cancelled").length,
      minhas: demands.filter(
        (d) =>
          d.status !== "cancelled" &&
          (d.responsible_name === "Você" || d.created_by === user?.id)
      ).length,
      gravacoes: demands.filter(
        (d) =>
          (d.type === "gravar_video" || d.type === "gravar_audio") &&
          d.status !== "completed"
      ).length,
      aprovacoes: demands.filter(
        (d) =>
          (d.type === "aprovar_conteudo" || d.type === "revisar_copy") &&
          d.status !== "completed"
      ).length,
      stories_lite: demands.filter(
        (d) => d.type === "stories_lite" && d.status !== "completed"
      ).length,
      materiais: demands.filter(
        (d) =>
          (d.type === "tirar_foto" ||
            d.type === "enviar_material" ||
            d.type === "coletar_depoimento" ||
            d.type === "tarefa_generica") &&
          d.status !== "completed"
      ).length,
      concluidas: demands.filter((d) => d.status === "completed").length,
    };
  }, [demands, user?.id]);

  // Grupos da Subsidebar
  const subsidebarGroups: CriafySubsidebarGroup[] = [
    {
      title: "Visões",
      items: [
        { id: "todas", label: "Todas as Demandas", icon: ListTodo, count: counts.todas },
        { id: "minhas", label: "Minhas Tarefas", icon: User, count: counts.minhas },
      ],
    },
    {
      title: "Por Tipo de Execução",
      items: [
        {
          id: "gravacoes",
          label: "Gravar Vídeo / Áudio",
          icon: Video,
          count: counts.gravacoes,
        },
        {
          id: "stories_lite",
          label: "Stories Lite (Oportunidades)",
          icon: Flame,
          count: counts.stories_lite,
        },
        {
          id: "aprovacoes",
          label: "Aprovar & Revisar",
          icon: FileEdit,
          count: counts.aprovacoes,
        },
        {
          id: "materiais",
          label: "Fotos & Materiais",
          icon: Camera,
          count: counts.materiais,
        },
      ],
    },
    {
      title: "Status",
      items: [
        { id: "concluidas", label: "Concluídas", icon: CheckCircle2, count: counts.concluidas },
      ],
    },
  ];

  // Filtro de lista
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      // Subtab filter
      if (activeSubTab === "minhas") {
        const isMine = d.responsible_name === "Você" || d.created_by === user?.id;
        if (!isMine) return false;
      } else if (activeSubTab === "gravacoes") {
        if (d.type !== "gravar_video" && d.type !== "gravar_audio") return false;
      } else if (activeSubTab === "stories_lite") {
        if (d.type !== "stories_lite") return false;
      } else if (activeSubTab === "aprovacoes") {
        if (d.type !== "aprovar_conteudo" && d.type !== "revisar_copy") return false;
      } else if (activeSubTab === "materiais") {
        if (
          d.type !== "tirar_foto" &&
          d.type !== "enviar_material" &&
          d.type !== "coletar_depoimento" &&
          d.type !== "tarefa_generica"
        )
          return false;
      } else if (activeSubTab === "concluidas") {
        if (d.status !== "completed") return false;
      }

      // If not in concluidas tab, hide completed unless viewing 'todas'
      if (activeSubTab !== "concluidas" && activeSubTab !== "todas") {
        if (d.status === "completed") return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesDesc = (d.description || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [demands, activeSubTab, search, user?.id]);

  const getTypeIcon = (type: CriafyDemandType) => {
    switch (type) {
      case "gravar_video":
        return <Video className="w-4 h-4 text-purple-500" />;
      case "gravar_audio":
        return <Mic className="w-4 h-4 text-emerald-500" />;
      case "tirar_foto":
        return <Camera className="w-4 h-4 text-blue-500" />;
      case "revisar_copy":
      case "aprovar_conteudo":
        return <FileEdit className="w-4 h-4 text-amber-500" />;
      case "stories_lite":
        return <Flame className="w-4 h-4 text-amber-500" />;
      case "publicar":
        return <Send className="w-4 h-4 text-rose-500" />;
      default:
        return <ListTodo className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: CriafyDemandType) => {
    switch (type) {
      case "gravar_video":
        return "Gravar Vídeo";
      case "gravar_audio":
        return "Gravar Áudio";
      case "tirar_foto":
        return "Tirar Foto";
      case "revisar_copy":
        return "Revisar Copy";
      case "aprovar_conteudo":
        return "Aprovar Conteúdo";
      case "enviar_material":
        return "Enviar Material";
      case "editar":
        return "Editar";
      case "publicar":
        return "Publicar";
      case "responder":
        return "Responder";
      case "coletar_depoimento":
        return "Coletar Depoimento";
      case "stories_lite":
        return "Stories Lite (Oportunidade)";
      default:
        return "Demanda Geral";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com ações rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Central de Demandas</h2>
            <p className="text-xs text-muted-foreground">
              O que você e a sua equipe precisam executar (com ou sem conteúdo vinculado).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateStoriesLiteSet}
            className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
            title="Gerar oportunidades de Stories Lite para a rotina de hoje"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gerar Set</span> Stories Lite
          </Button>

          <Button
            size="sm"
            onClick={() => openCreateModal()}
            className="h-8 px-3.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Demanda</span>
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
          title="Demandas"
        />

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          {/* Barra de Busca e Filtros Rápidos */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar demandas por título ou detalhes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl bg-card border-border/80 shadow-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDemands}
              className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              title="Recarregar demandas"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Lista de Demandas */}
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Carregando demandas...
            </div>
          ) : filteredDemands.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-2">
              <p className="text-xs font-bold text-foreground">
                Nenhuma demanda encontrada nesta visão.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Crie uma nova demanda para sua equipe ou gere um set de Stories Lite.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => openCreateModal()}
                  className="h-8 text-xs font-semibold rounded-xl gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Demanda
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDemands.map((demand) => {
                const isStoriesLite = demand.type === "stories_lite";
                const isDone = demand.status === "completed";
                const isNotOccurred = demand.status === "not_occurred";

                return (
                  <div
                    key={demand.id}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-2xl border transition-all bg-card shadow-2xs space-y-3",
                      isDone
                        ? "opacity-60 border-border/50 bg-muted/20"
                        : isStoriesLite
                        ? "border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-r from-card to-amber-500/5"
                        : "border-border/80 hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox de Conclusão rápida */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              demand,
                              isDone ? "pending" : "completed"
                            )
                          }
                          className={cn(
                            "mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0",
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-border hover:border-primary"
                          )}
                          title={isDone ? "Reabrir demanda" : "Marcar como concluída"}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "text-xs font-bold text-foreground",
                                isDone && "line-through text-muted-foreground"
                              )}
                            >
                              {demand.title}
                            </span>

                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 font-semibold gap-1"
                            >
                              {getTypeIcon(demand.type)}
                              <span>{getTypeLabel(demand.type)}</span>
                            </Badge>

                            {demand.priority && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0 font-bold uppercase",
                                  demand.priority === "urgente"
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : demand.priority === "alta"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {demand.priority}
                              </Badge>
                            )}

                            {isNotOccurred && (
                              <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-[9px] px-1.5 py-0">
                                Momento não ocorreu hoje (Sem atraso)
                              </Badge>
                            )}
                          </div>

                          {demand.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {demand.description}
                            </p>
                          )}

                          {/* Metadados adicionais */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                            {demand.responsible_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-muted-foreground/70" />
                                {demand.responsible_name}
                              </span>
                            )}

                            {demand.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground/70" />
                                Prazo:{" "}
                                {new Date(demand.due_date).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}

                            {demand.planner_item_id && onNavigateToPlanner && (
                              <button
                                type="button"
                                onClick={() => onNavigateToPlanner(demand.planner_item_id!)}
                                className="flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Ver no Planner</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações da demanda */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(demand)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Editar demanda"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDemand(demand.id)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                          title="Excluir demanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Bloco Exclusivo de Stories Lite (Oportunidade) */}
                    {isStoriesLite && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                            <Flame className="w-3.5 h-3.5" />
                            <span>
                              OPORTUNIDADE:{" "}
                              {demand.stories_lite?.contextLabel || "Contexto de Rotina"}
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-400">
                            Se esse contexto acontecer hoje, grave este Story.
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedStoryLite(demand)}
                            className="h-7 px-2.5 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded-lg gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Roteiro</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(demand, "completed")}
                            className="h-7 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 shadow-2xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Fiz</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(demand, "not_occurred")}
                            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                            title="O momento não aconteceu no dia (não gera atraso nem penalidade)"
                          >
                            <span>Não aconteceu</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar / Editar Demanda */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingDemand ? "Editar Demanda" : "Nova Demanda Operacional"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre tarefas para você ou para a equipe executar (gravação, foto, copy, aprovação, etc).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título da Demanda *</Label>
              <Input
                placeholder="Ex: Gravar áudio sobre quebra de objeção do cliente..."
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select
                  value={modalType}
                  onValueChange={(val) => setModalType(val as CriafyDemandType)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gravar_video">Gravar Vídeo</SelectItem>
                    <SelectItem value="gravar_audio">Gravar Áudio</SelectItem>
                    <SelectItem value="tirar_foto">Tirar Foto</SelectItem>
                    <SelectItem value="revisar_copy">Revisar Copy</SelectItem>
                    <SelectItem value="aprovar_conteudo">Aprovar Conteúdo</SelectItem>
                    <SelectItem value="enviar_material">Enviar Material</SelectItem>
                    <SelectItem value="editar">Editar</SelectItem>
                    <SelectItem value="publicar">Publicar</SelectItem>
                    <SelectItem value="stories_lite">Stories Lite</SelectItem>
                    <SelectItem value="tarefa_generica">Tarefa Genérica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select
                  value={modalPriority}
                  onValueChange={(val) => setModalPriority(val as CriafyDemandPriority)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Conta Vinculada (Opcional)</Label>
                <Select value={modalAccountId} onValueChange={setModalAccountId}>
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma conta</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        @{acc.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Prazo Desejado</Label>
                <Input
                  type="datetime-local"
                  value={modalDueDate}
                  onChange={(e) => setModalDueDate(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição / Instruções</Label>
              <Textarea
                placeholder="Detalhes, links de referência ou instruções claras para a execução..."
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
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
              onClick={handleCreateOrUpdate}
              className="text-xs rounded-xl font-bold bg-primary text-primary-foreground"
            >
              {editingDemand ? "Salvar Alterações" : "Criar Demanda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes de Roteiro Stories Lite */}
      <Dialog
        open={!!selectedStoryLite}
        onOpenChange={(open) => !open && setSelectedStoryLite(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <DialogTitle className="text-base font-bold">
                {selectedStoryLite?.stories_lite?.contextLabel || "Roteiro Stories Lite"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Grave direto pelo celular de forma natural e sem firulas se este momento acontecer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 border border-border/60">
              <span className="font-bold text-primary uppercase text-[10px] tracking-wider">
                Gancho de Abertura
              </span>
              <p className="text-xs font-medium text-foreground">
                "{selectedStoryLite?.stories_lite?.hook}"
              </p>
            </div>

            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 border border-border/60">
              <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                Ponte & Mensagem Central
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedStoryLite?.stories_lite?.bridge}{" "}
                {selectedStoryLite?.stories_lite?.coreMessage}
              </p>
            </div>

            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 border border-border/60">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
                Conexão com seu Método & Chamada
              </span>
              <p className="text-xs text-foreground font-medium">
                {selectedStoryLite?.stories_lite?.connectionToMethod}
              </p>
              {selectedStoryLite?.stories_lite?.cta && (
                <p className="text-[11px] text-primary font-bold pt-1">
                  CTA sugerido: "{selectedStoryLite.stories_lite.cta}"
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStoryLite(null)}
              className="text-xs rounded-xl"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (selectedStoryLite) {
                  handleUpdateStatus(selectedStoryLite, "completed");
                  setSelectedStoryLite(null);
                }
              }}
              className="text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Marcar como Gravado (Fiz)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
