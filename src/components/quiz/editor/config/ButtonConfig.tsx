import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  steps: Array<{ id: string; name: string }>;
}

export function ButtonConfig({ config, onChange, steps }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });
  const navType = (config.navigationType as string) || "step";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Texto do botão</Label>
        <Input
          value={(config.text as string) || ""}
          onChange={(e) => set("text", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de navegação</Label>
        <Select value={navType} onValueChange={(v) => set("navigationType", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="step">Navegar entre etapas</SelectItem>
            <SelectItem value="url">URL externa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {navType === "step" && (
        <div className="space-y-1.5">
          <Label>Destino</Label>
          <Select
            value={(config.destination as string) || "__next__"}
            onValueChange={(v) => set("destination", v === "__next__" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="Próxima etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__next__">Próxima etapa</SelectItem>
              {steps.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {navType === "url" && (
        <div className="space-y-1.5">
          <Label>URL de destino</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={(config.externalUrl as string) || ""}
            onChange={(e) => set("externalUrl", e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Estilo</Label>
        <Select
          value={(config.style as string) || "primary"}
          onValueChange={(v) => set("style", v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Principal</SelectItem>
            <SelectItem value="secondary">Secundário</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.animated as boolean) ?? true}
            onCheckedChange={(v) => set("animated", v)}
          />
          <Label>Com animação</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.relief as boolean) ?? false}
            onCheckedChange={(v) => set("relief", v)}
          />
          <Label>Efeito relevo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.fixedBottom as boolean) ?? false}
            onCheckedChange={(v) => set("fixedBottom", v)}
          />
          <Label>Fixar no rodapé</Label>
        </div>
      </div>
    </div>
  );
}
