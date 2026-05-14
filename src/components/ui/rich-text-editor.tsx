import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Heading3 
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  variant?: 'default' | 'inline';
}

export function RichTextEditor({ value, onChange, placeholder = "Digite seu texto...", minHeight = "120px", variant = 'default' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: variant === 'inline' 
          ? 'prose prose-sm dark:prose-invert max-w-none focus:outline-none w-full' 
          : 'prose prose-sm dark:prose-invert max-w-none focus:outline-none w-full min-h-[120px] p-3 border rounded-md bg-background',
        style: variant === 'inline' ? '' : `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Evita atualização do cursor se o valor vir de fora mas for igual (ou quase)
      const isSame = editor.getHTML() === value;
      if (!isSame) {
        editor.commands.setContent(value, false);
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full">
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="flex flex-wrap items-center gap-1 p-1 rounded-md border bg-background shadow-md"
        >
          <div className="flex items-center gap-0.5">
            <Toggle
              size="sm"
              pressed={editor.isActive('heading', { level: 1 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className="h-8 w-8 px-0"
            >
              <Heading1 className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive('heading', { level: 2 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="h-8 w-8 px-0"
            >
              <Heading2 className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive('heading', { level: 3 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className="h-8 w-8 px-0"
            >
              <Heading3 className="h-4 w-4" />
            </Toggle>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <Toggle
              size="sm"
              pressed={editor.isActive('bold')}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 px-0"
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive('italic')}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 w-8 px-0"
            >
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive('underline')}
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
              className="h-8 w-8 px-0"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive('strike')}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
              className="h-8 w-8 px-0"
            >
              <Strikethrough className="h-4 w-4" />
            </Toggle>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'left' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
              className="h-8 w-8 px-0"
            >
              <AlignLeft className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'center' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
              className="h-8 w-8 px-0"
            >
              <AlignCenter className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'right' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
              className="h-8 w-8 px-0"
            >
              <AlignRight className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'justify' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
              className="h-8 w-8 px-0"
            >
              <AlignJustify className="h-4 w-4" />
            </Toggle>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 px-0 rounded-sm">
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <span className="text-[12px] font-bold leading-[12px] font-serif">A</span>
                    <div 
                      className="w-3.5 h-[3px] mt-[1px]" 
                      style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }} 
                    />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[140px] p-2" align="center" sideOffset={8}>
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className="w-5 h-5 rounded-sm border shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().setColor(color).run()}
                    />
                  ))}
                  <button 
                    className="col-span-5 text-[10px] text-center py-1 mt-1 border-t hover:bg-muted"
                    onClick={() => editor.chain().focus().unsetColor().run()}
                  >
                    Remover cor
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center gap-0.5">
            <Toggle
              size="sm"
              pressed={editor.isActive('bulletList')}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              className="h-8 w-8 px-0"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive('orderedList')}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              className="h-8 w-8 px-0"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
