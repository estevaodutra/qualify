import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuizComponentType } from "@/hooks/useQuizComponents";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  componentType: QuizComponentType;
}

const isSlider = (type: QuizComponentType) => type === "field_height" || type === "field_weight";
const hasPlaceholder = (type: QuizComponentType) =>
  !["field_height", "field_weight"].includes(type);

export function FieldConfig({ config, onChange, componentType }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });
  const slider = isSlider(componentType);

  return (
    <div className="space-y-3">
      {/* Label — only for non-slider fields */}
      {!slider && (
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input
            value={(config.label as string) || ""}
            onChange={(e) => set("label", e.target.value)}
          />
        </div>
      )}

      {/* Placeholder */}
      {hasPlaceholder(componentType) && (
        <div className="space-y-1.5">
          <Label>Placeholder</Label>
          <Input
            value={(config.placeholder as string) || ""}
            onChange={(e) => set("placeholder", e.target.value)}
          />
        </div>
      )}

      {/* Phone mask */}
      {componentType === "field_phone" && (
        <div className="space-y-1.5">
          <Label>Máscara</Label>
          <Input
            value={(config.mask as string) || "(99) 99999-9999"}
            onChange={(e) => set("mask", e.target.value)}
            placeholder="(99) 99999-9999"
          />
        </div>
      )}

      {/* Number mask */}
      {componentType === "field_number" && (
        <div className="space-y-1.5">
          <Label>Máscara</Label>
          <Select
            value={(config.mask as string) || ""}
            onValueChange={(v) => set("mask", v)}
          >
            <SelectTrigger><SelectValue placeholder="Selecione uma máscara" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhuma</SelectItem>
              <SelectItem value="money">Monetário (R$ 0,00)</SelectItem>
              <SelectItem value="percent">Percentual (0%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date mask */}
      {componentType === "field_date" && (
        <div className="space-y-1.5">
          <Label>Máscara</Label>
          <Input
            value={(config.mask as string) || "dd/mm/YYYY"}
            onChange={(e) => set("mask", e.target.value)}
            placeholder="dd/mm/YYYY"
          />
        </div>
      )}

      {/* Height unit */}
      {componentType === "field_height" && (
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <Select value={(config.unit as string) || "cm"} onValueChange={(v) => set("unit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">cm</SelectItem>
              <SelectItem value="pol">pol</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Weight unit */}
      {componentType === "field_weight" && (
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <Select value={(config.unit as string) || "kg"} onValueChange={(v) => set("unit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="lb">lb</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Slider default / min / max */}
      {slider && (
        <>
          <div className="space-y-1.5">
            <Label>Valor padrão</Label>
            <Input
              type="number"
              value={(config.defaultValue as number) ?? ""}
              onChange={(e) => set("defaultValue", Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Mínimo</Label>
              <Input
                type="number"
                value={(config.min as number) ?? ""}
                onChange={(e) => set("min", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máximo</Label>
              <Input
                type="number"
                value={(config.max as number) ?? ""}
                onChange={(e) => set("max", Number(e.target.value))}
              />
            </div>
          </div>
        </>
      )}

      {/* Required */}
      <div className="flex items-center gap-2">
        <Switch
          checked={(config.required as boolean) || false}
          onCheckedChange={(v) => set("required", v)}
        />
        <Label>Campo obrigatório</Label>
      </div>
    </div>
  );
}
