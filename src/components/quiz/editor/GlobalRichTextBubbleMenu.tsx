// src/components/quiz/editor/GlobalRichTextBubbleMenu.tsx
import React, { useState } from "react";
import { Editor, BubbleMenu } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  Unlink,
  Check,
  X
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TEXT_COLOR_PRESETS, HIGHLIGHT_COLOR_PRESETS } from "@/utils/quiz/quizTextSanitizer";

interface GlobalRichTextBubbleMenuProps {
  editor: Editor | null;
  preset?: "full" | "short" | "button";
}

export const GlobalRichTextBubbleMenu: React.FC<GlobalRichTextBubbleMenuProps> = ({
  editor,
  preset = "full",
}) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  if (!editor) return null;

  const currentBlockStyle = editor.isActive("heading", { level: 1 })
    ? "heading_1"
    : editor.isActive("heading", { level: 2 })
    ? "heading_2"
    : editor.isActive("heading", { level: 3 })
    ? "heading_3"
    : "paragraph";

  const handleBlockStyleChange = (val: string) => {
    if (val === "heading_1") editor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (val === "heading_2") editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (val === "heading_3") editor.chain().focus().toggleHeading({ level: 3 }).run();
    else editor.chain().focus().setParagraph().run();
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      let formatted = linkUrl.trim();
      if (!/^https?:\/\//i.test(formatted) && !/^mailto:/i.test(formatted) && !/^tel:/i.test(formatted)) {
        formatted = `https://${formatted}`;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: formatted, target: "_blank" }).run();
    }
    setIsLinkOpen(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
    setLinkUrl("");
    setIsLinkOpen(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150, placement: "top", maxWidth: "none" }}
      className="z-50 bg-card border border-border rounded-lg shadow-xl p-1.5 flex flex-col gap-1.5 select-none animate-in fade-in zoom-in-95 duration-150 max-w-[95vw]"
    >
      {/* Line 1: Block Style & Size Selectors */}
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-1">
        {preset === "full" && (
          <select
            value={currentBlockStyle}
            onChange={(e) => handleBlockStyleChange(e.target.value)}
            className="h-7 px-2 text-xs font-medium bg-secondary border border-border rounded focus:outline-none"
          >
            <option value="paragraph">Normal</option>
            <option value="heading_1">Título 1 (H1)</option>
            <option value="heading_2">Título 2 (H2)</option>
            <option value="heading_3">Título 3 (H3)</option>
          </select>
        )}
      </div>

      {/* Line 2: Inline Formatting Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive("bold") ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive("italic") ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive("underline") ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive("strike") ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        {/* Link Popover */}
        <Popover open={isLinkOpen} onOpenChange={setIsLinkOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => {
                const attrs = editor.getAttributes("link");
                setLinkUrl(attrs.href || "");
              }}
              className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
                editor.isActive("link") ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
              }`}
              title="Inserir / Editar Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 space-y-2 text-xs" side="top">
            <p className="font-semibold text-xs">Inserir URL do Link</p>
            <div className="flex items-center gap-1.5">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemplo.com"
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleApplyLink()}
              />
              <Button size="icon" className="h-8 w-8" onClick={handleApplyLink} title="Aplicar">
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
            {editor.isActive("link") && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-7 text-[11px] gap-1.5"
                onClick={handleRemoveLink}
              >
                <Unlink className="w-3 h-3" /> Remover Link
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Bullet List */}
        {preset === "full" && (
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
              editor.isActive("bulletList") ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
            }`}
            title="Lista com Marcadores"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-[1px] h-4 bg-border mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive({ textAlign: "left" }) ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Alinhar à Esquerda"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive({ textAlign: "center" }) ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Centralizar"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`p-1.5 rounded hover:bg-muted text-xs transition-colors ${
            editor.isActive({ textAlign: "right" }) ? "bg-indigo-100 text-indigo-700 font-bold" : "text-muted-foreground"
          }`}
          title="Alinhar à Direita"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        {/* Text Color Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-indigo-600 transition-colors relative"
              title="Cor do Texto"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 text-xs space-y-2" side="top">
            <p className="font-semibold text-[11px] text-muted-foreground mb-1">Cor do Texto</p>
            <div className="grid grid-cols-6 gap-1">
              {TEXT_COLOR_PRESETS.map((colorItem) => (
                <button
                  key={colorItem.label}
                  type="button"
                  onClick={() => {
                    if (colorItem.value) editor.chain().focus().setColor(colorItem.value).run();
                    else editor.chain().focus().unsetColor().run();
                  }}
                  title={colorItem.label}
                  className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: colorItem.value || "transparent" }}
                >
                  {!colorItem.value && <X className="w-3 h-3 text-red-500" />}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px]"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Remover Cor
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight Color Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-indigo-600 transition-colors"
              title="Fundo / Realce da Letra"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 text-xs space-y-2" side="top">
            <p className="font-semibold text-[11px] text-muted-foreground mb-1">Realce do Texto</p>
            <div className="grid grid-cols-5 gap-1.5">
              {HIGHLIGHT_COLOR_PRESETS.map((hl) => (
                <button
                  key={hl.label}
                  type="button"
                  onClick={() => {
                    if (hl.value) editor.chain().focus().toggleHighlight({ color: hl.value }).run();
                    else editor.chain().focus().unsetHighlight().run();
                  }}
                  title={hl.label}
                  className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: hl.value || "transparent" }}
                >
                  {!hl.value && <X className="w-3 h-3 text-red-500" />}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px]"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              Remover Fundo
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </BubbleMenu>
  );
};
