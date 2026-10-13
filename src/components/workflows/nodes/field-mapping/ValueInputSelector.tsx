import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Braces, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Building2, 
  MessageSquare, 
  Database, 
  Sparkles,
  ChevronDown,
  Layers
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ValueInputSelectorProps {
  value: string;
  onChange: (value: string) => void;
  referencePayload?: any;
  customFields?: Array<{ id: string; name: string; label: string; type?: string }>;
}

// Recursive JSON explorer component for webhook / api payloads
function JsonExplorer({ data, onSelect, path = "" }: { data: any; onSelect: (path: string) => void; path?: string }) {
  if (typeof data !== "object" || data === null) {
    return (
      <div 
        className="text-xs py-1.5 px-2 hover:bg-[#8A3CFF]/5 cursor-pointer text-slate-600 rounded flex items-center justify-between group transition-colors"
        onClick={() => onSelect(path)}
      >
        <span className="font-mono font-semibold text-[#8A3CFF] mr-2">{path.split('.').pop()}</span>
        <span className="text-slate-400 break-all text-right max-w-[240px] truncate">{String(data)}</span>
        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#8A3CFF] shrink-0 bg-[#8A3CFF]/10 px-1.5 py-0.5 rounded font-bold ml-2">
          Inserir
        </span>
      </div>
    );
  }

  return (
    <div className="pl-3 border-l border-slate-200/80 space-y-1 my-1">
      {Object.entries(data).map(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        const isPrimitive = typeof value !== "object" || value === null;

        if (isPrimitive) {
          return (
            <div 
              key={currentPath}
              className="text-xs py-1.5 px-2 hover:bg-[#8A3CFF]/5 cursor-pointer rounded transition-colors group flex items-start gap-2"
              onClick={() => onSelect(currentPath)}
            >
              <span className="font-mono font-semibold text-[#8A3CFF] shrink-0 mt-0.5">{key}:</span>
              <span className="text-slate-500 break-all">{String(value)}</span>
              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#8A3CFF] ml-auto shrink-0 bg-[#8A3CFF]/10 px-1.5 py-0.5 rounded font-bold">
                Inserir
              </span>
            </div>
          );
        }

        return (
          <div key={currentPath} className="mt-2">
            <div className="text-xs font-bold text-slate-700 px-2 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A3CFF]/60" />
              {key}
            </div>
            <JsonExplorer data={value} onSelect={onSelect} path={currentPath} />
          </div>
        );
      })}
    </div>
  );
}

