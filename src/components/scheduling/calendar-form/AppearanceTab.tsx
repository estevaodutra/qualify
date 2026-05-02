import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface AppearanceTabState {
  logoUrl: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  backgroundImageUrl: string;
  backgroundOpacity: number;
  pageTitle: string;
  pageSubtitle: string;
  confirmButtonText: string;
  successTitle: string;
  successMessage: string;
  layoutStyle: "side_by_side" | "centered" | "compact_grid";
  showTimezone: boolean;
  showDuration: boolean;
  hideBranding: boolean;
}

export const defaultAppearance: AppearanceTabState = {
  logoUrl: "",
  companyName: "",
  primaryColor: "#3b82f6",
  secondaryColor: "#e0e7ff",
  backgroundColor: "#f9fafb",
  cardColor: "#ffffff",
  textColor: "#111827",
  backgroundImageUrl: "",
  backgroundOpacity: 50,
  pageTitle: "Agende um horário",
  pageSubtitle: "Escolha o melhor dia e horário",
  confirmButtonText: "Confirmar agendamento",
  successTitle: "Agendamento confirmado!",
  successMessage: "Você receberá um lembrete antes do horário.",
  layoutStyle: "side_by_side",
  showTimezone: true,
  showDuration: true,
  hideBranding: false,
};

interface Props {
  state: AppearanceTabState;
  onChange: (s: AppearanceTabState) => void;
}

export function AppearanceTab({ state, onChange }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<"logo" | "bg" | null>(null);

  const update = <K extends keyof AppearanceTabState>(key: K, value: AppearanceTabState[K]) => {
    onChange({ ...state, [key]: value });
  };

  const upload = async (file: File, kind: "logo" | "bg") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `${kind}/${crypto.randomUUID()}.${ext}`;
      const { error } = await (supabase as any).storage.from("scheduling-assets").upload(path, file);
      if (error) throw error;
      const { data } = (supabase as any).storage.from("scheduling-assets").getPublicUrl(path);
      if (kind === "logo") update("logoUrl", data.publicUrl);
      else update("backgroundImageUrl", data.publicUrl);
    } catch (e) {
      toast({ title: "Erro no upload", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const reset = () => {
    onChange({ ...state, ...defaultAppearance, logoUrl: state.logoUrl, companyName: state.companyName });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-4 space-y-4">
          <Label className="text-base font-semibold">Logo e Marca</Label>
          <div className="flex items-center gap-4">
            {state.logoUrl ? (
              <img src={state.logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded border border-border" />
            ) : (
              <div className="h-16 w-16 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                id="logo-upload"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <label htmlFor="logo-upload" className="cursor-pointer">
                  {uploading === "logo" ? "Enviando..." : "Enviar logo"}
                </label>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input value={state.companyName} onChange={(e) => update("companyName", e.target.value)} />
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Cores</Label>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>Restaurar padrão</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "primaryColor", label: "Primária" },
              { k: "secondaryColor", label: "Secundária" },
              { k: "backgroundColor", label: "Fundo" },
              { k: "cardColor", label: "Card" },
              { k: "textColor", label: "Texto" },
            ].map(({ k, label }) => (
              <div key={k} className="flex items-center gap-2">
                <input
                  type="color"
                  value={state[k as keyof AppearanceTabState] as string}
                  onChange={(e) => update(k as keyof AppearanceTabState, e.target.value as never)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                />
                <Label className="text-sm">{label}</Label>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Imagem de Fundo</Label>
          <div className="flex items-center gap-4">
            {state.backgroundImageUrl ? (
              <img src={state.backgroundImageUrl} alt="BG" className="h-16 w-24 object-cover rounded border border-border" />
            ) : (
              <div className="h-16 w-24 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              id="bg-upload"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "bg")}
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <label htmlFor="bg-upload" className="cursor-pointer">
                {uploading === "bg" ? "Enviando..." : "Enviar imagem"}
              </label>
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Opacidade ({state.backgroundOpacity}%)</Label>
            <Slider min={0} max={100} step={5} value={[state.backgroundOpacity]} onValueChange={(v) => update("backgroundOpacity", v[0])} />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Textos</Label>
          <div className="space-y-2">
            <Label className="text-sm">Título da página</Label>
            <Input value={state.pageTitle} onChange={(e) => update("pageTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Subtítulo</Label>
            <Input value={state.pageSubtitle} onChange={(e) => update("pageSubtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Texto do botão</Label>
            <Input value={state.confirmButtonText} onChange={(e) => update("confirmButtonText", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Título de sucesso</Label>
            <Input value={state.successTitle} onChange={(e) => update("successTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Mensagem de sucesso</Label>
            <Textarea value={state.successMessage} onChange={(e) => update("successMessage", e.target.value)} rows={2} />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Layout</Label>
          <RadioGroup value={state.layoutStyle} onValueChange={(v) => update("layoutStyle", v as AppearanceTabState["layoutStyle"])} className="grid grid-cols-3 gap-2">
            {[
              { v: "side_by_side", label: "Lado a lado" },
              { v: "centered", label: "Centralizado" },
              { v: "compact_grid", label: "Grid compacto" },
            ].map(({ v, label }) => (
              <Label key={v} htmlFor={`lay-${v}`} className={`rounded border-2 p-3 cursor-pointer text-center text-sm ${state.layoutStyle === v ? "border-primary" : "border-border"}`}>
                <RadioGroupItem value={v} id={`lay-${v}`} className="sr-only" />
                {label}
              </Label>
            ))}
          </RadioGroup>
          <div className="space-y-2 pt-2">
            <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
              <Checkbox checked={state.showTimezone} onCheckedChange={(c) => update("showTimezone", !!c)} />
              Mostrar fuso horário
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
              <Checkbox checked={state.showDuration} onCheckedChange={(c) => update("showDuration", !!c)} />
              Mostrar duração
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
              <Checkbox checked={state.hideBranding} onCheckedChange={(c) => update("hideBranding", !!c)} />
              Ocultar branding DispatchOne
            </Label>
          </div>
        </Card>
      </div>

      {/* PREVIEW */}
      <div className="lg:sticky lg:top-0 lg:self-start">
        <Card className="p-4 space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Preview</Label>
          <div
            className="rounded-lg overflow-hidden border border-border"
            style={{ backgroundColor: state.backgroundColor, color: state.textColor }}
          >
            <div className="p-4 space-y-3" style={{ backgroundColor: state.cardColor }}>
              {state.logoUrl && <img src={state.logoUrl} alt="" className="h-8 w-auto" />}
              <h3 className="font-semibold text-sm" style={{ color: state.textColor }}>{state.pageTitle}</h3>
              <p className="text-xs opacity-80">{state.pageSubtitle}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].map((t) => (
                  <div
                    key={t}
                    className="text-center text-xs py-1.5 rounded"
                    style={{ backgroundColor: state.secondaryColor, color: state.textColor }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div
                className="text-center text-xs py-2 rounded font-medium"
                style={{ backgroundColor: state.primaryColor, color: "#fff" }}
              >
                {state.confirmButtonText}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
