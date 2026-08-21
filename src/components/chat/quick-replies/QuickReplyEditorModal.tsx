import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  QuickReply,
  QuickReplyGroup,
  QuickReplyContentType,
  QuickReplyContentPayload,
  QuickReplyAction
} from "@/types/quickReplyTypes";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Image as ImageIcon, Video, Mic, Radio, FileText, Link2,
  Upload, Loader2, ArrowLeft, CheckCircle2, Sparkles, File, Play, Zap, Plus, Trash2, Tag, GitBranch, Send
} from "lucide-react";

interface QuickReplyEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyToEdit?: QuickReply | null;
  groups: QuickReplyGroup[];
  onSave: (data: {
    group_id?: string | null;
    name: string;
    shortcut: string;
    content_type: QuickReplyContentType;
    content_json: QuickReplyContentPayload;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const CONTENT_TYPES: Array<{
  type: QuickReplyContentType;
  label: string;
  description: string;
  icon: any;
  color: string;
}> = [
  { type: "text", label: "Texto", description: "Mensagem comum em texto com variáveis", icon: MessageSquare, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { type: "image", label: "Imagem", description: "Foto ou imagem com legenda opcional", icon: ImageIcon, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { type: "video", label: "Vídeo", description: "Vídeo comum com legenda opcional", icon: Video, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { type: "audio", label: "Áudio", description: "Áudio ou mensagem de voz gravações", icon: Mic, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { type: "video_note", label: "Vídeo Recado", description: "Vídeo redondo (PTV / Video Note)", icon: Radio, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { type: "document", label: "Documento", description: "Arquivo PDF, planilha ou documento", icon: FileText, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
  { type: "link", label: "Link / URL", description: "Link direto com texto personalizável", icon: Link2, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
];

const LOCAL_TAGS_KEY = (companyId: string) => `qualify_tags_${companyId}`;

function getLocalTags(companyId: string): { id: string; name: string; color: string }[] {
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function QuickReplyEditorModal({
  open,
  onOpenChange,
  replyToEdit,
  groups,
  onSave,
  isSubmitting = false,
}: QuickReplyEditorModalProps) {
  const { activeCompanyId } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard step: 1 = choose type, 2 = configure payload
  const [step, setStep] = useState<1 | 2>(1);

  // Common Fields
  const [name, setName] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<QuickReplyContentType>("text");

  // Payload Specific State
  const [textBody, setTextBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [caption, setCaption] = useState("");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [asVoice, setAsVoice] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Automation & Trigger State
  const [autoSend, setAutoSend] = useState(false);
  const [actions, setActions] = useState<QuickReplyAction[]>([]);

  const [isUploading, setIsUploading] = useState(false);

  // Fetch Pipelines & Stages for move_deal actions
  const { data: pipelines = [] } = useQuery({
    queryKey: ["quick-reply-editor-pipelines", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase
        .from("pipelines")
        .select("id, name, stages:pipeline_stages(id, name, order_index, color)")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!activeCompanyId && open,
  });

  // Fetch System Tags for add_tag actions
  const { data: systemTags = [] } = useQuery({
    queryKey: ["quick-reply-editor-tags", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let dbTags: { id: string; name: string; color: string }[] = [];
      try {
        const { data } = await supabase
          .from("tags")
          .select("id, name, color")
          .eq("company_id", activeCompanyId)
          .order("name", { ascending: true });
        if (data) dbTags = data;
      } catch {}

      const local = getLocalTags(activeCompanyId);
      const map = new Map<string, { id: string; name: string; color: string }>();
      dbTags.forEach((t) => map.set(t.name.toLowerCase(), t));
      local.forEach((t) => { if (!map.has(t.name.toLowerCase())) map.set(t.name.toLowerCase(), t); });
      return Array.from(map.values());
    },
    enabled: !!activeCompanyId && open,
  });

  // Reset or populate fields when modal opens/changes
  useEffect(() => {
    if (replyToEdit) {
      setStep(2);
      setName(replyToEdit.name || "");
      setShortcut(replyToEdit.shortcut || "");
      setGroupId(replyToEdit.group_id || null);
      setContentType(replyToEdit.content_type);

      const contentJson = replyToEdit.content_json as any;
      setAutoSend(contentJson?.auto_send ?? false);
      setActions(Array.isArray(contentJson?.actions) ? contentJson.actions : []);

      const content = contentJson?.content as any;
      if (content) {
        setTextBody(content.text || "");
        setMediaUrl(content.mediaUrl || "");
        setStoragePath(content.storagePath || "");
        setCaption(content.caption || "");
        setFileName(content.fileName || "");
        setMimeType(content.mimeType || "");
        setAsVoice(content.asVoice ?? true);
        setLinkUrl(content.url || "");
        setLinkText(content.text || "");
      }
    } else {
      setStep(1);
      setName("");
      setShortcut("");
      setGroupId(null);
      setContentType("text");
      setTextBody("");
      setMediaUrl("");
      setStoragePath("");
      setCaption("");
      setFileName("");
      setMimeType("");
      setAsVoice(true);
      setLinkUrl("");
      setLinkText("");
      setAutoSend(false);
      setActions([]);
    }
  }, [replyToEdit, open]);

  // Handle File Upload to Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCompanyId) return;

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || '';
      const path = `quick_replies/${activeCompanyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(path);

      setMediaUrl(publicUrl);
      setStoragePath(path);
      if (!fileName) setFileName(file.name);
      setMimeType(file.type);
      toast.success("Arquivo enviado com sucesso!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`Erro ao fazer upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Actions Handlers
  const handleAddAction = () => {
    // Default action: add_tag if systemTags available, or move_deal
    const defaultTag = systemTags.length > 0 ? systemTags[0].name : "Interessado";
    setActions((prev) => [...prev, { type: "add_tag", tagName: defaultTag }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAction = (index: number, updated: QuickReplyAction) => {
    setActions((prev) => prev.map((act, i) => (i === index ? updated : act)));
  };

  const constructPayload = (): QuickReplyContentPayload => {
    let rawPayload: any;
    switch (contentType) {
      case "text":
        rawPayload = { contentType: "text", content: { text: textBody } };
        break;
      case "image":
        rawPayload = { contentType: "image", content: { mediaUrl, storagePath, caption } };
        break;
      case "video":
        rawPayload = { contentType: "video", content: { mediaUrl, storagePath, caption } };
        break;
      case "audio":
        rawPayload = { contentType: "audio", content: { mediaUrl, storagePath, asVoice } };
        break;
      case "video_note":
        rawPayload = { contentType: "video_note", content: { mediaUrl, storagePath } };
        break;
      case "document":
        rawPayload = { contentType: "document", content: { mediaUrl, storagePath, fileName: fileName || "Documento", mimeType, caption } };
        break;
      case "link":
        rawPayload = { contentType: "link", content: { url: linkUrl, text: linkText } };
        break;
      default:
        rawPayload = { contentType: "text", content: { text: textBody } };
        break;
    }

    return {
      ...rawPayload,
      auto_send: autoSend,
      actions: actions.length > 0 ? actions : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, preencha o nome da resposta.");
      return;
    }
    if (!shortcut.trim()) {
      toast.error("Por favor, preencha o atalho.");
      return;
    }

    // Validation for media contents
    if (["image", "video", "audio", "video_note", "document"].includes(contentType) && !mediaUrl) {
      toast.error("Por favor, selecione ou faça upload do arquivo de mídia.");
      return;
    }

    if (contentType === "link" && !linkUrl) {
      toast.error("Por favor, informe a URL do link.");
      return;
    }

    const payload = constructPayload();
    await onSave({
      group_id: groupId,
      name: name.trim(),
      shortcut: shortcut.trim(),
      content_type: contentType,
      content_json: payload,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 2 && !replyToEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep(1)}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-lg font-bold">
                {replyToEdit ? "Editar Resposta Rápida" : step === 1 ? "Nova Resposta — Escolha o Tipo" : "Configurar Resposta Rápida"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {step === 1 ? "Selecione o formato de conteúdo reutilizável" : "Preencha os detalhes e ações automatizadas"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: Select Type */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-3">
            {CONTENT_TYPES.map((t) => {
              const IconComp = t.icon;
              return (
                <div
                  key={t.type}
                  onClick={() => {
                    setContentType(t.type);
                    setStep(2);
                  }}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-2 hover:scale-[1.02] shadow-sm",
                    t.color
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className="h-5 w-5 shrink-0" />
                    <span className="font-bold text-sm text-foreground">{t.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-snug">
                    {t.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 2: Fill Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Common Top Bar: Name, Shortcut, Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome da Resposta</Label>
                <Input
                  placeholder="Ex: Abordagem Inicial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs rounded-xl h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Atalho</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Único por empresa</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">/</span>
                  <Input
                    placeholder="abordagem"
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value.replace(/\s+/g, "-"))}
                    className="pl-6 text-xs rounded-xl h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Grupo de Organização</Label>
                <Select
                  value={groupId || "none"}
                  onValueChange={(val) => setGroupId(val === "none" ? null : val)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Sem grupo" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="none" className="text-xs">
                      Sem grupo
                    </SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color || "#10B981" }} />
                          <span>{g.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content Field according to Content Type */}
            {contentType === "text" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold flex justify-between">
                  <span>Mensagem de Texto</span>
                  <span className="text-[10px] text-muted-foreground">Suporta variáveis como {`{{lead.name}}`}</span>
                </Label>
                <Textarea
                  placeholder="Digite o texto da resposta rápida..."
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  className="text-xs rounded-xl min-h-[100px]"
                />
              </div>
            )}

            {["image", "video", "audio", "video_note", "document"].includes(contentType) && (
              <div className="space-y-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
                <Label className="text-xs font-semibold">Arquivo de Mídia</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="URL direta ou selecione um arquivo..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="text-xs rounded-xl h-9 flex-1"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-9 text-xs rounded-xl gap-1.5 shrink-0"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </Button>
                </div>

                {contentType === "document" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nome do Arquivo</Label>
                    <Input
                      placeholder="Ex: Apresentação.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="text-xs rounded-xl h-9"
                    />
                  </div>
                )}

                {["image", "video", "document"].includes(contentType) && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Legenda (Opcional)</Label>
                    <Textarea
                      placeholder="Legenda anexada à mídia..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="text-xs rounded-xl h-16"
                    />
                  </div>
                )}

                {contentType === "audio" && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold">Enviar como Mensagem de Voz (Gravação)</span>
                    <Switch checked={asVoice} onCheckedChange={setAsVoice} />
                  </div>
                )}
              </div>
            )}

            {contentType === "link" && (
              <div className="space-y-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">URL do Link *</Label>
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="text-xs rounded-xl h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Texto Explicativo (Opcional)</Label>
                  <Textarea
                    placeholder="Descrição para acompanhar o link..."
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="text-xs rounded-xl h-16"
                  />
                </div>
              </div>
            )}

            {/* AUTO-SEND TRIGGER SWITCH */}
            <div className="flex items-center justify-between p-3 border border-border/40 rounded-2xl bg-primary/5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Send className="h-3.5 w-3.5 text-primary" />
                  <span>Enviar Diretamente ao Clicar</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Envia a resposta imediatamente e executa as ações sem precisar confirmar no composer.
                </p>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>

            {/* AUTOMATED ACTIONS BUILDER */}
            <div className="space-y-3 p-3.5 border border-primary/20 bg-primary/5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Zap className="h-4 w-4" />
                  <span>Ações Automatizadas ao Executar ({actions.length})</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddAction}
                  className="h-7 text-[11px] font-bold rounded-xl gap-1 border-primary/20 text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3.5 w-3.5" /> + Adicionar Ação
                </Button>
              </div>

              {actions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic text-center py-2">
                  Nenhuma ação configurada. Adicione ações para mover o negócio na pipeline ou adicionar tags automaticamente.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {actions.map((act, index) => (
                    <div key={index} className="p-3 border border-border/40 rounded-xl bg-card/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={act.type}
                          onValueChange={(val: any) => {
                            if (val === "add_tag") {
                              const defaultTag = systemTags.length > 0 ? systemTags[0].name : "Interessado";
                              handleUpdateAction(index, { type: "add_tag", tagName: defaultTag });
                            } else {
                              const defaultPipe = pipelines.length > 0 ? pipelines[0].id : "";
                              const defaultStage = pipelines.length > 0 && pipelines[0].stages?.length > 0 ? pipelines[0].stages[0].id : "";
                              handleUpdateAction(index, { type: "move_deal", pipelineId: defaultPipe, stageId: defaultStage });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg w-48 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[10000]">
                            <SelectItem value="add_tag" className="text-xs">
                              <div className="flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-purple-500" /> Adicionar Tag
                              </div>
                            </SelectItem>
                            <SelectItem value="move_deal" className="text-xs">
                              <div className="flex items-center gap-1.5">
                                <GitBranch className="h-3.5 w-3.5 text-emerald-500" /> Mover na Pipeline
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleRemoveAction(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Action Details */}
                      {act.type === "add_tag" ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tag a Adicionar</Label>
                          <Select
                            value={act.tagName}
                            onValueChange={(val) => handleUpdateAction(index, { ...act, tagName: val })}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg">
                              <SelectValue placeholder="Selecione uma tag" />
                            </SelectTrigger>
                            <SelectContent className="z-[10000]">
                              {systemTags.map((t) => (
                                <SelectItem key={t.id || t.name} value={t.name} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color || "#8A3CFF" }} />
                                    <span>{t.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pipeline</Label>
                            <Select
                              value={act.pipelineId}
                              onValueChange={(pVal) => {
                                const selectedPipe = pipelines.find((p) => p.id === pVal);
                                const firstStage = selectedPipe?.stages?.[0]?.id || "";
                                handleUpdateAction(index, { ...act, pipelineId: pVal, stageId: firstStage });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg">
                                <SelectValue placeholder="Selecione a pipeline" />
                              </SelectTrigger>
                              <SelectContent className="z-[10000]">
                                {pipelines.map((p) => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Coluna / Etapa</Label>
                            <Select
                              value={act.stageId}
                              onValueChange={(sVal) => handleUpdateAction(index, { ...act, stageId: sVal })}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg">
                                <SelectValue placeholder="Selecione a etapa" />
                              </SelectTrigger>
                              <SelectContent className="z-[10000]">
                                {(pipelines.find((p) => p.id === act.pipelineId)?.stages || [])
                                  .sort((a: any, b: any) => a.order_index - b.order_index)
                                  .map((s: any) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#3b82f6" }} />
                                        <span>{s.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs px-6"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Resposta"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
