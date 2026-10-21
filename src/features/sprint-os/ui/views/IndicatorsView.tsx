/**
 * Visão Indicadores Dinâmicos (KPI Builder) & Distribuição de Conteúdo Individual.
 * Especificação: Master Prompt v9.0 + Prompt de Otimização — Seções 4 e 5.
 * - KPI Builder: Preservado e independente (criação, edição, metas, fórmulas, pin no cockpit).
 * - Distribuição de Conteúdo: Sistema de cadastro, acompanhamento e comparação de publicações individuais.
 *   NENHUM dado fictício; consolidações e rankings derivados estritamente dos registros reais.
 */

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Plus,
  Pin,
  Trash2,
  Share2,
  TrendingUp,
  Instagram,
  Eye,
  Users,
  Copy,
  ExternalLink,
  Edit2,
  Filter,
  ArrowUpDown,
  Search,
  MessageCircle,
  Bookmark,
  MousePointerClick,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSprintOSStore } from "../../state/sprintOsStore";
import type {
  CustomIndicator,
  IndicatorType,
  ContentPublication,
  ContentType,
  ContentPlatform,
} from "../../domain/types";

export const IndicatorsView: React.FC = () => {
  const {
    workspace,
    upsertIndicatorAction,
    deleteIndicatorAction,
    togglePinIndicatorAction,
    upsertPublicationAction,
    deletePublicationAction,
    duplicatePublicationAction,
  } = useSprintOSStore();

  const [activeSubTab, setActiveSubTab] = useState<"kpis" | "content">("kpis");

  // KPI Builder Modal State
  const [showAddKPIModal, setShowAddKPIModal] = useState(false);
  const [kpiName, setKpiName] = useState("");
  const [kpiType, setKpiType] = useState<IndicatorType>("counter");
  const [kpiCurrent, setKpiCurrent] = useState(0);
  const [kpiTarget, setKpiTarget] = useState<number | undefined>(undefined);
  const [kpiUnit, setKpiUnit] = useState("");
  const [kpiCategory, setKpiCategory] = useState<any>("geral");

  // Publication Modal State
  const [showPubModal, setShowPubModal] = useState(false);
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [pubTitle, setPubTitle] = useState("");
  const [pubType, setPubType] = useState<ContentType>("reels");
  const [pubPlatform, setPubPlatform] = useState<ContentPlatform>("instagram");
  const [pubDate, setPubDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pubUrl, setPubUrl] = useState("");
  const [pubViews, setPubViews] = useState(0);
  const [pubReach, setPubReach] = useState(0);
  const [pubLikes, setPubLikes] = useState(0);
  const [pubComments, setPubComments] = useState(0);
  const [pubShares, setPubShares] = useState(0);
  const [pubSaves, setPubSaves] = useState(0);
  const [pubClicks, setPubClicks] = useState(0);
  const [pubGroupEntries, setPubGroupEntries] = useState(0);
  const [pubNotes, setPubNotes] = useState("");

  // Publication Filters & Sort
  const [pubFilterPlatform, setPubFilterPlatform] = useState<string>("all");
  const [pubFilterType, setPubFilterType] = useState<string>("all");
  const [pubSortBy, setPubSortBy] = useState<"date" | "views" | "engagement" | "groupEntries">("date");
  const [pubSearch, setPubSearch] = useState("");

  if (!workspace) return null;

  const indicators = Object.values(workspace.indicators || {}).filter((i) => !i.archivedAt);
  const publications = Object.values(workspace.publications || {});

  // Filtro e Ordenação das Publicações
  const filteredPublications = useMemo(() => {
    let list = [...publications];
    if (pubSearch.trim()) {
      const q = pubSearch.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q));
    }
    if (pubFilterPlatform !== "all") {
      list = list.filter((p) => p.platform === pubFilterPlatform);
    }
    if (pubFilterType !== "all") {
      list = list.filter((p) => p.type === pubFilterType);
    }

    list.sort((a, b) => {
      if (pubSortBy === "views") return b.views - a.views;
      if (pubSortBy === "groupEntries") return b.groupEntries - a.groupEntries;
      if (pubSortBy === "engagement") {
        const engA = a.likes + a.comments + a.shares + a.saves;
        const engB = b.likes + b.comments + b.shares + b.saves;
        return engB - engA;
      }
      return b.publishedAt.localeCompare(a.publishedAt);
    });

    return list;
  }, [publications, pubSearch, pubFilterPlatform, pubFilterType, pubSortBy]);

  // Totais Reais e Rankings Comparativos
  const stats = useMemo(() => {
    if (publications.length === 0) return null;
    const totalViews = publications.reduce((acc, p) => acc + p.views, 0);
    const totalReach = publications.reduce((acc, p) => acc + p.reach, 0);
    const totalClicks = publications.reduce((acc, p) => acc + p.clicks, 0);
    const totalGroupEntries = publications.reduce((acc, p) => acc + p.groupEntries, 0);
    const avgViews = Math.round(totalViews / publications.length);

    // Destaques comparativos
    const topViews = [...publications].sort((a, b) => b.views - a.views)[0];
    const topReach = [...publications].sort((a, b) => b.reach - a.reach)[0];
    const topClicks = [...publications].sort((a, b) => b.clicks - a.clicks)[0];
    const topGroup = [...publications].sort((a, b) => b.groupEntries - a.groupEntries)[0];

    return {
      totalPosts: publications.length,
      totalViews,
      totalReach,
      totalClicks,
      totalGroupEntries,
      avgViews,
      topViews,
      topReach,
      topClicks,
      topGroup,
    };
  }, [publications]);

  const handleOpenPubModal = (pub?: ContentPublication) => {
    if (pub) {
      setEditingPubId(pub.id);
      setPubTitle(pub.title);
      setPubType(pub.type);
      setPubPlatform(pub.platform);
      setPubDate(pub.publishedAt);
      setPubUrl(pub.url);
      setPubViews(pub.views);
      setPubReach(pub.reach);
      setPubLikes(pub.likes);
      setPubComments(pub.comments);
      setPubShares(pub.shares);
      setPubSaves(pub.saves);
      setPubClicks(pub.clicks);
      setPubGroupEntries(pub.groupEntries);
      setPubNotes(pub.notes);
    } else {
      setEditingPubId(null);
      setPubTitle("");
      setPubType("reels");
      setPubPlatform("instagram");
      setPubDate(new Date().toISOString().slice(0, 10));
      setPubUrl("");
      setPubViews(0);
      setPubReach(0);
      setPubLikes(0);
      setPubComments(0);
      setPubShares(0);
      setPubSaves(0);
      setPubClicks(0);
      setPubGroupEntries(0);
      setPubNotes("");
    }
    setShowPubModal(true);
  };

  const handleSavePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim()) return;

    await upsertPublicationAction({
      id: editingPubId || undefined,
      title: pubTitle.trim(),
      type: pubType,
      platform: pubPlatform,
      publishedAt: pubDate,
      url: pubUrl.trim(),
      views: Number(pubViews) || 0,
      reach: Number(pubReach) || 0,
      likes: Number(pubLikes) || 0,
      comments: Number(pubComments) || 0,
      shares: Number(pubShares) || 0,
      saves: Number(pubSaves) || 0,
      clicks: Number(pubClicks) || 0,
      groupEntries: Number(pubGroupEntries) || 0,
      notes: pubNotes.trim(),
    });

    setShowPubModal(false);
  };

  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName.trim()) return;

    await upsertIndicatorAction({
      name: kpiName.trim(),
      type: kpiType,
      currentValue: Number(kpiCurrent) || 0,
      targetValue: kpiTarget ? Number(kpiTarget) : null,
      unit: kpiUnit.trim(),
      category: kpiCategory,
    });

    setKpiName("");
    setKpiCurrent(0);
    setKpiTarget(undefined);
    setKpiUnit("");
    setShowAddKPIModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header das Sub-Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("kpis")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "kpis"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 KPI Builder ({indicators.length})
          </button>
          <button
            onClick={() => setActiveSubTab("content")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === "content"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            📣 Distribuição de Conteúdo ({publications.length})
          </button>
        </div>

        {activeSubTab === "kpis" ? (
          <Button
            onClick={() => setShowAddKPIModal(true)}
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Adicionar Indicador</span>
          </Button>
        ) : (
          <Button
            onClick={() => handleOpenPubModal()}
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Adicionar Publicação</span>
          </Button>
        )}
      </div>

      {/* SUB-ABA 1: KPI BUILDER (Seção 5) */}
      {activeSubTab === "kpis" && (
        <div>
          {indicators.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <div className="text-xs font-semibold text-foreground">Nenhum indicador personalizado cadastrado</div>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5 mb-3">
                Crie métricas customizadas para acompanhar no cockpit (ex: Reuniões Realizadas, CPL Médio, etc.).
              </p>
              <Button
                onClick={() => setShowAddKPIModal(true)}
                size="sm"
                className="text-xs bg-primary text-primary-foreground rounded-xl"
              >
                + Criar Primeiro KPI
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicators.map((kpi) => {
                const pct = kpi.targetValue ? Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100)) : null;

                return (
                  <div
                    key={kpi.id}
                    className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground border-border">
                          {kpi.category}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePinIndicatorAction(kpi.id)}
                            className={`p-1 rounded-lg transition-colors ${
                              kpi.pinnedToCockpit ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                            }`}
                            title={kpi.pinnedToCockpit ? "Fixado no Cockpit" : "Fixar no Cockpit"}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteIndicatorAction(kpi.id)}
                            className="p-1 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-foreground mb-1">{kpi.name}</div>
                      <div className="text-2xl font-extrabold text-foreground font-mono mb-2">
                        {kpi.unit} {kpi.currentValue}
                      </div>

                      {pct !== null && (
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Meta: {kpi.unit} {kpi.targetValue}</span>
                            <span className="font-mono text-foreground font-semibold">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5 bg-muted" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: DISTRIBUIÇÃO DE CONTEÚDO INDIVIDUAL (Seção 4) */}
      {activeSubTab === "content" && (
        <div className="space-y-5">
          {publications.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40">
              <Instagram className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">Nenhuma publicação cadastrada</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
                Cadastre suas publicações reais para acompanhar visualizações, engajamento e entradas no grupo com rastreabilidade real.
              </p>
              <Button
                onClick={() => handleOpenPubModal()}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>+ Adicionar Publicação</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Cards Comparativos & Totais Consolidados Reais */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      Total de Publicações
                    </span>
                    <span className="text-2xl font-bold font-mono text-foreground">{stats.totalPosts}</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Média: {stats.avgViews.toLocaleString("pt-BR")} views/post
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      Total Visualizações
                    </span>
                    <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                      {stats.totalViews.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
                      Top: {stats.topViews?.title} ({stats.topViews?.views} views)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      Cliques no Link
                    </span>
                    <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                      {stats.totalClicks.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
                      Top cliques: {stats.topClicks?.title}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/20 shadow-sm">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block mb-1">
                      Entradas Atribuídas no Grupo
                    </span>
                    <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {stats.totalGroupEntries}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
                      Top conversor: {stats.topGroup?.title} ({stats.topGroup?.groupEntries})
                    </span>
                  </div>
                </div>
              )}

              {/* Barra de Filtros e Busca de Publicações */}
              <div className="p-3 rounded-2xl bg-card border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  <div className="relative w-56">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      value={pubSearch}
                      onChange={(e) => setPubSearch(e.target.value)}
                      placeholder="Buscar publicação..."
                      className="h-8 pl-8 text-xs bg-background border-input text-foreground rounded-xl placeholder:text-muted-foreground"
                    />
                  </div>

                  <select
                    value={pubFilterPlatform}
                    onChange={(e) => setPubFilterPlatform(e.target.value)}
                    className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5 focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">Todas as Plataformas</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="other">Outras</option>
                  </select>

                  <select
                    value={pubFilterType}
                    onChange={(e) => setPubFilterType(e.target.value)}
                    className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5 focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">Todos os Formatos</option>
                    <option value="reels">Reels</option>
                    <option value="stories">Stories</option>
                    <option value="carousel">Carrossel</option>
                    <option value="post">Post Estático</option>
                    <option value="video">Vídeo</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ordenar por:</span>
                  <select
                    value={pubSortBy}
                    onChange={(e) => setPubSortBy(e.target.value as any)}
                    className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5 focus:ring-1 focus:ring-ring"
                  >
                    <option value="date">Data de Publicação</option>
                    <option value="views">Visualizações</option>
                    <option value="engagement">Engajamento (Curtidas/Comentários)</option>
                    <option value="groupEntries">Entradas no Grupo</option>
                  </select>
                </div>
              </div>

              {/* Tabela Comparativa de Publicações */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground">
                    <thead className="bg-muted/50 text-[11px] text-muted-foreground uppercase font-mono border-b border-border">
                      <tr>
                        <th className="py-3 px-4">Conteúdo</th>
                        <th className="py-3 px-3">Formato / Rede</th>
                        <th className="py-3 px-3">Data</th>
                        <th className="py-3 px-3 text-right">Views</th>
                        <th className="py-3 px-3 text-right">Alcance</th>
                        <th className="py-3 px-3 text-right">Cliques</th>
                        <th className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">Entradas Grupo</th>
                        <th className="py-3 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPublications.map((pub) => (
                        <tr key={pub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground truncate max-w-xs">{pub.title}</div>
                            {pub.url && (
                              <a
                                href={pub.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                <span>Ver post</span>
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono border-border text-muted-foreground">
                              {pub.type} · {pub.platform}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{pub.publishedAt}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                            {pub.views.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                            {pub.reach.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                            {pub.clicks.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {pub.groupEntries}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => handleOpenPubModal(pub)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                title="Editar publicação"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={() => duplicatePublicationAction(pub.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                title="Duplicar publicação"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={() => deletePublicationAction(pub.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-500 rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* DIÁLOGO: Criar / Editar Publicação Individual (Seção 4) */}
      <Dialog open={showPubModal} onOpenChange={setShowPubModal}>
        <DialogContent className="bg-card border border-border text-card-foreground max-w-xl p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingPubId ? "Editar Publicação" : "Cadastrar Nova Publicação"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePublication} className="space-y-3.5 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Título / Identificação do Conteúdo</label>
              <Input
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
                placeholder="Ex: Reels: 3 Erros Fatais no CRM de SDR"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-muted-foreground block mb-1">Formato</label>
                <select
                  value={pubType}
                  onChange={(e) => setPubType(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-xl bg-background border border-input text-foreground text-xs"
                >
                  <option value="reels">Reels</option>
                  <option value="stories">Stories</option>
                  <option value="carousel">Carrossel</option>
                  <option value="post">Post Estático</option>
                  <option value="video">Vídeo</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Plataforma</label>
                <select
                  value={pubPlatform}
                  onChange={(e) => setPubPlatform(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-xl bg-background border border-input text-foreground text-xs"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="other">Outras</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Data</label>
                <Input
                  type="date"
                  value={pubDate}
                  onChange={(e) => setPubDate(e.target.value)}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Link da Publicação (Opcional)</label>
              <Input
                value={pubUrl}
                onChange={(e) => setPubUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            {/* Métricas Reais do Post */}
            <div className="pt-2 border-t border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                Métricas de Alcance e Desempenho
              </span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Views</label>
                  <Input
                    type="number"
                    value={pubViews}
                    onChange={(e) => setPubViews(Number(e.target.value) || 0)}
                    className="h-7 text-xs bg-background border-input text-foreground rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Alcance</label>
                  <Input
                    type="number"
                    value={pubReach}
                    onChange={(e) => setPubReach(Number(e.target.value) || 0)}
                    className="h-7 text-xs bg-background border-input text-foreground rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Cliques Link</label>
                  <Input
                    type="number"
                    value={pubClicks}
                    onChange={(e) => setPubClicks(Number(e.target.value) || 0)}
                    className="h-7 text-xs bg-background border-input text-foreground rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-emerald-600 dark:text-emerald-400 block mb-1 font-bold">Entradas Grupo</label>
                  <Input
                    type="number"
                    value={pubGroupEntries}
                    onChange={(e) => setPubGroupEntries(Number(e.target.value) || 0)}
                    className="h-7 text-xs bg-background border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPubModal(false)}
                className="text-xs text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button type="submit" className="text-xs bg-primary text-primary-foreground rounded-xl px-4">
                Salvar Publicação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Criar Indicador KPI */}
      <Dialog open={showAddKPIModal} onOpenChange={setShowAddKPIModal}>
        <DialogContent className="bg-card border border-border text-card-foreground max-w-md p-6 rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Criar Indicador (KPI Builder)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateKPI} className="space-y-3 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Nome da Métrica</label>
              <Input
                value={kpiName}
                onChange={(e) => setKpiName(e.target.value)}
                placeholder="Ex: Reuniões Realizadas"
                className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-muted-foreground block mb-1">Valor Atual</label>
                <Input
                  type="number"
                  value={kpiCurrent}
                  onChange={(e) => setKpiCurrent(Number(e.target.value) || 0)}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Meta (Opcional)</label>
                <Input
                  type="number"
                  value={kpiTarget || ""}
                  onChange={(e) => setKpiTarget(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 50"
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-muted-foreground block mb-1">Unidade / Prefixo</label>
                <Input
                  value={kpiUnit}
                  onChange={(e) => setKpiUnit(e.target.value)}
                  placeholder="Ex: R$, %, un"
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Categoria</label>
                <select
                  value={kpiCategory}
                  onChange={(e) => setKpiCategory(e.target.value)}
                  className="w-full h-8 px-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none"
                >
                  <option value="geral">Geral</option>
                  <option value="comercial">Comercial</option>
                  <option value="midia">Mídia & Conteúdo</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddKPIModal(false)}
                className="text-xs text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button type="submit" className="text-xs bg-primary text-primary-foreground rounded-xl">
                Salvar Indicador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
