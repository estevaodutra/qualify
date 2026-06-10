import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DesignConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: "square" | "medium" | "rounded";
  fontFamily: string;
  logoUrl: string;
}

export const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  primaryColor: "#6366f1",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  borderRadius: "medium",
  fontFamily: "Inter",
  logoUrl: "",
};

export const THEME_PRESETS = [
  {
    name: "Clean Corporate",
    primaryColor: "#2563eb",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    borderRadius: "medium" as const,
    fontFamily: "Inter",
  },
  {
    name: "Dark Modern",
    primaryColor: "#a855f7",
    backgroundColor: "#111827",
    textColor: "#f9fafb",
    borderRadius: "medium" as const,
    fontFamily: "Poppins",
  },
  {
    name: "Neon Glow",
    primaryColor: "#10b981",
    backgroundColor: "#030712",
    textColor: "#f3f4f6",
    borderRadius: "rounded" as const,
    fontFamily: "Montserrat",
  },
  {
    name: "Glassmorphic Light",
    primaryColor: "#db2777",
    backgroundColor: "#f4f4f5cc",
    textColor: "#18181b",
    borderRadius: "rounded" as const,
    fontFamily: "Poppins",
  }
];

interface Props {
  config: DesignConfig;
  onChange: (config: DesignConfig) => void;
}

export function DesignTab({ config, onChange }: Props) {
  const set = (key: keyof DesignConfig, value: string) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Temas Rápidos</h3>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange({ ...config, ...preset })}
              className="flex items-center justify-between p-2.5 border rounded-md hover:border-primary transition-all text-left bg-card text-card-foreground shadow-sm"
            >
              <div>
                <p className="text-xs font-semibold">{preset.name}</p>
                <div className="flex gap-1 mt-1.5">
                  <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: preset.backgroundColor }} />
                  <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: preset.primaryColor }} />
                  <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: preset.textColor }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">Cores</h3>
        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label="Cor primária"
            value={config.primaryColor}
            onChange={(v) => set("primaryColor", v)}
          />
          <ColorPicker
            label="Cor de fundo"
            value={config.backgroundColor}
            onChange={(v) => set("backgroundColor", v)}
          />
          <ColorPicker
            label="Cor do texto"
            value={config.textColor}
            onChange={(v) => set("textColor", v)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Tipografia</h3>
        <div className="space-y-1.5">
          <Label>Fonte principal</Label>
          <Select value={config.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Inter", "Roboto", "Poppins", "Lato", "Montserrat", "Open Sans"].map((f) => (
                <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Bordas</h3>
        <div className="space-y-1.5">
          <Label>Arredondamento</Label>
          <Select value={config.borderRadius} onValueChange={(v) => set("borderRadius", v as DesignConfig["borderRadius"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">Quadrado</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="rounded">Arredondado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Logotipo</h3>
        <div className="space-y-1.5">
          <Label>URL do logotipo</Label>
          <Input
            placeholder="https://..."
            value={config.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
          />
          {config.logoUrl && (
            <img
              src={config.logoUrl}
              alt="Logo preview"
              className="h-10 object-contain mt-2"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:border-primary transition-colors"
        onClick={() => ref.current?.click()}
      >
        <div
          className="w-5 h-5 rounded border"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-mono">{value}</span>
        <input
          ref={ref}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
    </div>
  );
}
