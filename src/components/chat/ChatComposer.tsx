import { useState, useRef, useEffect } from "react";
import { Send, Lock, MessageSquare, Paperclip, Smile, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatTemplate } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSend: (text: string, isInternal: boolean, mediaUrl?: string, mediaType?: string) => Promise<any>;
  isSending: boolean;
  templates: ChatTemplate[];
}

export default function ChatComposer({ onSend, isSending, templates }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState<ChatTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | "document">("image");
  const [showMediaInput, setShowMediaInput] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resize text area automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  // Handle template selection trigger via "/"
  const handleTextChange = (val: string) => {
    setText(val);
    
    // Check if user typed / followed by keyword
    const match = val.match(/\/(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      setTemplateSearch(query);
      const filtered = templates.filter(
        (t) => t.shortcut.toLowerCase().includes(query) || t.title.toLowerCase().includes(query)
      );
      setFilteredTemplates(filtered);
      setShowTemplates(filtered.length > 0);
    } else {
      setShowTemplates(false);
    }
  };

  const selectTemplate = (template: ChatTemplate) => {
    // Replace slash and shortcut with actual template content
    const replaced = text.replace(/\/(\w*)$/, template.body);
    setText(replaced);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!text.trim() && !mediaUrl.trim()) return;

    try {
      await onSend(text, isInternal, mediaUrl ? mediaUrl : undefined, mediaUrl ? mediaType : undefined);
      setText("");
      setMediaUrl("");
      setShowMediaInput(false);
    } catch (error) {
      // Handled by query mutation onError
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border/40 bg-card/5 space-y-3 shrink-0 relative">
      {/* Templates Dropdown Popover */}
      {showTemplates && (
        <div className="absolute bottom-full left-4 mb-2 w-72 max-h-56 bg-popover border border-border/80 rounded-xl shadow-2xl overflow-y-auto z-50 divide-y divide-border/40 animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-2 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            Respostas Rápidas
          </div>
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              onClick={() => selectTemplate(t)}
              className="p-2.5 hover:bg-primary/5 cursor-pointer text-xs transition-colors flex flex-col gap-0.5"
            >
              <div className="flex justify-between items-center font-bold">
                <span className="text-foreground">/{t.shortcut}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{t.title}</span>
              </div>
              <p className="text-muted-foreground truncate">{t.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mode Selectors Tabs */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {/* Public response Mode tab */}
          <button
            onClick={() => setIsInternal(false)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border cursor-pointer",
              !isInternal
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Enviar Mensagem
          </button>

          {/* Internal Team note Mode tab */}
          <button
            onClick={() => setIsInternal(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border cursor-pointer",
              isInternal
                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            Nota Interna
          </button>
        </div>

        {/* Media Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMediaInput(!showMediaInput)}
          className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Paperclip className="h-4 w-4 mr-1" />
          Anexar Mídia
        </Button>
      </div>

      {/* Media URL Input Area */}
      {showMediaInput && (
        <div className="flex gap-2 p-2.5 bg-muted/40 border border-border/30 rounded-xl items-center animate-in slide-in-from-top-2 duration-200">
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as any)}
            className="bg-background border border-border/40 rounded px-1.5 py-1 text-xs outline-none focus:border-primary"
          >
            <option value="image">Imagem</option>
            <option value="audio">Áudio</option>
            <option value="video">Vídeo</option>
            <option value="document">Documento</option>
          </select>
          <Input
            placeholder="URL direta da mídia..."
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="flex-1 h-8 text-xs bg-background/50"
          />
          <Button variant="ghost" size="icon" onClick={() => { setMediaUrl(""); setShowMediaInput(false); }} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Textarea Composer & Send Action */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInternal
                ? "Adicionar nota privada ao lead... (apenas visível para operadores)"
                : "Digite uma mensagem ou digite '/' para respostas rápidas..."
            }
            className={cn(
              "w-full bg-background/60 hover:bg-background/80 focus:bg-background border border-primary/5 focus:border-primary/20 rounded-xl px-4.5 py-3 text-xs outline-none resize-none transition-all duration-300 min-h-[44px] max-h-[160px] scrollbar-thin scrollbar-track-transparent pr-10 leading-relaxed shadow-inner",
              isInternal && "focus:border-yellow-500/40"
            )}
          />
          <button className="absolute right-3.5 bottom-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <Smile className="h-5 w-5" />
          </button>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && !mediaUrl.trim())}
          className={cn(
            "h-11 w-11 rounded-xl shrink-0 shadow-lg cursor-pointer",
            isInternal
              ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/10"
              : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/10"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
