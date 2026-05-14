import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function FieldConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Rótulo</Label>
        <Input
          value={(config.label as string) || ""}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Placeholder</Label>
        <Input
          value={(config.placeholder as string) || ""}
          onChange={(e) => onChange({ ...config, placeholder: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={(config.required as boolean) || false}
          onCheckedChange={(v) => onChange({ ...config, required: v })}
        />
        <Label>Obrigatório</Label>
      </div>
    </div>
  );
}
