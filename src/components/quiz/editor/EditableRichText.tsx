// src/components/quiz/editor/EditableRichText.tsx
import React, { useEffect } from "react";
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
        className="prose prose-slate max-w-none focus:outline-none min-h-[32px] cursor-text p-1 border border-transparent rounded hover:border-indigo-200 focus-within:border-indigo-500 transition-colors"
      />
    </div>
  );
};
