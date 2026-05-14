import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function TextConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="relative border rounded-md p-3 mt-3 bg-background">
        <span className="absolute -top-2.5 left-3 bg-background px-1 text-[11px] text-muted-foreground">
          Texto
        </span>
        <RichTextEditor
          variant="inline"
          value={(config.content as string) || ""}
          onChange={(v) => onChange({ ...config, content: v })}
          placeholder="Texto informativo..."
          minHeight="100px"
        />
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors w-full uppercase">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Avançado
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Pode ser preenchido futuramente */}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
