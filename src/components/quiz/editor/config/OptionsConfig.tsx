import { Trash2, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface QuizOption {
  id: string;
  text: string;
  image: string | null;
  points: number;
  value: string;
  destination: string | null;
}

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  steps: Array<{ id: string; name: string }>;
}

export function OptionsConfig({ config, onChange, steps }: Props) {
  const options = (config.options as QuizOption[]) || [];

  const updateOption = (index: number, updates: Partial<QuizOption>) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...updates } : o));
    onChange({ ...config, options: next });
  };

  const addOption = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    onChange({
      ...config,
      options: [
        ...options,
        { id: crypto.randomUUID(), text: `Opção ${letters[options.length] || options.length + 1}`, image: null, points: 0, value: letters[options.length] || String(options.length + 1), destination: null },
      ],
    });
  };

  const removeOption = (index: number) => {
    onChange({ ...config, options: options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Pergunta</Label>
        <RichTextEditor
          value={(config.question as string) || ""}
          onChange={(v) => onChange({ ...config, question: v })}
          placeholder="Qual é sua pergunta?"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.required as boolean) ?? true}
            onCheckedChange={(v) => onChange({ ...config, required: v })}
          />
          <Label>Obrigatório</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.multiple as boolean) ?? false}
            onCheckedChange={(v) => onChange({ ...config, multiple: v })}
          />
          <Label>Múltipla escolha</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={(config.autoAdvance as boolean) ?? true}
            onCheckedChange={(v) => onChange({ ...config, autoAdvance: v })}
          />
          <Label>Avançar automaticamente</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Opções</Label>
        {options.map((opt, i) => (
          <div key={opt.id} className="border rounded-md p-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5 text-center">{opt.value}</span>
              <Input
                className="flex-1 h-7 text-sm"
                value={opt.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                placeholder="Texto da opção"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeOption(i)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px]">Destino</Label>
                <Select
                  value={opt.destination || "__next__"}
                  onValueChange={(v) => updateOption(i, { destination: v === "__next__" ? null : v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Próxima" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__next__">Próxima etapa</SelectItem>
                    {steps.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Pontos</Label>
                <Input
                  type="number"
                  className="h-7 text-xs w-16"
                  value={opt.points}
                  onChange={(e) => updateOption(i, { points: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={addOption}>
          <Plus className="w-3 h-3 mr-1" /> Adicionar opção
        </Button>
      </div>
    </div>
  );
}
