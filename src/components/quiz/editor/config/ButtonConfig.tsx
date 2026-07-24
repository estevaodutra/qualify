import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  componentId: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  steps: Array<{ id: string; name: string }>;
}

export function ButtonConfig({ componentId, config, onChange, steps }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });
  const navType = (config.navigationType as string) || "step";
  const idNameVal = (config.idName as string) || componentId.substring(0, 6);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>ID/Name</Label>
        <Input
          value={idNameVal}
          onChange={(e) => set("idName", e.target.value)}
        />
      </div>

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

      <div className="flex items-center gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.animated as boolean) ?? true}
            onCheckedChange={(v) => set("animated", v)}
          />
          <Label>Com animação</Label>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Switch
            checked={(config.relief as boolean) ?? false}
            onCheckedChange={(v) => set("relief", v)}
          />
          <Label>Efeito relevo</Label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={(config.fixedBottom as boolean) ?? false}
          onCheckedChange={(v) => set("fixedBottom", v)}
        />
        <Label>Fixar no rodapé</Label>
      </div>

      <div className="pt-2 border-t border-border/80 space-y-3">
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">— AVANÇADO</h4>
        
        <div className="space-y-1.5">
          <Label>ID/Name</Label>
          <Input
            value={idNameVal}
            onChange={(e) => set("idName", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>função onClick (Script/Código)</Label>
          <div className="relative border rounded-md overflow-hidden bg-slate-900 border-slate-700/60 font-mono text-xs">
            <textarea
              value={(config.onClickScript as string) || ""}
              onChange={(e) => set("onClickScript", e.target.value)}
              placeholder="Digite seu script..."
              rows={8}
              className="w-full bg-slate-950/80 p-2.5 outline-none font-mono text-xs resize-y text-green-400 leading-relaxed placeholder:text-muted-foreground/30 border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
