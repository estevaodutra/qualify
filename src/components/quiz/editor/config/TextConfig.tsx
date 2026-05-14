import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function TextConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Conteúdo</Label>
        <Textarea
          rows={4}
          value={(config.content as string) || ""}
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          placeholder="Digite o texto..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Alinhamento</Label>
        <Select
          value={(config.align as string) || "center"}
          onValueChange={(v) => onChange({ ...config, align: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