export function ValueInputSelector({ value, onChange, referencePayload, customFields = [] }: ValueInputSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inserts variable at current cursor position in the textarea
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

  const handleSelectJsonPath = (path: string) => {
    insertVariable(`{{${path}}}`);
    setModalOpen(false);
  };

  const hasReferencePayload = referencePayload && Object.keys(referencePayload).length > 0;

  return (
    <div className="space-y-2.5">
      {/* Quick Access Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable("{{name}}")}
            className="h-7 px-2 text-[11px] font-semibold text-slate-700 bg-white border-slate-200 hover:border-[#8A3CFF] hover:bg-[#8A3CFF]/5 hover:text-[#8A3CFF] rounded-lg gap-1 transition-all"
            title="Inserir Nome do lead"
          >
            <User className="h-3 w-3 text-[#8A3CFF]" />
            Nome
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable("{{phone}}")}
            className="h-7 px-2 text-[11px] font-semibold text-slate-700 bg-white border-slate-200 hover:border-[#8A3CFF] hover:bg-[#8A3CFF]/5 hover:text-[#8A3CFF] rounded-lg gap-1 transition-all"
            title="Inserir Telefone do lead"
          >
            <Phone className="h-3 w-3 text-emerald-600" />
            Telefone
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable("{{userResponse}}")}
            className="h-7 px-2 text-[11px] font-semibold text-slate-700 bg-white border-slate-200 hover:border-[#8A3CFF] hover:bg-[#8A3CFF]/5 hover:text-[#8A3CFF] rounded-lg gap-1 transition-all"
            title="Inserir Resposta do Usuário (Entrada anterior)"
          >
            <MessageSquare className="h-3 w-3 text-blue-600" />
            Resposta do Lead
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable("{{email}}")}
            className="h-7 px-2 text-[11px] font-semibold text-slate-700 bg-white border-slate-200 hover:border-[#8A3CFF] hover:bg-[#8A3CFF]/5 hover:text-[#8A3CFF] rounded-lg gap-1 transition-all"
            title="Inserir E-mail do lead"
          >
            <Mail className="h-3 w-3 text-amber-600" />
            E-mail
          </Button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Dropdown with all categorized variables */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px] font-bold text-[#8A3CFF] bg-[#8A3CFF]/5 border-[#8A3CFF]/30 hover:bg-[#8A3CFF]/15 rounded-lg gap-1"
              >
                <Braces className="h-3.5 w-3.5" />
                Mais variáveis
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[360px] overflow-y-auto bg-white p-1.5 rounded-xl shadow-lg border-slate-200">
              <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 px-2 py-1">
                Campos do Lead
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => insertVariable("{{name}}")} className="text-xs cursor-pointer py-1.5">
                  <User className="h-3.5 w-3.5 mr-2 text-[#8A3CFF]" />
                  <span>Nome completo</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{name}}"}</code>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertVariable("{{first_name}}")} className="text-xs cursor-pointer py-1.5">
                  <User className="h-3.5 w-3.5 mr-2 text-[#8A3CFF]" />
                  <span>Primeiro nome</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{first_name}}"}</code>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertVariable("{{phone}}")} className="text-xs cursor-pointer py-1.5">
                  <Phone className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                  <span>Telefone / WhatsApp</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{phone}}"}</code>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertVariable("{{email}}")} className="text-xs cursor-pointer py-1.5">
                  <Mail className="h-3.5 w-3.5 mr-2 text-amber-600" />
                  <span>E-mail</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{email}}"}</code>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertVariable("{{document}}")} className="text-xs cursor-pointer py-1.5">
                  <FileText className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                  <span>Documento / CPF / CNPJ</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{document}}"}</code>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertVariable("{{company_name}}")} className="text-xs cursor-pointer py-1.5">
                  <Building2 className="h-3.5 w-3.5 mr-2 text-slate-600" />
                  <span>Empresa</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{company_name}}"}</code>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 px-2 py-1">
                Entradas e Respostas
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => insertVariable("{{userResponse}}")} className="text-xs cursor-pointer py-1.5">
                  <MessageSquare className="h-3.5 w-3.5 mr-2 text-blue-600" />
                  <span>Resposta do usuário (Entrada)</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{userResponse}}"}</code>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertVariable("{{option}}")} className="text-xs cursor-pointer py-1.5">
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-purple-600" />
                  <span>Opção votada em enquete</span>
                  <code className="ml-auto text-[10px] text-slate-400 font-mono">{"{{option}}"}</code>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {customFields.length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 px-2 py-1">
                    Campos Personalizados
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {customFields.map((field) => (
                      <DropdownMenuItem 
                        key={field.id} 
                        onClick={() => insertVariable(`{{${field.name}}}`)} 
                        className="text-xs cursor-pointer py-1.5"
                      >
                        <Layers className="h-3.5 w-3.5 mr-2 text-violet-500" />
                        <span className="truncate max-w-[130px]">{field.label || field.name}</span>
                        <code className="ml-auto text-[10px] text-slate-400 font-mono">{`{{${field.name}}}`}</code>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Button to open Webhook / API payload explorer */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-7 px-2 text-[11px] text-slate-500 hover:text-[#8A3CFF] hover:bg-[#8A3CFF]/10 rounded-lg gap-1"
            title="Explorar dados da API / Webhook"
          >
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Payload API</span>
          </Button>
        </div>
      </div>

      {/* Multiline Textarea for manual text + variables */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Escreva aqui o texto livremente e inclua variáveis.\n\nExemplo:\nNovo lead notificado!\nNome: {{name}}\nTelefone: {{phone}}\nResposta: {{userResponse}}`}
          rows={6}
          className="w-full min-h-[140px] p-3 text-sm bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-[#8A3CFF] focus-visible:border-transparent font-sans resize-y leading-relaxed shadow-sm transition-all text-slate-800"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
        <span>
          💡 Você pode digitar livremente e juntar múltiplos campos em uma única notificação.
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {value.length} caracteres
        </span>
      </div>

      {/* Dialog for browsing API / Webhook JSON payload */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl gap-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="h-5 w-5 text-[#8A3CFF]" />
              Dados de Entrada da API / Webhook
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Clique em qualquer campo do JSON abaixo para inseri-lo no texto exatamente onde está o cursor.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-[340px] flex flex-col">
              <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 text-xs font-mono text-slate-600 flex items-center justify-between shrink-0">
                <span>Payload de Referência</span>
                <Badge variant="outline" className="text-[10px] bg-white font-mono">
                  {hasReferencePayload ? "JSON carregado" : "Sem payload"}
                </Badge>
              </div>
              <div className="p-4 overflow-y-auto">
                {hasReferencePayload ? (
                  <JsonExplorer data={referencePayload} onSelect={handleSelectJsonPath} />
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-slate-400">Nenhum payload de referência ativo no gatilho.</p>
                    <p className="text-[11px] text-slate-400">
                      Você pode usar as variáveis padrão como <code className="font-mono text-purple-600 font-bold">{"{{body.nome}}"}</code> diretamente na caixa de texto.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              type="button"
              onClick={() => setModalOpen(false)} 
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-6 font-semibold text-xs h-9"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
