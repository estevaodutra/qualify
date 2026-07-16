// src/components/quiz/editor/EditableRichText.tsx
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { GlobalRichTextBubbleMenu } from "./GlobalRichTextBubbleMenu";
import { RichTextRenderer } from "../renderer/RichTextRenderer";
import { sanitizeQuizHtml } from "@/utils/quiz/quizTextSanitizer";

interface EditableRichTextProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  editable?: boolean;
  preset?: "full" | "short" | "button";
  alignment?: "left" | "center" | "right";
  className?: string;
}

export const EditableRichText: React.FC<EditableRichTextProps> = ({
  value,
  onChange,
  placeholder = "Digite seu texto...",
  editable = true,
  preset = "full",
  alignment = "center",
  className,
}) => {
  const sanitized = sanitizeQuizHtml(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: false,
      }),
      TextStyle,
      Color,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: sanitized,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(sanitizeQuizHtml(value));
    }
  }, [value, editor]);

  if (!editable) {
    return <RichTextRenderer content={value} alignment={alignment} className={className} />;
  }

  return (
    <div className="relative w-full group/editor">
      <GlobalRichTextBubbleMenu editor={editor} preset={preset} />
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-slate max-w-none dark:prose-invert focus:outline-none min-h-[28px] cursor-text p-0.5 border border-transparent rounded hover:border-indigo-200 focus-within:border-indigo-500 transition-colors",
          "prose-h1:text-2xl prose-h1:font-bold prose-h1:my-0.5 prose-h1:leading-tight",
          "prose-h2:text-xl prose-h2:font-bold prose-h2:my-0.5 prose-h2:leading-tight",
          "prose-h3:text-lg prose-h3:font-semibold prose-h3:my-0.5 prose-h3:leading-snug",
          "prose-p:my-0.5 prose-p:leading-snug text-sm",
          "prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0",
          className
        )}
      />
    </div>
  );
};
