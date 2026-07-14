import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Braces, FunctionSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ValueInputSelectorProps {
  value: string;
  onChange: (value: string) => void;
  referencePayload: any;
}

// A simple recursive JSON explorer component
function JsonExplorer({ data, onSelect, path = "" }: { data: any; onSelect: (path: string) => void; path?: string }) {
  if (typeof data !== "object" || data === null) {
    return (
      <div 
        className="text-xs py-1 px-2 hover:bg-slate-100 cursor-pointer text-slate-600 rounded"
        onClick={() => onSelect(path)}
      >
        <span className="font-semibold text-[#8A3CFF] mr-2">{path.split('.').pop()}</span>
        <span className="text-slate-400 break-all">{String(data)}</span>
      </div>
    );
  }

  return (
    <div className="pl-4 border-l border-slate-100 space-y-1 my-1">
      {Object.entries(data).map(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        const isPrimitive = typeof value !== "object" || value === null;

        if (isPrimitive) {
          return (
            <div 
              key={currentPath}
              className="text-xs py-1 px-2 hover:bg-[#8A3CFF]/5 cursor-pointer rounded transition-colors group flex items-start gap-2"
              onClick={() => onSelect(currentPath)}
            >
              <span className="font-semibold text-[#8A3CFF] shrink-0 mt-0.5">{key}:</span>
              <span className="text-slate-500 break-all">{String(value)}</span>
              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#8A3CFF] ml-auto shrink-0 bg-[#8A3CFF]/10 px-1.5 py-0.5 rounded font-bold">
                Selecionar
              </span>
            </div>
          );
        }

        return (
          <div key={currentPath} className="mt-2">
            <div className="text-xs font-bold text-slate-700 px-2 mb-1">{key}</div>
            <JsonExplorer data={value} onSelect={onSelect} path={currentPath} />
          </div>
        );
      })}
    </div>
  );
}

export function ValueInputSelector({ value, onChange, referencePayload }: ValueInputSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tempValue, setTempValue] = useState("");

  const handleOpenModal = () => {
    setTempValue(value);
    setModalOpen(true);
  };

  const handleSelectPath = (path: string) => {
    // If the input was empty, just set the {{path}}. 
    // If it had text, append the {{path}} at the end.
    const newValue = tempValue.trim() ? `${tempValue} {{${path}}}` : `{{${path}}}`;
    setTempValue(newValue);
  };

  const handleConfirm = () => {
    onChange(tempValue);
    setModalOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: {{body.nome}}"
          className="h-10 pr-20 bg-white border-slate-200 focus-visible:ring-[#8A3CFF] rounded-xl text-sm"
        />
        <div className="absolute right-1 top-1 flex items-center gap-1">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-slate-400 hover:text-[#8A3CFF] hover:bg-[#8A3CFF]/10 rounded-lg"
            onClick={handleOpenModal}
            title="Selecionar Variável"
          >
            <Braces className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
            title="Inserir Expressão"
          >
            <FunctionSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl gap-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Dado de entrada da api</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Braces className="h-4 w-4 text-[#8A3CFF]" /> Valor selecionado
              </label>
              <p className="text-xs text-slate-500">Escreva ou selecione um valor do json</p>
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder="Ex: {{data.name}}"
                className="h-10 border-blue-200 focus-visible:ring-blue-500 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Dados recebidos</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-[300px] flex flex-col">
                <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-200 text-xs font-mono text-slate-500 shrink-0">
                  {`{}`}
                </div>
                <div className="p-4 overflow-y-auto">
                  {referencePayload && Object.keys(referencePayload).length > 0 ? (
                    <JsonExplorer data={referencePayload} onSelect={handleSelectPath} />
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum payload de referência ativo no gatilho.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 font-semibold">
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
