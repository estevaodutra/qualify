import { GripVertical, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export interface QuestionDraft {
  id: string;
  questionText: string;
  questionType: "short_text" | "long_text" | "number" | "multiple_choice";
  options: string[];
  isRequired: boolean;
}

interface Props {
  questions: QuestionDraft[];
  onChange: (q: QuestionDraft[]) => void;
}

const TYPE_LABELS: Record<QuestionDraft["questionType"], string> = {
  short_text: "Texto curto",
  long_text: "Texto longo",
  number: "Número",
  multiple_choice: "Múltipla escolha",
};

export function QualificationTab({ questions, onChange }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const update = (idx: number, partial: Partial<QuestionDraft>) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...partial };
    onChange(next);
  };

  const add = () => {
    onChange([
      ...questions,
      { id: `tmp-${crypto.randomUUID()}`, questionText: "", questionType: "short_text", options: [], isRequired: false },
    ]);
  };

  const remove = (idx: number) => onChange(questions.filter((_, i) => i !== idx));

  const onDrop = (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...questions];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange(next);
    setDragIdx(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Perguntas exibidas antes da confirmação. Respostas são salvas no lead.
      </p>

      {questions.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Nenhuma pergunta adicionada</p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card
            key={q.id}
            className="p-4 space-y-3"
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(idx)}
          >
            <div className="flex items-start gap-2">
              <button type="button" className="cursor-grab pt-2 text-muted-foreground hover:text-foreground">
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex-1 space-y-3">
                <Input
                  value={q.questionText}
                  onChange={(e) => update(idx, { questionText: e.target.value })}
                  placeholder="Texto da pergunta"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={q.questionType} onValueChange={(v) => update(idx, { questionType: v as QuestionDraft["questionType"] })}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Switch checked={q.isRequired} onCheckedChange={(c) => update(idx, { isRequired: c })} />
                    Obrigatório
                  </Label>
                </div>

                {q.questionType === "multiple_choice" && (
                  <div className="space-y-2 pl-2 border-l-2 border-border">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const opts = [...q.options];
                            opts[oIdx] = e.target.value;
                            update(idx, { options: opts });
                          }}
                          placeholder={`Opção ${oIdx + 1}`}
                          className="h-8"
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => update(idx, { options: q.options.filter((_, i) => i !== oIdx) })}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="ghost" onClick={() => update(idx, { options: [...q.options, ""] })} className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                    </Button>
                  </div>
                )}
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => remove(idx)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Adicionar Pergunta
      </Button>
    </div>
  );
}
