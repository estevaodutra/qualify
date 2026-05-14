import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ImageConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>URL da imagem</Label>
        <Input
          value={(config.url as string) || ""}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Texto alternativo</Label>
        <Input
          value={(config.alt as string) || ""}
          onChange={(e) => onChange({ ...config, alt: e.target.value })}
          placeholder="Descrição da imagem"
        />
      </div>
      {(config.url as string) && (
        <img
          src={config.url as string}
          alt={(config.alt as string) || ""}
          className="w-full rounded-md object-cover max-h-32"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
    </div>
  );
}
