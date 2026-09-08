import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuizStep } from "@/hooks/useQuizSteps";

interface Props {
  componentId?: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  steps: QuizStep[];
}

export function RedirectConfig({ componentId, config, onChange, steps }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  const idName = (config.idName as string) || (componentId ? componentId.substring(0, 6) : "");
  const title = (config.title as string) ?? "Carregando...";
  const delaySeconds = Number(config.delaySeconds ?? 0);
  const durationSeconds = Number(config.durationSeconds ?? 5);
  const navigationType = (config.navigationType as string) || (config.actionType as string) || "step";
  const destination = (config.destination as string) || (config.targetStepId as string) || "";
  const externalUrl = (config.externalUrl as string) || (config.redirectUrl as string) || "";
  const description = (config.description as string) ?? "Aguarde enquanto direcionamos você...";
  const showTitle = (config.showTitle as boolean) ?? true;
  const showProgress = (config.showProgress as boolean) ?? true;

  return (
    <div className="space-y-4 select-none">
      {/* ID/Name */}
      <div className="space-y-1.5">
        <Label className="text-xs">ID/Name</Label>
        <Input
          value={idName}
          onChange={(e) => set("idName", e.target.value)}
          placeholder="ex: redirect1"
          className="h-8 text-xs font-mono"
        />
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <Label className="text-xs">Título</Label>
        <Input
          value={title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Carregando..."
          className="h-8 text-xs"
        />
      </div>

      {/* Começar após (seg.) & Duração (seg.) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Começar após (seg.)</Label>
          <Input
            type="number"
            min={0}
            value={delaySeconds}
            onChange={(e) => set("delaySeconds", Math.max(0, Number(e.target.value)))}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Duração (seg.)</Label>
          <Input
            type="number"
            min={1}
            value={durationSeconds}
            onChange={(e) => set("durationSeconds", Math.max(1, Number(e.target.value)))}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Tipo de navegação */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de navegação</Label>
        <Select
          value={navigationType === "url" || navigationType === "redirect" ? "url" : "step"}
          onValueChange={(v) => {
            set("navigationType", v);
            set("actionType", v);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="step">Entre etapas</SelectItem>
            <SelectItem value="url">URL externa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Destino do redirecionamento */}
      {navigationType === "url" || navigationType === "redirect" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Destino do redirecionamento (URL)</Label>
          <Input
            type="url"
            value={externalUrl}
            onChange={(e) => {
              set("externalUrl", e.target.value);
              set("redirectUrl", e.target.value);
            }}
            placeholder="https://..."
            className="h-8 text-xs"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">Destino do redirecionamento</Label>
          <Select
            value={destination || "__next__"}
            onValueChange={(v) => {
              const destVal = v === "__next__" ? null : v;
              set("destination", destVal);
              set("targetStepId", destVal);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Etapa seguinte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__next__">Etapa seguinte</SelectItem>
              {steps.map((st, idx) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.name || `Etapa ${idx + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label className="text-xs">Descrição</Label>
        <Textarea
          value={description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descrição que aparece abaixo da barra de progresso"
          className="text-xs min-h-[60px] resize-y"
        />
      </div>

      {/* Opções (Switches) */}
      <div className="space-y-3 border-t pt-3">
        <Label className="text-xs font-semibold">Opções</Label>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Mostrar título</span>
          <Switch
            checked={showTitle}
            onCheckedChange={(v) => set("showTitle", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Mostrar progresso</span>
          <Switch
            checked={showProgress}
            onCheckedChange={(v) => set("showProgress", v)}
          />
        </div>
      </div>
    </div>
  );
}
