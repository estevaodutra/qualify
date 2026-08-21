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
  QuickReplyContentPayload
} from "@/types/quickReplyTypes";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Image as ImageIcon, Video, Mic, Radio, FileText, Link2,
  Upload, Loader2, ArrowLeft, CheckCircle2, Sparkles, File, Play
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

  const [isUploading, setIsUploading] = useState(false);

  // Reset or populate fields when modal opens/changes
  useEffect(() => {
    if (replyToEdit) {
      setStep(2);
      setName(replyToEdit.name || "");
      setShortcut(replyToEdit.shortcut || "");
      setGroupId(replyToEdit.group_id || null);
      setContentType(replyToEdit.content_type);

      const content = replyToEdit.content_json?.content as any;
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

  const constructPayload = (): QuickReplyContentPayload => {
    switch (contentType) {
      case "text":
        return { contentType: "text", content: { text: textBody } };
      case "image":
        return { contentType: "image", content: { mediaUrl, storagePath, caption } };
      case "video":
        return { contentType: "video", content: { mediaUrl, storagePath, caption } };
      case "audio":
        return { contentType: "audio", content: { mediaUrl, storagePath, asVoice } };
      case "video_note":
        return { contentType: "video_note", content: { mediaUrl, storagePath } };
      case "document":
        return { contentType: "document", content: { mediaUrl, storagePath, fileName: fileName || "Documento", mimeType, caption } };
      case "link":
        return { contentType: "link", content: { url: linkUrl, text: linkText } };
      default:
        return { contentType: "text", content: { text: textBody } };
    }
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
                {step === 1 ? "Selecione o formato de conteúdo reutilizável" : "Preencha os detalhes e variáveis do seu conteúdo"}
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
                          {g.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TYPE-SPECIFIC EDITORS */}
            {/* 1. TEXT */}
            {contentType === "text" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Mensagem de Texto</Label>
                  <span className="text-[10px] text-muted-foreground">Suporta variáveis como {'{{lead.name}}'}</span>
                </div>
                <Textarea
                  placeholder="Olá {{lead.name}}, tudo bem? Segue a informação..."
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  className="min-h-[120px] text-xs rounded-xl leading-relaxed"
                  required
                />
              </div>
            )}

            {/* 2. MEDIA UPLOAD (IMAGE, VIDEO, AUDIO, VIDEO_NOTE, DOCUMENT) */}
            {["image", "video", "audio", "video_note", "document"].includes(contentType) && (
              <div className="space-y-3 bg-card p-3 rounded-2xl border border-border/50">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Arquivo de Mídia</Label>

                  {mediaUrl ? (
                    <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          {contentType === "image" && <ImageIcon className="h-4 w-4" />}
                          {contentType === "video" && <Video className="h-4 w-4" />}
                          {contentType === "audio" && <Mic className="h-4 w-4" />}
                          {contentType === "video_note" && <Radio className="h-4 w-4" />}
                          {contentType === "document" && <FileText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{fileName || "Mídia anexa"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{mediaUrl}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMediaUrl("");
                          setStoragePath("");
                        }}
                        className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 text-xs rounded-xl h-10 border-dashed border-primary/30 hover:border-primary"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 text-primary mr-2" />
                        )}
                        Fazer Upload de Arquivo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept={
                          contentType === "image"
                            ? "image/*"
                            : contentType === "video" || contentType === "video_note"
                            ? "video/*"
                            : contentType === "audio"
                            ? "audio/*"
                            : "*/*"
                        }
                      />
                    </div>
                  )}

                  {/* URL alternative input */}
                  {!mediaUrl && (
                    <div className="pt-1">
                      <Input
                        placeholder="Ou cole a URL direta do arquivo..."
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="text-xs rounded-xl h-8"
                      />
                    </div>
                  )}
                </div>

                {/* Specifics per type */}
                {/* Audio voice toggle */}
                {contentType === "audio" && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <div>
                      <Label className="text-xs font-semibold">Mensagem de Voz (PTT)</Label>
                      <p className="text-[10px] text-muted-foreground">Enviar como áudio gravado na hora pelo microfone</p>
                    </div>
                    <Switch checked={asVoice} onCheckedChange={setAsVoice} />
                  </div>
                )}

                {/* Document File Name */}
                {contentType === "document" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nome do Arquivo</Label>
                    <Input
                      placeholder="Ex: Proposta.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="text-xs rounded-xl h-9"
                    />
                  </div>
                )}

                {/* Caption for image, video, document */}
                {["image", "video", "document"].includes(contentType) && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">Legenda Opcional</Label>
                      <span className="text-[10px] text-muted-foreground">Suporta variáveis</span>
                    </div>
                    <Textarea
                      placeholder="Legenda que acompanha o arquivo..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="min-h-[70px] text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. LINK */}
            {contentType === "link" && (
              <div className="space-y-3 bg-card p-3 rounded-2xl border border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">URL do Link</Label>
                  <Input
                    placeholder="https://... ou {{deal.checkout_url}}"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="text-xs rounded-xl h-9 font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Suporta URLs dinâmicas como {'{{deal.checkout_url}}'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Texto do Acompanhamento (Opcional)</Label>
                  <Input
                    placeholder="Ex: Acesse seu link de pagamento:"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="text-xs rounded-xl h-9"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !shortcut.trim()}
                className="rounded-xl text-xs font-bold"
              >
                {replyToEdit ? "Salvar Resposta" : "Criar Resposta Rápida"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
