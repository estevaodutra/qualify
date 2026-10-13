import { useState, useEffect } from "react";
import { DestinationFieldSelector } from "./DestinationFieldSelector";
import { ValueInputSelector } from "./ValueInputSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FieldMappingEditorProps {
  mapping: any;
  onChange: (updatedMapping: any) => void;
  referencePayload: any;
}

export function FieldMappingEditor({ mapping, onChange, referencePayload }: FieldMappingEditorProps) {
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [previewResult, setPreviewResult] = useState<string>("Aguardando configuração...");

  const targetField = mapping.targetField || "";
  const sourceValue = mapping.source || "";
  const transform = mapping.transform || "none";

  const fetchCustomFields = async () => {
    const { data } = await supabase.from("custom_fields_metadata").select("*");
    if (data) setCustomFields(data);
  };

  useEffect(() => {
    fetchCustomFields();
  }, []);

  // Compute preview based on sample lead data, referencePayload, customFields, and sourceValue expression
  useEffect(() => {
    if (!sourceValue) {
      setPreviewResult("Aguardando configuração...");
      return;
    }

    try {
      const sampleMap: Record<string, string> = {
        name: "João Silva",
        nome: "João Silva",
        first_name: "João",
        primeiro_nome: "João",
        phone: "5511999998888",
        telefone: "5511999998888",
        celular: "5511999998888",
        email: "joao@email.com",
        "e-mail": "joao@email.com",
        document: "123.456.789-00",
        cpf: "123.456.789-00",
        cnpj: "12.345.678/0001-90",
        company_name: "Empresa Exemplo",
        empresa: "Empresa Exemplo",
        userResponse: "Quero saber mais sobre os planos",
        user_response: "Quero saber mais sobre os planos",
        resposta: "Quero saber mais sobre os planos",
        option: "Opção 1",
        opcao: "Opção 1",
      };

      const resolvedValue = sourceValue.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const cleanPath = path.trim();
        const lowerPath = cleanPath.toLowerCase();

        // 1. Check known built-in variables
        if (sampleMap[cleanPath] !== undefined) return sampleMap[cleanPath];
        if (sampleMap[lowerPath] !== undefined) return sampleMap[lowerPath];

        // 2. Check referencePayload (API / Webhook)
        if (referencePayload) {
          const parts = cleanPath.split(".");
          let current: any = referencePayload;
          for (const p of parts) {
            if (current === undefined || current === null) break;
            current = current[p];
          }
          if (current !== undefined && current !== null) {
            return typeof current === "object" ? JSON.stringify(current) : String(current);
          }
        }

        // 3. Check custom fields
        const cfFound = customFields.find(
          cf => cf.name === cleanPath || cf.name === cleanPath.replace(/^custom_fields\./, '')
        );
        if (cfFound) {
          return `[${cfFound.label || cleanPath}]`;
        }

        return `[${cleanPath}]`;
      });

      let finalValue = resolvedValue;
      if (transform === "uppercase") finalValue = finalValue.toUpperCase();
      if (transform === "lowercase") finalValue = finalValue.toLowerCase();
      if (transform === "capitalize") finalValue = finalValue.charAt(0).toUpperCase() + finalValue.slice(1);
      if (transform === "numbers_only") finalValue = finalValue.replace(/\D/g, "");
      if (transform === "trim") finalValue = finalValue.trim();
      if (transform === "format_phone_br") {
        let onlyNums = finalValue.replace(/\D/g, "");
        if (onlyNums.length >= 10 && !onlyNums.startsWith("55")) {
          onlyNums = "55" + onlyNums;
        }
        finalValue = onlyNums;
      }

      setPreviewResult(finalValue || "(Vazio)");
    } catch (e) {
      setPreviewResult("Erro ao resolver valor");
    }
  }, [sourceValue, referencePayload, customFields, transform]);

  const handleChange = (updates: Partial<any>) => {
    onChange({ ...mapping, ...updates });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="flex-1 overflow-y-auto p-6 space-y-7">
        
        {/* Destino */}
        <section className="space-y-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Destino</h3>
            <p className="text-xs text-slate-500 font-medium">Selecione para onde o valor será gravado</p>
          </div>
          <DestinationFieldSelector 
            value={targetField} 
            onChange={(val, label) => {
              const updates: any = { targetField: val };
              if (label) updates.targetLabel = label;
              handleChange(updates);
            }} 
            customFields={customFields}
            onFieldCreated={fetchCustomFields}
          />
        </section>

        {/* Origem (Caixa de texto multiline com variáveis) */}
        <section className="space-y-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Valor (Entrada de dados)</h3>
            <p className="text-xs text-slate-500 font-medium">
              Escreva o texto manualmente e combine várias variáveis para montar uma notificação ou texto composto.
            </p>
          </div>
          <ValueInputSelector 
            value={sourceValue}
            onChange={(val) => handleChange({ source: val })}
            referencePayload={referencePayload}
            customFields={customFields}
          />
        </section>

        {/* Transformação */}
        <section className="space-y-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Transformação de dados (opcional)</h3>
            <p className="text-xs text-slate-500 font-medium">Modifique o dado recebido antes de gravar</p>
          </div>
          <Select value={transform} onValueChange={(val) => handleChange({ transform: val })}>
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
              <SelectItem value="format_phone_br">Formatar telefone BR (+55)</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Preview */}
        <section className="pt-2">
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Preview do Resultado</h3>
              <span className="text-[11px] text-slate-400 font-medium">Simulação com dados de exemplo</span>
            </div>
            <div className="p-4 flex flex-col items-center gap-2.5">
              <div className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-left">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Texto Configurado</span>
                <span className="text-xs font-mono text-slate-600 break-words whitespace-pre-wrap block max-h-28 overflow-y-auto">
                  {sourceValue || "-"}
                </span>
              </div>
              <ArrowDown className="h-4 w-4 text-slate-300" />
              <div className="w-full px-3.5 py-3 bg-[#8A3CFF]/5 rounded-xl border border-[#8A3CFF]/20 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#8A3CFF]">
                    Valor Final Gravado
                  </span>
                  {targetField && (
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#8A3CFF]/20 text-[#8A3CFF] font-semibold">
                      {targetField}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-slate-800 break-words whitespace-pre-wrap max-h-40 overflow-y-auto bg-white/70 p-3 rounded-lg border border-[#8A3CFF]/15">
                  {previewResult}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
