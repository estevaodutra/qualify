import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  Video,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  Instagram,
  Trash2,
  Search,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyContent, CriafyInstagramAccount } from "@/types/criafy";
import { extractAndValidateMedia } from "@/utils/criafyMediaValidator";
import { BulkScheduleModal } from "@/components/criafy/BulkScheduleModal";

interface MediaLibraryViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId: string;
  onSelectAccountFilter: (id: string) => void;
}

export function MediaLibraryView({
  accounts,
  selectedAccountId,
  onSelectAccountFilter,
}: MediaLibraryViewProps) {
  const { activeCompanyId } = useCompany();
  const [contents, setContents] = useState<CriafyContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "unpublished" | "scheduled"
  >("all");

  // Multi-select for bulk scheduling from library
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkInitialIds, setBulkInitialIds] = useState<string[]>([]);

  // Account linkage modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<CriafyContent | null>(
    null
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [savingBindings, setSavingBindings] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadContents();
    }
  }, [activeCompanyId, selectedAccountId]);

  const loadContents = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const data = await criafyService.getContents(
        activeCompanyId,
        selectedAccountId
      );
      setContents(data);
    } catch (err: any) {
      toast.error(`Erro ao carregar conteúdos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeCompanyId) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    const newlyCreatedIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Validação técnica prévia no client para Meta Instagram
        const validation = await extractAndValidateMedia(file);

        // Upload to storage
        const { mediaUrl, mediaType, mimeType } =
          await criafyService.uploadMediaFile(activeCompanyId, file);

        // Bind automatically to current account filter if selected, or all accounts
        const defaultAccounts =
          selectedAccountId !== "all"
            ? [selectedAccountId]
            : accounts.map((a) => a.id);

        const created = await criafyService.createContent(
          {
            company_id: activeCompanyId,
            title: file.name,
            media_url: mediaUrl,
            media_type: mediaType,
            mime_type: mimeType,
            file_size_bytes: file.size,
            width: validation.width || undefined,
            height: validation.height || undefined,
            duration_seconds: validation.durationSeconds || undefined,
            aspect_ratio: validation.aspectRatio,
            meta_validation_status: validation.isValid ? "VALID" : "INVALID",
            meta_validation_errors: validation.errors,
          },
          defaultAccounts
        );

        newlyCreatedIds.push(created.id);
        successCount++;
      } catch (err) {
        console.error("Erro no upload do arquivo:", file.name, err);
        failCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(
        `${successCount} arquivo(s) adicionado(s)! Abrindo programação em Bulk...`
      );
      await loadContents();
      // Abre automaticamente o modal de programação em bulk com os arquivos recém-enviados pré-selecionados!
      setBulkInitialIds(newlyCreatedIds);
      setSelectedContentIds(newlyCreatedIds);
      setBulkModalOpen(true);
    }
    if (failCount > 0) {
      toast.error(`Falha no upload de ${failCount} arquivo(s).`);
    }
    // Reset file input
    e.target.value = "";
  };

  const toggleSelectCard = (contentId: string) => {
    setSelectedContentIds((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : [...prev, contentId]
    );
  };

  const handleOpenBulkModal = (ids?: string[]) => {
    if (ids && ids.length > 0) {
      setBulkInitialIds(ids);
    } else if (selectedContentIds.length > 0) {
      setBulkInitialIds(selectedContentIds);
    } else {
      const unpubIds = contents
        .filter((c) => !c.is_published && !c.is_scheduled)
        .map((c) => c.id);
      setBulkInitialIds(unpubIds);
    }
    setBulkModalOpen(true);
  };

  const openLinkModal = (content: CriafyContent) => {
    setSelectedContent(content);
    setSelectedAccountIds(content.linked_account_ids || []);
    setLinkModalOpen(true);
  };

  const handleSaveBindings = async () => {
    if (!selectedContent || !activeCompanyId) return;
    setSavingBindings(true);
    try {
      await criafyService.updateContentAccountBindings(
        activeCompanyId,
        selectedContent.id,
        selectedAccountIds
      );
      toast.success("Vínculo de contas atualizado!");
      setLinkModalOpen(false);
      loadContents();
    } catch (err: any) {
      toast.error(`Erro ao atualizar vínculo: ${err.message}`);
    } finally {
      setSavingBindings(false);
    }
  };

  const handleArchive = async (contentId: string) => {
    try {
      await criafyService.archiveContent(contentId);
      toast.success("Conteúdo arquivado!");
      loadContents();
    } catch (err: any) {
      toast.error(`Erro ao arquivar: ${err.message}`);
    }
  };

  const publishedCount = contents.filter((c) => !!c.is_published).length;
  const unpublishedCount = contents.filter(
    (c) => !c.is_published && !c.is_scheduled
  ).length;
  const scheduledCount = contents.filter((c) => !!c.is_scheduled).length;

  const filteredContents = contents.filter((c) => {
    const matchesSearch = (c.title || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "published") return !!c.is_published;
    if (statusFilter === "unpublished")
      return !c.is_published && !c.is_scheduled;
    if (statusFilter === "scheduled") return !!c.is_scheduled;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col gap-3 bg-muted/30 p-4 rounded-xl border border-muted">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar conteúdos..."
                className="pl-9 bg-background h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-48">
              <Select
                value={selectedAccountId}
                onValueChange={onSelectAccountFilter}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Filtrar por Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      @{acc.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => handleOpenBulkModal()}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:opacity-90 border-0 shadow-sm rounded-lg cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              {selectedContentIds.length > 0
                ? `Programar Selecionados em Bulk (${selectedContentIds.length})`
                : "Upload & Programar em Bulk"}
            </Button>

            <Label
              htmlFor="batch-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 h-9 rounded-lg bg-primary text-primary-foreground font-medium text-xs shadow-sm hover:opacity-90 transition-all"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload em Lote (Imagens / Vídeos)
            </Label>
            <Input
              id="batch-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleBatchUpload}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Filter Pills: Todos, Inéditos, Publicados, Agendados */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-muted/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                statusFilter === "all"
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "bg-background/80 text-muted-foreground hover:text-foreground border border-muted"
              }`}
            >
              Todos ({contents.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unpublished")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium flex items-center gap-1 ${
                statusFilter === "unpublished"
                  ? "bg-amber-500 text-white shadow-xs font-semibold"
                  : "bg-background/80 text-muted-foreground hover:text-amber-600 border border-muted"
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> Inéditos (
              {unpublishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium flex items-center gap-1 ${
                statusFilter === "published"
                  ? "bg-emerald-600 text-white shadow-xs font-semibold"
                  : "bg-background/80 text-muted-foreground hover:text-emerald-600 border border-muted"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Já
              Publicados ({publishedCount})
            </button>
            {scheduledCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("scheduled")}
                className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium flex items-center gap-1 ${
                  statusFilter === "scheduled"
                    ? "bg-sky-600 text-white shadow-xs font-semibold"
                    : "bg-background/80 text-muted-foreground hover:text-sky-600 border border-muted"
                }`}
              >
                <Clock className="w-3 h-3 text-sky-400" /> Agendados (
                {scheduledCount})
              </button>
            )}
          </div>

          {filteredContents.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedContentIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedContentIds([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Limpar seleção ({selectedContentIds.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedContentIds(filteredContents.map((c) => c.id))
                  }
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Selecionar todos visíveis ({filteredContents.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid of Media Contents */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-card">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-base mb-1">
            Nenhum conteúdo encontrado
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            {statusFilter !== "all"
              ? "Nenhuma mídia corresponde ao filtro selecionado. Tente alterar o filtro acima."
              : "Faça upload em lote de vídeos e imagens para começar a alimentar a biblioteca e programar tudo de uma vez no Criafy."}
          </p>
          <Button
            onClick={() => handleOpenBulkModal()}
            className="gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
          >
            <Layers className="w-4 h-4" /> Subir e Programar em Bulk
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredContents.map((content) => {
            const isPub = !!content.is_published;
            const isSched = !!content.is_scheduled;
            const isCardSelected = selectedContentIds.includes(content.id);
            const lastPub = content.publications?.find(
              (p) => p.status === "PUBLISHED"
            );

            return (
              <Card
                key={content.id}
                onClick={() => toggleSelectCard(content.id)}
                className={`overflow-hidden group hover:shadow-md transition-all border cursor-pointer ${
                  isCardSelected
                    ? "ring-2 ring-purple-600 border-purple-600 bg-purple-500/[0.04]"
                    : isPub
                    ? "border-emerald-500/50 shadow-xs bg-emerald-500/[0.03]"
                    : isSched
                    ? "border-sky-500/50 shadow-xs bg-sky-500/[0.03]"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="relative aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
                  {content.media_type === "VIDEO" ? (
                    <video
                      src={content.media_url}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  ) : (
                    <img
                      src={content.media_url}
                      alt={content.title || "Mídia Criafy"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                  )}

                  {/* Top-left: Selection Checkbox + Media Type Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                        isCardSelected
                          ? "bg-purple-600 text-white"
                          : "bg-black/60 text-white/80 border border-white/40"
                      }`}
                    >
                      {isCardSelected ? "✓" : ""}
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-black/70 text-white text-[10px] backdrop-blur-sm border-0 font-medium"
                    >
                      {content.media_type === "VIDEO" ? (
                        <Video className="w-3 h-3 mr-1 text-sky-400" />
                      ) : (
                        <ImageIcon className="w-3 h-3 mr-1 text-emerald-400" />
                      )}
                      {content.media_type}
                      {content.duration_seconds
                        ? ` • ${Math.round(content.duration_seconds)}s`
                        : ""}
                    </Badge>
                  </div>

                  {/* Top-right: Publication Status Highlight */}
                  <div className="absolute top-2 right-2">
                    {isPub ? (
                      <Badge
                        className="bg-emerald-600 text-white border-0 text-[10px] backdrop-blur-sm font-bold shadow-md flex items-center gap-1"
                        title={`Publicado ${content.publish_count}x no Instagram`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        Publicado ({content.publish_count}x)
                      </Badge>
                    ) : isSched ? (
                      <Badge className="bg-sky-600 text-white border-0 text-[10px] backdrop-blur-sm font-semibold shadow-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white" />
                        Agendado
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-black/60 text-amber-300 border-0 text-[10px] backdrop-blur-sm font-semibold shadow-sm flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        Inédito
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent
                  className="p-3 space-y-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="truncate font-medium text-xs"
                    title={content.title}
                  >
                    {content.title || "Conteúdo sem título"}
                  </div>

                  {/* Status Banner */}
                  {isPub ? (
                    <div className="flex items-center justify-between text-[11px] bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">
                          Publicado ({content.publish_count}x)
                        </span>
                      </span>
                      {lastPub?.ig_permalink ? (
                        <a
                          href={lastPub.ig_permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 text-[10px] shrink-0 font-semibold"
                          title="Abrir no Instagram"
                        >
                          Ver <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : content.last_published_at ? (
                        <span className="text-[10px] text-muted-foreground shrink-0 font-normal">
                          {new Date(content.last_published_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      ) : null}
                    </div>
                  ) : isSched ? (
                    <div className="flex items-center gap-1.5 text-[11px] bg-sky-500/10 text-sky-800 dark:text-sky-300 px-2.5 py-1.5 rounded-lg border border-sky-500/20 font-medium">
                      <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>Agendado na fila do Instagram</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] bg-muted/60 text-muted-foreground px-2.5 py-1.5 rounded-lg border border-muted font-normal">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Mídia inédita (nunca publicada)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground pt-1 border-t border-muted">
                    <button
                      type="button"
                      onClick={() => openLinkModal(content)}
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <Instagram className="w-3 h-3" />
                      {content.linked_account_ids?.length || 0} conta(s)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchive(content.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Arquivar conteúdo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Account Bindings Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Vincular Conteúdo às Contas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione quais contas do Instagram poderão utilizar esta mídia
              para publicações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma conta conectada.
              </p>
            ) : (
              accounts.map((acc) => {
                const isChecked = selectedAccountIds.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-muted hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      if (isChecked) {
                        setSelectedAccountIds(
                          selectedAccountIds.filter((id) => id !== acc.id)
                        );
                      } else {
                        setSelectedAccountIds([...selectedAccountIds, acc.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7 border border-border shadow-sm">
                        {acc.profile_picture_url ? (
                          <AvatarImage
                            src={acc.profile_picture_url}
                            alt={acc.username}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="bg-pink-500/10 text-pink-500 text-[10px] font-bold">
                          @{acc.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-semibold">@{acc.username}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {acc.name || "Conta Instagram"}
                        </p>
                      </div>
                    </div>
                    <Checkbox checked={isChecked} />
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setLinkModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBindings} disabled={savingBindings}>
              {savingBindings && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar Vínculos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Schedule Modal */}
      <BulkScheduleModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        initialLibraryContentIds={bulkInitialIds}
        onSuccess={() => {
          setSelectedContentIds([]);
          loadContents();
        }}
      />
    </div>
  );
}
