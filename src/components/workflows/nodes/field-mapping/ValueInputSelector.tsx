import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { VariablePicker } from "@/components/sequences/VariablePicker";

interface ValueInputSelectorProps {
  value: string;
  onChange: (value: string) => void;
  referencePayload?: any;
}

export function ValueInputSelector({ value, onChange, referencePayload }: ValueInputSelectorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (varText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const updated = value ? `${value} ${varText}` : varText;
      onChange(updated);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = before + varText + after;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + varText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Valor (Entrada de dados)</h3>
          <p className="text-xs text-slate-500 font-medium">Informe qual valor será gravado</p>
        </div>
        <VariablePicker
          isGroup={true}
          referencePayload={referencePayload}
          onSelect={insertVariable}
        />
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: {{body.nome}}"
        rows={5}
        className="w-full min-h-[110px] p-3 text-sm bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-[#8A3CFF] focus-visible:border-transparent font-mono resize-y leading-relaxed text-slate-800 shadow-sm"
      />
    </div>
  );
}
