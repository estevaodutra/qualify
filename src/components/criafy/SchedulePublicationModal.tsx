import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarDays,
  Clock,
  Sparkles,
  Send,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyInstagramAccount,
  CriafyContent,
  CriafyPublicationType,
} from "@/types/criafy";

interface SchedulePublicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  initialDate?: Date | string | null;
  initialContentId?: string;
  initialPublicationType?: CriafyPublicationType;
  onSuccess?: () => void;
  onOpenBulk?: () => void;
}

export function SchedulePublicationModal({
  open,
  onOpenChange,
  accounts,
  selectedAccountId,
  initialDate,
  initialContentId,
  initialPublicationType,
  onSuccess,
  onOpenBulk,
}: SchedulePublicationModalProps) {
  const { activeCompanyId } = useCompany();
  const [contents, setContents] = useState<CriafyContent[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Form Mode: Single post vs Story Sequence
  const [mode, setMode] = useState<"SINGLE" | "STORY_SEQUENCE">("SINGLE");

  // Common fields
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [isPublishNow, setIsPublishNow] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Single post fields
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [publicationType, setPublicationType] = useState<CriafyPublicationType>("REEL");
  const [caption, setCaption] = useState<string>("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // Story Sequence fields
  const [sequenceContentIds, setSequenceContentIds] = useState<string[]>([]);
  const [sequenceIntervalMinutes, setSequenceIntervalMinutes] = useState<number>(1);

  // Load contents when modal opens
  useEffect(() => {
    if (open && activeCompanyId) {
      loadContents();
    }
  }, [open, activeCompanyId]);

  // Set initial values
  useEffect(() => {
    if (open) {
      // Target account
      if (selectedAccountId && selectedAccountId !== "all") {
        setTargetAccountId(selectedAccountId);
      } else if (accounts.length > 0) {
        setTargetAccountId(accounts[0].id);
      }

      // Initial Date formatting (YYYY-MM-DDTHH:MM)
      if (initialDate) {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          // If no specific hour (e.g. 00:00:00), default to 18:00
          if (d.getHours() === 0 && d.getMinutes() === 0) {
            d.setHours(18, 0, 0, 0);
          }
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
          setScheduledAt(localISOTime);
          setIsPublishNow(false);
        }
      } else {
        const d = new Date();
        d.setHours(d.getHours() + 1, 0, 0, 0);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setScheduledAt(localISOTime);
        setIsPublishNow(false);
      }

      // Initial content & type
      if (initialContentId) {
        setSelectedContentId(initialContentId);
        setSequenceContentIds([initialContentId]);
      }
      if (initialPublicationType) {
        setPublicationType(initialPublicationType);
        if (initialPublicationType === "STORY_VIDEO" || initialPublicationType === "STORY_IMAGE") {
          // Keep single by default, user can switch to sequence tab
        }
      }
    }
  }, [open, selectedAccountId, accounts, initialDate, initialContentId, initialPublicationType]);

  const loadContents = async () => {
    if (!activeCompanyId) return;
    setLoadingMedia(true);
    try {
      const data = await criafyService.getContents(activeCompanyId);
      setContents(data);
      if (!selectedContentId && data.length > 0) {
        setSelectedContentId(data[0].id);
        if (data[0].media_type === "VIDEO") {
          setPublicationType("REEL");
        } else {
          setPublicationType("FEED");
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar mídias da biblioteca: ${err.message}`);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleSingleContentSelect = (contentId: string) => {
    setSelectedContentId(contentId);
    const media = contents.find((c) => c.id === contentId);
    if (!media) return;

    if (media.media_type === "VIDEO") {
      const isOver60s = media.duration_seconds && media.duration_seconds > 60;
      if (isOver60s) {
        if (publicationType === "STORY_VIDEO" || publicationType === "STORY_IMAGE") {
          setPublicationType("REEL");
          toast.info("Vídeo com mais de 60s: Stories desabilitado. Formato alterado para Reel.");
        }
      } else if (publicationType === "STORY_IMAGE") {
        setPublicationType("STORY_VIDEO");
      }
    } else if (media.media_type === "IMAGE") {
      if (publicationType === "REEL" || publicationType === "STORY_VIDEO") {
        setPublicationType("FEED");
        toast.info("Imagem selecionada: formato ajustado para Feed.");
      }
    }
  };

  const handleToggleSequenceItem = (contentId: string) => {
    const media = contents.find((c) => c.id === contentId);
    if (media?.media_type === "VIDEO" && media.duration_seconds && media.duration_seconds > 60) {
      toast.error(
        `O Instagram não aceita vídeos em Stories acima de 60s (este vídeo possui ${Math.round(media.duration_seconds)}s). Utilize vídeos de até 60s para sequências de Stories.`
      );
      return;
    }

    if (sequenceContentIds.includes(contentId)) {
      setSequenceContentIds(sequenceContentIds.filter((id) => id !== contentId));
    } else {
      setSequenceContentIds([...sequenceContentIds, contentId]);
    }
  };

  const handleMoveSequenceItem = (index: number, direction: "UP" | "DOWN") => {
    const nextList = [...sequenceContentIds];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setSequenceContentIds(nextList);
  };

  const handleRemoveSequenceItem = (index: number) => {
    const nextList = [...sequenceContentIds];
    nextList.splice(index, 1);
    setSequenceContentIds(nextList);
  };

  const handleGenerateAiCopy = async () => {
    if (!activeCompanyId || !targetAccountId) {
      toast.error("Selecione uma conta do Instagram primeiro.");
      return;
    }

    setGeneratingAi(true);
    try {
      const generated = await criafyService.generateAiCopy({
        companyId: activeCompanyId,
        accountId: targetAccountId,
        contentId: selectedContentId || undefined,
        promptType: "CAPTION",
        publicationType,
        customInstruction: caption.trim() || undefined,
      });

      setCaption(generated);
      toast.success("Copy gerada com sucesso pela IA!");
    } catch (err: any) {
      toast.error(`Falha ao gerar copy com a IA: ${err.message}`);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !targetAccountId) {
      toast.error("Selecione uma conta do Instagram.");
      return;
    }

    if (!isPublishNow && !scheduledAt) {
      toast.error("Informe a data e o horário do agendamento.");
      return;
    }

    const baseScheduledDate = isPublishNow ? new Date() : new Date(scheduledAt);
    if (isNaN(baseScheduledDate.getTime())) {
      toast.error("Data e horário inválidos.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "SINGLE") {
        if (!selectedContentId) {
          toast.error("Selecione uma mídia para publicar.");
          setSubmitting(false);
          return;
        }

        const selectedContent = contents.find((c) => c.id === selectedContentId);
        if (
          publicationType === "STORY_VIDEO" &&
          selectedContent?.duration_seconds &&
          selectedContent.duration_seconds > 60
        ) {
          toast.error(
            `O Instagram permite no máximo 60s para Stories (este vídeo tem ${Math.round(selectedContent.duration_seconds)}s). Altere para "Reel".`
          );
          setSubmitting(false);
          return;
        }

        const pubStatus = isPublishNow ? "PUBLISHING" : "SCHEDULED";
        const pub = await criafyService.createPublication({
          company_id: activeCompanyId,
          account_id: targetAccountId,
          content_id: selectedContentId,
          publication_type: publicationType,
          caption: caption.trim() || undefined,
          scheduled_at: baseScheduledDate.toISOString(),
          status: pubStatus,
        });

        if (isPublishNow) {
          onOpenChange(false);
          toast.info("Publicação iniciada em segundo plano! Acompanhe o status no calendário.", {
            id: `pub-${pub.id}`,
            duration: 4000,
          });

          criafyService
            .publishNow(pub.id)
            .then((res) => {
              toast.success("Publicação realizada com sucesso no Instagram!", {
                id: `pub-${pub.id}`,
                duration: 8000,
                action: res?.igPermalink
                  ? {
                      label: "Ver no Instagram",
                      onClick: () => window.open(res.igPermalink, "_blank"),
                    }
                  : undefined,
              });
              onSuccess?.();
            })
            .catch((err: any) => {
              toast.error(`Falha ao publicar na Meta: ${err.message}`, {
                id: `pub-${pub.id}`,
                duration: 10000,
              });
              onSuccess?.();
            });
        } else {
          toast.success("Publicação agendada no calendário com sucesso!");
          onOpenChange(false);
          onSuccess?.();
        }
      } else {
        // STORY SEQUENCE MODE
        if (sequenceContentIds.length < 2) {
          toast.error("Uma sequência de stories precisa de no mínimo 2 conteúdos selecionados.");
          setSubmitting(false);
          return;
        }

        const sequenceId = crypto.randomUUID();
        const total = sequenceContentIds.length;
        const pubItems = sequenceContentIds.map((cId, idx) => {
          const itemMedia = contents.find((c) => c.id === cId);
          const isVid = itemMedia?.media_type === "VIDEO";
          const pType: CriafyPublicationType = isVid ? "STORY_VIDEO" : "STORY_IMAGE";

          // Calculate offset time
          const itemDate = new Date(baseScheduledDate.getTime() + idx * sequenceIntervalMinutes * 60000);

          return {
            company_id: activeCompanyId,
            account_id: targetAccountId,
            content_id: cId,
            publication_type: pType,
            caption: undefined, // Stories typically don't take caption in graph api media container
            scheduled_at: itemDate.toISOString(),
            status: (isPublishNow && idx === 0 ? "PUBLISHING" : "SCHEDULED") as any,
            story_sequence_id: sequenceId,
            sequence_order: idx + 1,
            sequence_total: total,
          };
        });

        const createdPubs = await criafyService.createPublicationSequence(pubItems);
        toast.success(`Sequência de ${total} stories programada com sucesso!`);
        onOpenChange(false);

        if (isPublishNow && createdPubs.length > 0) {
          const firstPub = createdPubs[0];
          toast.info("Iniciando publicação do 1º Story da sequência...", {
            id: `seq-${firstPub.id}`,
            duration: 4000,
          });

          criafyService
            .publishNow(firstPub.id)
            .then(() => {
              toast.success("1º Story publicado! Os próximos serão disparados em sequência.", {
                id: `seq-${firstPub.id}`,
                duration: 8000,
              });
              onSuccess?.();
            })
            .catch((err: any) => {
              toast.error(`Falha no Story da sequência: ${err.message}`, {
                id: `seq-${firstPub.id}`,
                duration: 10000,
              });
              onSuccess?.();
            });
        }

        onSuccess?.();
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar programação: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSingleMedia = contents.find((c) => c.id === selectedContentId);
  const targetAccountObj = accounts.find((a) => a.id === targetAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-muted">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-pink-500" />
              Programar Publicação no Instagram
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina o formato, selecione os conteúdos da biblioteca e escolha o horário de publicação ou agendamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Top Toggle: Post Individual vs Sequência de Stories vs Programação em Bulk */}
          <div className="flex flex-wrap bg-muted/60 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMode("SINGLE")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mode === "SINGLE"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              Post Individual
            </button>
            <button
              type="button"
              onClick={() => setMode("STORY_SEQUENCE")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mode === "STORY_SEQUENCE"
                  ? "bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Sequência de Stories ({sequenceContentIds.length})
            </button>
            {onOpenBulk && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenBulk();
                }}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Upload & Programar em Bulk
              </button>
            )}
          </div>

          {/* Account Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Conta de Destino do Instagram</Label>
            <Select value={targetAccountId} onValueChange={setTargetAccountId}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={acc.profile_picture_url || undefined} />
                        <AvatarFallback className="text-[9px]">@{acc.username[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">@{acc.username}</span>
                      <span className="text-muted-foreground text-[10px]">({acc.name || "Instagram"})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SINGLE POST CONFIGURATION */}
          {mode === "SINGLE" && (
            <div className="space-y-4">
              {/* Publication Format Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Formato no Instagram</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => {
                      if (selectedSingleMedia?.media_type === "IMAGE") {
                        toast.info("Imagens não podem ser publicadas como Reel.");
                        return;
                      }
                      setPublicationType("REEL");
                    }}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      publicationType === "REEL"
                        ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold shadow-sm"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      🎬 Reel
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Vídeo 9:16 até 15min
                    </div>
                  </div>

                  <div
                    onClick={() => setPublicationType("FEED")}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      publicationType === "FEED"
                        ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold shadow-sm"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      🖼️ Feed
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Imagem ou Vídeo
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (
                        selectedSingleMedia?.media_type === "VIDEO" &&
                        selectedSingleMedia.duration_seconds &&
                        selectedSingleMedia.duration_seconds > 60
                      ) {
                        toast.error(
                          `Vídeo com ${Math.round(selectedSingleMedia.duration_seconds)}s ultrapassa o limite de 60s da Meta para Stories. Escolha "Reel".`
                        );
                        return;
                      }
                      setPublicationType(
                        selectedSingleMedia?.media_type === "IMAGE" ? "STORY_IMAGE" : "STORY_VIDEO"
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      publicationType === "STORY_VIDEO" || publicationType === "STORY_IMAGE"
                        ? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 font-bold shadow-sm"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      📖 Story Único
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      9:16 (vídeo até 60s)
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Media Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Selecione a Mídia da Biblioteca</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {contents.length} arquivo(s) disponível(is)
                  </span>
                </div>

                {loadingMedia ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : contents.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg text-center">
                    Nenhuma mídia encontrada na biblioteca. Faça o upload na aba Biblioteca primeiro.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1.5 border border-muted rounded-xl bg-card">
                    {contents.map((item) => {
                      const isSelected = selectedContentId === item.id;
                      const isOver60s =
                        item.media_type === "VIDEO" &&
                        item.duration_seconds &&
                        item.duration_seconds > 60;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSingleContentSelect(item.id)}
                          className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                            isSelected
                              ? "border-pink-500 ring-2 ring-pink-500/30 scale-[0.98]"
                              : "border-transparent hover:border-muted-foreground/30 opacity-80 hover:opacity-100"
                          }`}
                        >
                          {item.media_type === "VIDEO" ? (
                            <video
                              src={item.media_url}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                            />
                          ) : (
                            <img
                              src={item.media_url}
                              alt={item.title || ""}
                              className="w-full h-full object-cover"
                            />
                          )}

                          <div className="absolute top-1 left-1">
                            <Badge className="bg-black/70 text-white text-[9px] px-1 py-0 h-4 border-0">
                              {item.media_type === "VIDEO" ? (
                                <Video className="w-2.5 h-2.5 mr-0.5 text-sky-400" />
                              ) : (
                                <ImageIcon className="w-2.5 h-2.5 mr-0.5 text-emerald-400" />
                              )}
                              {item.duration_seconds ? `${Math.round(item.duration_seconds)}s` : ""}
                            </Badge>
                          </div>

                          {item.is_published && (
                            <div className="absolute top-1 right-1">
                              <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0 h-4 border-0">
                                {item.publish_count}x
                              </Badge>
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-md">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Caption & IA Assistant (for Feed/Reels) */}
              {(publicationType === "FEED" || publicationType === "REEL") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Legenda / Copy do Post</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAiCopy}
                      disabled={generatingAi}
                      className="h-7 text-[11px] gap-1.5 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
                    >
                      {generatingAi ? (
                        <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-purple-600" />
                      )}
                      Gerar Legenda com IA
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Escreva a legenda do Instagram ou use o assistente de IA..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={4}
                    className="text-xs resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* STORY SEQUENCE CONFIGURATION */}
          {mode === "STORY_SEQUENCE" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-500/20 space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-pink-500" />
                  <span className="font-bold text-xs">Criador de Sequência de Stories</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Selecione múltiplos stories para serem postados em sequência encadeada no Instagram. O sistema publicará ou agendará cada story na ordem definida com o intervalo de tempo escolhido.
                </p>
              </div>

              {/* Selected Sequence Order */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Ordem dos Stories na Sequência ({sequenceContentIds.length} selecionados)
                  </Label>
                  {sequenceContentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSequenceContentIds([])}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {sequenceContentIds.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-xl text-center space-y-1 text-muted-foreground bg-muted/10">
                    <Layers className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-medium">Nenhum story selecionado ainda</p>
                    <p className="text-[11px]">
                      Clique nas mídias abaixo para adicionar à sequência na ordem desejada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {sequenceContentIds.map((cId, idx) => {
                      const item = contents.find((c) => c.id === cId);
                      if (!item) return null;

                      return (
                        <div
                          key={`seq-item-${cId}-${idx}`}
                          className="flex items-center justify-between p-2 rounded-lg border border-muted bg-card hover:border-pink-500/30 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-500 text-white font-bold text-[10px] shrink-0 shadow-sm">
                              {idx + 1}
                            </span>
                            <div className="w-8 h-12 rounded bg-black/10 overflow-hidden shrink-0 border border-muted">
                              {item.media_type === "VIDEO" ? (
                                <video
                                  src={item.media_url}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <img
                                  src={item.media_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate text-[11px]">
                                {item.title || `Story #${idx + 1}`}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{item.media_type}</span>
                                {item.duration_seconds && (
                                  <span>• {Math.round(item.duration_seconds)}s</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveSequenceItem(idx, "UP")}
                              disabled={idx === 0}
                              className="w-6 h-6"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveSequenceItem(idx, "DOWN")}
                              disabled={idx === sequenceContentIds.length - 1}
                              className="w-6 h-6"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSequenceItem(idx)}
                              className="w-6 h-6 text-muted-foreground hover:text-destructive"
                              title="Remover da sequência"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Interval / Cadence Between Stories */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-muted bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Intervalo entre cada Story</Label>
                  <Select
                    value={String(sequenceIntervalMinutes)}
                    onValueChange={(val) => setSequenceIntervalMinutes(Number(val))}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Simultâneo / Mesmo minuto (0 min)</SelectItem>
                      <SelectItem value="1">1 minuto de intervalo</SelectItem>
                      <SelectItem value="2">2 minutos de intervalo</SelectItem>
                      <SelectItem value="5">5 minutos de intervalo</SelectItem>
                      <SelectItem value="10">10 minutos de intervalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Duração Total da Sequência</Label>
                  <div className="h-9 rounded-md bg-background px-3 flex items-center border border-input text-xs text-muted-foreground font-medium">
                    {sequenceContentIds.length > 0
                      ? `${sequenceContentIds.length} stories (~${(sequenceContentIds.length - 1) * sequenceIntervalMinutes} min)`
                      : "Selecione stories"}
                  </div>
                </div>
              </div>

              {/* Multi-Picker from Library */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Clique para adicionar ou remover da sequência
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1.5 border border-muted rounded-xl bg-card">
                  {contents.map((item) => {
                    const seqIndex = sequenceContentIds.indexOf(item.id);
                    const isSelected = seqIndex !== -1;
                    const isOver60s =
                      item.media_type === "VIDEO" &&
                      item.duration_seconds &&
                      item.duration_seconds > 60;

                    return (
                      <div
                        key={`pick-${item.id}`}
                        onClick={() => handleToggleSequenceItem(item.id)}
                        className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-pink-500 ring-2 ring-pink-500/30 scale-[0.98]"
                            : isOver60s
                            ? "border-rose-500/30 opacity-40 cursor-not-allowed"
                            : "border-transparent hover:border-muted-foreground/30 opacity-80 hover:opacity-100"
                        }`}
                        title={
                          isOver60s
                            ? "Vídeo com mais de 60s não pode ser Story"
                            : item.title || "Clique para alternar na sequência"
                        }
                      >
                        {item.media_type === "VIDEO" ? (
                          <video
                            src={item.media_url}
                            className="w-full h-full object-cover pointer-events-none"
                            muted
                          />
                        ) : (
                          <img
                            src={item.media_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}

                        <div className="absolute top-1 left-1">
                          <Badge className="bg-black/70 text-white text-[9px] px-1 py-0 h-4 border-0">
                            {item.duration_seconds ? `${Math.round(item.duration_seconds)}s` : item.media_type}
                          </Badge>
                        </div>

                        {isSelected && (
                          <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                              {seqIndex + 1}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Timing & Schedule Options */}
          <div className="p-3.5 rounded-xl border border-muted bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-pink-500" />
                Momento da Publicação
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPublishNow(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    isPublishNow
                      ? "bg-pink-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Publicar Imediatamente
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublishNow(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    !isPublishNow
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Agendar Data & Hora
                </button>
              </div>
            </div>

            {!isPublishNow && (
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] text-muted-foreground">
                  Data e Horário de Início
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-9 text-xs bg-background"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-muted">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs h-9 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:opacity-90 transition-all font-semibold shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando Programação...
                </>
              ) : isPublishNow ? (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {mode === "STORY_SEQUENCE"
                    ? `Publicar Sequência Agora (${sequenceContentIds.length})`
                    : "Publicar Imediatamente"}
                </>
              ) : (
                <>
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  {mode === "STORY_SEQUENCE"
                    ? `Agendar Sequência (${sequenceContentIds.length} Stories)`
                    : "Confirmar Agendamento"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
