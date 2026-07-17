import { X } from "lucide-react";
import { WebhookGroupScopeConfig } from "./triggers/configs/WebhookGroupScopeConfig";

interface WorkflowSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  isGroup?: boolean;
  campaignId?: string;
}

export function WorkflowSettingsModal({
  isOpen,
  onClose,
  config,
  onChange,
  isGroup = false,
  campaignId,
}: WorkflowSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-[90dvh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Configurações do Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <WebhookGroupScopeConfig
                config={config}
                onChange={onChange}
                campaignId={campaignId!}
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#8A3CFF] text-white rounded-xl text-sm font-semibold hover:bg-[#7a35e6] transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
