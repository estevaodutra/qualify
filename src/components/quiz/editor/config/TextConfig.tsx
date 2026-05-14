import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function TextConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Conteúdo</Label>
        <RichTextEditor
          value={(config.content as string) || ""}
          onChange={(v) => onChange({ ...config, content: v })}
          placeholder="Digite o texto..."
        />
      </div>
    </div>
  );
}
