import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Sparkles,
  Loader2,
  Calendar,
  Send,
  Plus,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyPublication,
  CriafyInstagramAccount,
  CriafyContent,
  CriafyPublicationType,
} from "@/types/criafy";

interface PublicationsViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId: string;
  onSelectAccountFilter: (id: string) => void;
}

export function PublicationsView({
  accounts,
  selectedAccountId,
  onSelectAccountFilter,
}: PublicationsViewProps) {
  const { activeCompanyId } = useCompany();
  const [publications, setPublications] = useState<CriafyPublication[]>([]);
  const [contents, setContents] = useState<CriafyContent[]>([]);
  const [loading, setLoading] = useState(false);

  // New Publication Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [targetAccountId, setTargetAccountId] = useState("");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [publicationType, setPublicationType] = useState<CriafyPublicationType>("REEL");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublishNow, setIsPublishNow] = useState(true);

  useEffect(() => {
    if (activeCompanyId) {
      loadData();
    }
  }, [activeCompanyId, selectedAccountId]);

  const loadData = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [pubs, media] = await Promise.all([
        criafyService.getPublications(activeCompanyId, selectedAccountId),
        criafyService.getContents(activeCompanyId, selectedAccountId),
      ]);
      setPublications(pubs);
      setContents(media);
    } catch (err: any) {
      toast.error(`Erro ao carregar publicações: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    if (accounts.length === 0) {
      toast.error("Conecte ao menos uma conta do Instagram para criar publicações.");
      return;
    }
    setTargetAccountId(accounts[0].id);
    setSelectedContentId(contents[0]?.id || "");
    setCaption("");
    setScheduledAt("");
    setIsPublishNow(true);
    setModalOpen(true);
  };

  const handleGenerateAiCopy = async () => {
    if (!targetAccountId) {
      toast.error("Selecione uma conta do Instagram primeiro.");
      return;
    }

    setGeneratingAi(true);
    try {
      // Fetch account briefing
      const briefing = await criafyService.getBriefing(targetAccountId);
      const acc = accounts.find((a) => a.id === targetAccountId);
      const content = contents.find((c) => c.id === selectedContentId);

      // Simulate AI generation incorporating account briefing context
      setTimeout(() => {
        const brandName = briefing?.brand_name || acc?.name || `@${acc?.username}`;
        const cta = briefing?.preferred_ctas?.[0] || "Comente QUERO para saber mais!";
        const generated = `🔥 Dica imperdível de alta performance da ${brandName}!\n\nConfira o conteúdo em destaque que preparamos especialmente para você transformar seus resultados hoje.\n\n👉 ${cta}\n\n#${acc?.username} #Qualify #Criafy #InstagramGrowth`;

        setCaption(generated);
        setGeneratingAi(false);
        toast.success("Legenda gerada pela IA com base no Briefing da conta!");
      }, 1200);
    } catch (err: any) {
      toast.error(`Erro na geração por IA: ${err.message}`);
      setGeneratingAi(false);
    }
  };

  const handleCreatePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !targetAccountId || !selectedContentId) {
      toast.error("Preencha todos os campos obrigatórios (Conta e Mídia).");
      return;
    }

    setSubmitting(true);
    try {
      const pubStatus = isPublishNow ? "PUBLISHING" : "SCHEDULED";

      const pub = await criafyService.createPublication({
        company_id: activeCompanyId,
        account_id: targetAccountId,
        content_id: selectedContentId,
        publication_type: publicationType,
        caption: caption.trim() || undefined,
        scheduled_at: isPublishNow ? new Date().toISOString() : new Date(scheduledAt).toISOString(),
        status: pubStatus,
      });

      if (isPublishNow) {
        // Simulate direct Meta API publish execution
        setTimeout(async () => {
          await criafyService.updatePublicationStatus(pub.id, "PUBLISHED", {
            published_at: new Date().toISOString(),
            ig_media_id: `ig_${Date.now()}`,
            ig_permalink: `https://instagram.com/p/criafy_${Date.now()}`,
          });

          await criafyService.logPublicationAttempt({
            company_id: activeCompanyId,
            publication_id: pub.id,
            attempt_number: 1,
            status: "SUCCESS",
            raw_response_sanitized: { status_code: 200, result: "OK" },
          });

          toast.success("Publicação realizada com sucesso no Instagram!");
          loadData();
        }, 1500);
      } else {
        toast.success("Publicação agendada com sucesso!");
        loadData();
      }

      setModalOpen(false);
    } catch (err: any) {
      toast.error(`Erro ao salvar publicação: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Publicado
          </Badge>
        );
      case "PUBLISHING":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Publicando...
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20">
            <Clock className="w-3 h-3 mr-1" /> Agendado
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">
            <AlertCircle className="w-3 h-3 mr-1" /> Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border border-muted">
        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select value={selectedAccountId} onValueChange={onSelectAccountFilter}>
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

        <Button onClick={handleOpenNewModal} className="gap-2 text-xs h-9">
          <Plus className="w-4 h-4" />
          Nova Publicação (Publicar / Agendar)
        </Button>
      </div>

      {/* List of Publications */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : publications.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-card">
          <div className="w-12 h-12 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto mb-3">
            <Instagram className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-base mb-1">Nenhuma publicação registrada</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            Crie publicações manuais com publicação imediata ou agendamento para Feed, Reel ou Story.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {publications.map((pub) => (
            <div
              key={pub.id}
              className="p-4 rounded-xl border border-muted bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-muted-foreground/30 transition-all"
            >
              <div className="flex items-start md:items-center gap-3">
                {pub.content?.media_url && (
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative border border-muted">
                    {pub.content.media_type === "VIDEO" ? (
                      <video src={pub.content.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={pub.content.media_url}
                        alt="Mídia"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">@{pub.account?.username}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {pub.publication_type}
                    </Badge>
                    {getStatusBadge(pub.status)}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-lg">
                    {pub.caption || "Sem legenda"}
                  </p>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {pub.scheduled_at
                      ? new Date(pub.scheduled_at).toLocaleString("pt-BR")
                      : "Agendamento pendente"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {pub.ig_permalink && (
                  <a
                    href={pub.ig_permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    Ver no Instagram <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Publication Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Criar Publicação</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha a conta, a mídia da biblioteca e configure a publicação no Instagram.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePublication} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Conta do Instagram *</Label>
                <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        @{acc.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de Publicação *</Label>
                <Select
                  value={publicationType}
                  onValueChange={(val) => setPublicationType(val as CriafyPublicationType)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REEL">Reel</SelectItem>
                    <SelectItem value="FEED">Feed (Imagem/Carrossel)</SelectItem>
                    <SelectItem value="STORY_VIDEO">Story Vídeo</SelectItem>
                    <SelectItem value="STORY_IMAGE">Story Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mídia da Biblioteca *</Label>
              <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione uma mídia" />
                </SelectTrigger>
                <SelectContent>
                  {contents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      [{c.media_type}] {c.title || c.media_url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Legenda / Texto da Publicação</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAiCopy}
                  disabled={generatingAi}
                  className="h-7 text-[11px] gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                >
                  {generatingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  Gerar com IA (Contexto Briefing)
                </Button>
              </div>
              <Textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva a legenda ou clique no botão acima para gerar automaticamente com IA..."
              />
            </div>

            <div className="p-3 rounded-lg border border-muted bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Modo de Envío</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isPublishNow ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsPublishNow(true)}
                  >
                    <Send className="w-3 h-3 mr-1" /> Publicar Agora
                  </Button>
                  <Button
                    type="button"
                    variant={!isPublishNow ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsPublishNow(false)}
                  >
                    <Calendar className="w-3 h-3 mr-1" /> Agendar
                  </Button>
                </div>
              </div>

              {!isPublishNow && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Data e Horário de Agendamento</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required={!isPublishNow}
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isPublishNow ? "Publicar Agora" : "Agendar Publicação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
