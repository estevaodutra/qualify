import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Lock, MessageSquare, Paperclip, Smile, Loader2, Sparkles, X, File, Image as ImageIcon, Video, Mic, Play, Pause, Trash2, Square, GitBranch, Zap, Radio, Link2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChatTemplate } from "@/hooks/useChat";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { QuickReply, QuickReplyContentType } from "@/types/quickReplyTypes";
import { resolveVariables } from "@/utils/variableResolver";
import QuickRepliesPanelPopover from "./quick-replies/QuickRepliesPanelPopover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatComposerProps {
  onSend: (text: string, isInternal: boolean, mediaUrl?: string, mediaType?: string) => Promise<any>;
  isSending: boolean;
  templates: ChatTemplate[];
  leadId?: string;
}

type DropdownItem =
  | { type: 'quick_reply'; id: string; shortcut: string; title: string; body: string; data: QuickReply }
  | { type: 'template'; id: string; shortcut: string; title: string; body: string; data: ChatTemplate }
  | { type: 'workflow'; id: string; shortcut: string; title: string; body: string; data: any };

export default function ChatComposer({ onSend, isSending, templates, leadId }: ChatComposerProps) {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  // Quick Replies Hook
  const { quickReplies, incrementUsage } = useQuickReplies();
  const [pendingQuickReplyId, setPendingQuickReplyId] = useState<string | null>(null);

  // Fetch lead data for context resolution
  const { data: leadData } = useQuery({
    queryKey: ["lead-details-context", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data } = await supabase
        .from("leads")
        .select("id, name, phone, email, custom_fields")
        .eq("id", leadId)
        .maybeSingle();
      return data;
    },
    enabled: !!leadId,
  });

  // Quick Replies & Workflows (Slash Commands)
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredItems, setFilteredItems] = useState<DropdownItem[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ url: string; type: string; name: string } | null>(null);

  // Audio Recording State
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'recorded'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isVideoNote, setIsVideoNote] = useState(false);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Audio Recording Handlers
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecordingState('recorded');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const togglePlayback = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize text area automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  // Fetch active workflows
  const { data: workflows = [] } = useQuery({
    queryKey: ["chat-composer-workflows", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("message_sequences")
        .select("id, name, description")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });

  // Apply a Quick Reply (structured multimedia content) into the composer
  const applyQuickReply = (reply: QuickReply) => {
    const context = {
      lead: leadData || null,
      operator: user ? { name: user.email, full_name: user.email } : null,
    };

    const payload = reply.content_json?.content as any;
    setPendingQuickReplyId(reply.id);

    if (!payload) return;

    switch (reply.content_type) {
      case "text": {
        const resolvedText = resolveVariables(payload.text || "", context);
        const replaced = text.replace(/\/([\w\-]*)$/, resolvedText);
        setText(replaced !== text ? replaced : (text ? `${text}\n${resolvedText}` : resolvedText));
        break;
      }
      case "image": {
        const resolvedCaption = resolveVariables(payload.caption || "", context);
        const resolvedUrl = resolveVariables(payload.mediaUrl || "", context);
        setAttachedFile({ url: resolvedUrl, type: "image", name: reply.name });
        setText(resolvedCaption);
        break;
      }
      case "video": {
        const resolvedCaption = resolveVariables(payload.caption || "", context);
        const resolvedUrl = resolveVariables(payload.mediaUrl || "", context);
        setAttachedFile({ url: resolvedUrl, type: "video", name: reply.name });
        setIsVideoNote(false);
        setText(resolvedCaption);
        break;
      }
      case "audio": {
        const resolvedUrl = resolveVariables(payload.mediaUrl || "", context);
        setAttachedFile({ url: resolvedUrl, type: "audio", name: reply.name });
        break;
      }
      case "video_note": {
        const resolvedUrl = resolveVariables(payload.mediaUrl || "", context);
        setAttachedFile({ url: resolvedUrl, type: "video", name: reply.name });
        setIsVideoNote(true);
        break;
      }
      case "document": {
        const resolvedUrl = resolveVariables(payload.mediaUrl || "", context);
        const resolvedFileName = resolveVariables(payload.fileName || "Documento", context);
        const resolvedCaption = resolveVariables(payload.caption || "", context);
        setAttachedFile({ url: resolvedUrl, type: "document", name: resolvedFileName });
        if (resolvedCaption) setText(resolvedCaption);
        break;
      }
      case "link": {
        const resolvedUrl = resolveVariables(payload.url || "", context);
        const resolvedText = resolveVariables(payload.text || "", context);
        const fullText = resolvedText ? `${resolvedText}\n${resolvedUrl}` : resolvedUrl;
        const replaced = text.replace(/\/([\w\-]*)$/, fullText);
        setText(replaced !== text ? replaced : (text ? `${text}\n${fullText}` : fullText));
        break;
      }
    }

    setShowDropdown(false);
    textareaRef.current?.focus();
  };

  // Handle template selection trigger via "/"
  const handleTextChange = (val: string) => {
    setText(val);

    const match = val.match(/\/([\w\-]*)$/);
    if (match && !isInternal) {
      const query = match[1].toLowerCase();
      setTemplateSearch(query);

      // Match multimedia Quick Replies
      const matchedQuickReplies = quickReplies
        .filter(r => r.active && (r.shortcut.toLowerCase().includes(query) || r.name.toLowerCase().includes(query)))
        .map(r => {
          const payload = r.content_json?.content as any;
          let bodyPreview = "";
          if (r.content_type === "text") bodyPreview = payload?.text || "";
          else bodyPreview = payload?.caption || payload?.fileName || `[${r.content_type.toUpperCase()}]`;

          return {
            type: "quick_reply" as const,
            id: r.id,
            shortcut: r.shortcut,
            title: r.name,
            body: bodyPreview,
            data: r,
          };
        });

      // Match legacy templates
      const matchedTemplates = templates
        .filter(
          (t) => t.shortcut.toLowerCase().includes(query) || t.title.toLowerCase().includes(query)
        )
        .map((t) => ({
          type: "template" as const,
          id: t.id,
          shortcut: t.shortcut,
          title: t.title,
          body: t.body,
          data: t
        }));

      // Match Workflows
      const matchedWorkflows = workflows
        .filter(
          (w) => w.name.toLowerCase().includes(query) || (w.description && w.description.toLowerCase().includes(query))
        )
        .map((w) => ({
          type: "workflow" as const,
          id: w.id,
          shortcut: `workflow:${w.name.toLowerCase().replace(/\s+/g, "-")}`,
          title: w.name,
          body: w.description || "Disparar este workflow para o lead atual",
          data: w
        }));

      const combined: DropdownItem[] = [...matchedQuickReplies, ...matchedTemplates, ...matchedWorkflows];
      setFilteredItems(combined);
      setShowDropdown(combined.length > 0);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  };

  const selectTemplate = (template: ChatTemplate) => {
    const replaced = text.replace(/\/([\w\-]*)$/, template.body);
    setText(replaced);
    setShowDropdown(false);
    textareaRef.current?.focus();
  };

  const selectWorkflow = async (workflow: any) => {
    if (!leadId) {
      toast.error("Nenhum lead selecionado para disparar o workflow.");
      return;
    }

    const replaced = text.replace(/\/([\w\-]*)$/, "");
    setText(replaced);
    setShowDropdown(false);

    const toastId = toast.loading(`Disparando workflow "${workflow.name}"...`);
    try {
      const { data, error } = await supabase.functions.invoke("start-workflow-for-leads", {
        body: { workflowId: workflow.id, leadIds: [leadId] },
      });
      if (error) throw error;
      toast.success(data?.message || `Workflow "${workflow.name}" disparado com sucesso!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao disparar workflow: ${err.message || err}`, { id: toastId });
    }
    textareaRef.current?.focus();
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat/${activeCompanyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      let type = "document";
      const ext = file.name.split('.').pop()?.toLowerCase() || "";
      if (file.type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = "image";
      else if (file.type.startsWith("video/") || ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) type = "video";
      else if (file.type.startsWith("audio/") || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = "audio";

      setAttachedFile({
        url: publicUrl,
        type,
        name: file.name
      });

      toast.success("Arquivo anexado com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !attachedFile && !audioBlob) return;

    try {
      let mediaUrl = attachedFile?.url;
      let mediaType = attachedFile?.type;

      if (mediaType === 'video' && isVideoNote) {
        mediaType = 'ptv';
      }

      if (audioBlob) {
        setIsUploading(true);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const filePath = `chat/${activeCompanyId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, audioBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
        mediaType = 'audio';
      }

      await onSend(text, isInternal, mediaUrl, mediaType);

      // Increment usage metrics if this send originated from a quick reply
      if (pendingQuickReplyId) {
        incrementUsage(pendingQuickReplyId).catch(console.error);
        setPendingQuickReplyId(null);
      }

      // reset states
      setText("");
      setAttachedFile(null);
      setIsVideoNote(false);
      setAudioBlob(null);
      setRecordingState('idle');
      setRecordingTime(0);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && filteredItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected.type === "quick_reply") {
          applyQuickReply(selected.data);
        } else if (selected.type === "template") {
          selectTemplate(selected.data);
        } else {
          selectWorkflow(selected.data);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (type: string) => {
    switch(type) {
      case "image": return <ImageIcon className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "audio": return <Mic className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 border-t border-border/40 bg-card/10 space-y-3 shrink-0 relative flex flex-col">
      {/* Templates & Workflows Dropdown Popover */}
      {showDropdown && filteredItems.length > 0 && (
        <div className="absolute bottom-full left-4 mb-3 w-80 max-h-64 bg-popover/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-y-auto z-50 divide-y divide-border/40 animate-in slide-in-from-bottom-3 fade-in duration-200">
          <div className="sticky top-0 bg-popover/80 backdrop-blur-sm p-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b border-border/40 z-10">
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Comandos Rápidos</span>
            <span className="bg-muted px-1.5 py-0.5 rounded text-[8px]">Use ↑↓ para navegar</span>
          </div>
          {filteredItems.map((item, i) => (
            <div
              key={item.type + "-" + item.id}
              onClick={() => {
                if (item.type === "quick_reply") applyQuickReply(item.data);
                else if (item.type === "template") selectTemplate(item.data);
                else selectWorkflow(item.data);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                "p-3 cursor-pointer text-xs transition-all duration-200 flex items-start gap-3 border-l-2",
                selectedIndex === i
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-primary/5 border-transparent"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl shrink-0 mt-0.5",
                item.type === "quick_reply"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : item.type === "template"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-indigo-500/10 text-indigo-500"
              )}>
                {item.type === "quick_reply" ? (
                  <Zap className="h-4 w-4" />
                ) : item.type === "template" ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="font-bold text-foreground truncate">
                    {item.type === "quick_reply" ? `/${item.shortcut}` : item.type === "template" ? `/${item.shortcut}` : item.title}
                  </span>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border",
                    item.type === "quick_reply"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                      : item.type === "template"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                      : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400"
                  )}>
                    {item.type === "quick_reply" ? "Resposta Rápida" : item.type === "template" ? "Template" : "Workflow"}
                  </span>
                </div>
                <p className="text-muted-foreground/80 line-clamp-2 leading-relaxed text-[11px]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mode Selectors & Quick Replies Button */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 bg-background/50 p-1 rounded-xl border border-border/40 shadow-sm">
            <button
              onClick={() => setIsInternal(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                !isInternal
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Cliente
            </button>

            <button
              onClick={() => setIsInternal(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                isInternal
                  ? "bg-yellow-500 text-white shadow-sm shadow-yellow-500/20"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              Nota Interna
            </button>
          </div>

          {/* Quick Replies Fast Selection Panel (⚡) */}
          <QuickRepliesPanelPopover
            onSelectReply={applyQuickReply}
            disabled={isSending || isUploading}
          />
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Attachment Preview Area */}
      {attachedFile && (
        <div className="flex flex-col gap-2 p-2 bg-primary/5 border border-primary/20 rounded-xl max-w-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              {getFileIcon(attachedFile.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{attachedFile.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{attachedFile.type}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setAttachedFile(null); setIsVideoNote(false); }} className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {attachedFile.type === 'video' && (
            <div className="flex items-center gap-2 pl-1 pt-1 border-t border-primary/10 mt-1">
              <Switch id="video-note-toggle" checked={isVideoNote} onCheckedChange={setIsVideoNote} />
              <Label htmlFor="video-note-toggle" className="text-xs font-medium cursor-pointer text-muted-foreground">
                Enviar como Vídeo Recado (PTV)
              </Label>
            </div>
          )}
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border/40 rounded-xl max-w-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Enviando arquivo...</span>
        </div>
      )}

      {/* Textarea Composer & Actions */}
      <div className={cn(
        "flex items-end gap-2 bg-background border rounded-2xl p-2 shadow-sm transition-colors duration-300 focus-within:border-primary/40 focus-within:shadow-md",
        isInternal ? "border-yellow-500/30 focus-within:border-yellow-500/50 bg-yellow-500/[0.02]" : "border-border/60"
      )}>
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={isUploading || recordingState !== 'idle'}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 mb-0.5 rounded-xl cursor-pointer"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </Button>

        <div className="flex-1 relative flex items-center min-h-[40px]">
          {recordingState === 'idle' ? (
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isInternal
                  ? "Adicionar nota privada ao lead..."
                  : "Digite uma mensagem ou '/' para respostas rápidas..."
              }
              className={cn(
                "w-full bg-transparent px-2 py-2.5 text-sm outline-none resize-none transition-all duration-300 min-h-[40px] max-h-[160px] scrollbar-thin scrollbar-track-transparent leading-relaxed",
                isInternal && "placeholder:text-yellow-600/40 text-yellow-700 dark:text-yellow-400"
              )}
            />
          ) : recordingState === 'recording' || recordingState === 'paused' ? (
            <div className="flex-1 flex items-center justify-between bg-primary/5 rounded-full px-4 py-1.5 h-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className={cn("h-2.5 w-2.5 rounded-full bg-destructive transition-opacity duration-500", recordingState === 'paused' ? "opacity-50" : "animate-pulse")} />
                <span className="text-sm font-medium text-foreground min-w-[45px] tabular-nums">{formatTime(recordingTime)}</span>
              </div>

              {/* Fake Waveform */}
              <div className="flex items-center gap-1 flex-1 mx-4 justify-center">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 bg-primary/40 rounded-full transition-all duration-150",
                      recordingState === 'recording' ? "animate-pulse" : "h-1 opacity-50"
                    )}
                    style={{
                      height: recordingState === 'recording' ? `${Math.random() * 16 + 4}px` : '4px',
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                {recordingState === 'recording' ? (
                  <Button variant="ghost" size="icon" onClick={pauseRecording} className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary rounded-full">
                    <Pause className="h-4 w-4" fill="currentColor" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={resumeRecording} className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary rounded-full">
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={stopRecording} className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary rounded-full">
                  <Square className="h-4 w-4" fill="currentColor" />
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelRecording} className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between bg-secondary/30 border border-border/50 rounded-full px-4 py-1 h-10 animate-in fade-in zoom-in-95 duration-200">
               <Button variant="ghost" size="icon" onClick={cancelRecording} className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full mr-2">
                  <Trash2 className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" onClick={togglePlayback} className="h-8 w-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-sm">
                  {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
               </Button>

               {/* Static Waveform */}
               <div className="flex items-center gap-1 flex-1 mx-4">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary/40 rounded-full h-3"
                      style={{
                        height: `${Math.random() * 12 + 4}px`
                      }}
                    />
                  ))}
               </div>

               <span className="text-xs font-medium text-muted-foreground tabular-nums mr-2">{formatTime(recordingTime)}</span>
               <span className="text-[10px] font-bold bg-background px-1.5 py-0.5 rounded text-muted-foreground">1x</span>

               {audioUrl && (
                 <audio
                   ref={audioPlayerRef}
                   src={audioUrl}
                   onEnded={() => setIsPlaying(false)}
                   className="hidden"
                 />
               )}
            </div>
          )}
        </div>

        {recordingState === 'idle' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={startRecording}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 mb-0.5 rounded-xl cursor-pointer"
          >
            <Mic className="h-4.5 w-4.5" />
          </Button>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isSending || isUploading || (!text.trim() && !attachedFile && !audioBlob) || recordingState === 'recording' || recordingState === 'paused'}
          className={cn(
            "h-10 w-10 rounded-xl shrink-0 shadow-lg cursor-pointer transition-all duration-300",
            isInternal
              ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20"
              : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20",
            (!text.trim() && !attachedFile && !audioBlob) && "opacity-50 scale-95 shadow-none"
          )}
        >
          {isSending ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <Send className="h-4.5 w-4.5 translate-x-[-1px] translate-y-[1px]" />
          )}
        </Button>
      </div>
    </div>
  );
}
