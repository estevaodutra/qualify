import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  steps: Array<{ id: string; name: string }>;
}

export function ButtonConfig({ config, onChange, steps }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Texto do botão</Label>
        <Input
          value={(config.text as string) || ""}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Destino ao clicar</Label>
        <Select
          value={(config.destination as string) || "__next__"}
          onValueChange={(v) => onChange({ ...config, destination: v === "__next__" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Próxima etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__next__">Próxima etapa</SelectItem>
            {steps.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Estilo</Label>
        <Select
          value={(config.style as string) || "primary"}
          onValueChange={(v) => onChange({ ...config, style: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Principal</SelectItem>
            <SelectItem value="secondary">Secundário</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
