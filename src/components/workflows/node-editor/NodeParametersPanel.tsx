import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { Sliders } from "lucide-react";
import { LocalNode } from "@/components/sequences/shared-types";

interface NodeParametersPanelProps {
  node: LocalNode;
  onUpdate: (config: Record<string, unknown>) => void;
  mode: "group" | "dispatch";
  isGroup?: boolean;
  nodes?: LocalNode[];
}

export function NodeParametersPanel({
  node,
  onUpdate,
  mode,
  isGroup,
  nodes
}: NodeParametersPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 border rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="h-4 w-4 text-[#8A3CFF]" /> Parâmetros (Configurações)
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <UnifiedNodeConfigPanel
          node={node}
          onUpdate={onUpdate}
          onClose={() => {}}
          open={true}
          mode={mode}
          isGroup={isGroup}
          nodes={nodes}
        />
      </div>
    </div>
  );
}
