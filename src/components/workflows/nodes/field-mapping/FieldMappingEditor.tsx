import { useState, useEffect } from "react";
import { DestinationFieldSelector } from "./DestinationFieldSelector";
import { ValueInputSelector } from "./ValueInputSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FieldMappingEditorProps {
  mapping: any;
  onChange: (updatedMapping: any) => void;
  referencePayload: any;
}

export function FieldMappingEditor({ mapping, onChange, referencePayload }: FieldMappingEditorProps) {
  const [targetField, setTargetField] = useState(mapping.targetField || "");
  const [targetLabel, setTargetLabel] = useState(mapping.targetLabel || "");
  const [sourceValue, setSourceValue] = useState(mapping.source || "");
  const [transform, setTransform] = useState(mapping.transform || "none");
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [previewResult, setPreviewResult] = useState<string>("Preview não disponível");

  useEffect(() => {
    const fetchCustomFields = async () => {
      const { data } = await supabase.from("custom_fields_metadata").select("*");
      if (data) setCustomFields(data);
    };
    fetchCustomFields();
  }, []);

  // Sync internal state to parent when it changes
  useEffect(() => {
    onChange({
      ...mapping,
      targetField,
      targetLabel,
      source: sourceValue,
      transform
    });
  }, [targetField, targetLabel, sourceValue, transform]);

  // Compute preview based on referencePayload and sourceValue expression
  useEffect(() => {
    if (!sourceValue || !referencePayload) {
      setPreviewResult("Aguardando configuração completa...");
      return;
    }

    try {
      // Basic substitution logic for {{path}}
      const resolvedValue = sourceValue.replace(/{{([^}]+)}}/g, (match, path) => {
        const parts = path.split(".");
        let current = referencePayload;
        for (const p of parts) {
          if (current === undefined || current === null) return "";
          current = current[p];
        }
        return current !== undefined ? String(current) : "";
      });

      let finalValue = resolvedValue;
      if (transform === "uppercase") finalValue = finalValue.toUpperCase();
      if (transform === "lowercase") finalValue = finalValue.toLowerCase();
      if (transform === "capitalize") finalValue = finalValue.charAt(0).toUpperCase() + finalValue.slice(1);
      if (transform === "numbers_only") finalValue = finalValue.replace(/\D/g, '');
      if (transform === "trim") finalValue = finalValue.trim();

      setPreviewResult(finalValue || "Vazio");
    } catch (e) {
      setPreviewResult("Erro ao resolver valor");
    }
  }, [sourceValue, referencePayload, transform]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Destino */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Destino</h3>
            <p className="text-xs text-slate-500 font-medium">Selecione para onde o valor será gravado</p>
          </div>
          <DestinationFieldSelector 
            value={targetField} 
            onChange={(val, label) => {
              setTargetField(val);
              if (label) setTargetLabel(label);
            }} 
            customFields={customFields}
          />
        </section>

        {/* Origem */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Valor (Entrada de dados)</h3>
            <p className="text-xs text-slate-500 font-medium">Informe qual valor será gravado</p>
          </div>
          <ValueInputSelector 
            value={sourceValue}
            onChange={setSourceValue}
            referencePayload={referencePayload}
          />
        </section>

        {/* Transformação */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Transformação de dados (opcional)</h3>
            <p className="text-xs text-slate-500 font-medium">Modifique o dado recebido antes de gravar</p>
          </div>
          <Select value={transform} onValueChange={setTransform}>
            <SelectTrigger className="w-full h-10 bg-white border-slate-200 rounded-xl text-slate-700">
              <SelectValue placeholder="Selecione uma transformação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma transformação</SelectItem>
              <SelectItem value="uppercase">Tudo maiúsculo</SelectItem>
              <SelectItem value="lowercase">Tudo minúsculo</SelectItem>
              <SelectItem value="capitalize">Apenas a primeira letra maiúscula</SelectItem>
              <SelectItem value="numbers_only">Remover tudo que não for número</SelectItem>
              <SelectItem value="trim">Remover espaços nas extremidades</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Preview */}
        <section className="pt-4">
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Preview</h3>
            </div>
            <div className="p-5 flex flex-col items-center gap-3">
              <div className="w-full max-w-sm px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <span className="text-xs font-bold text-slate-400 block mb-1">Valor de Origem</span>
                <span className="text-sm font-bold text-slate-700 break-all">{sourceValue || "-"}</span>
              </div>
              <ArrowDown className="h-5 w-5 text-slate-300" />
              <div className="w-full max-w-sm px-4 py-3 bg-[#8A3CFF]/5 rounded-xl border border-[#8A3CFF]/20 text-center">
                <span className="text-xs font-bold text-[#8A3CFF] block mb-1">Valor Final no Destino</span>
                <span className="text-base font-bold text-[#8A3CFF] break-all">{previewResult}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
