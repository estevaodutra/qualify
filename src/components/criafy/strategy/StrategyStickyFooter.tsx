import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";

interface StrategyStickyFooterProps {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function StrategyStickyFooter({
  isSaving,
  onSave,
  onCancel,
}: StrategyStickyFooterProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs font-semibold text-foreground">
            Modo Edição Ativo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-8 px-4 text-xs font-bold gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:opacity-95 transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Salvar Estratégia
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
