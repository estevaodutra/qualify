import { useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

interface NodeJsonViewerProps {
  data: any;
}

export function NodeJsonViewer({ data }: NodeJsonViewerProps) {
  if (data === null) return <div className="text-muted-foreground p-4 font-mono text-xs">null</div>;
  if (data === undefined) return <div className="text-muted-foreground p-4 font-mono text-xs">undefined</div>;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("JSON copiado para a área de transferência!");
  };

  return (
    <div className="relative rounded-xl border bg-[#1E1E24] text-[#A9B2C3] p-4 font-mono text-[11px] overflow-auto h-full max-h-[450px]">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title="Copiar JSON completo"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <JsonTree node={data} isLast={true} />
    </div>
  );
}

function JsonTree({ node, isLast, label }: { node: any; isLast: boolean; label?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  const renderLabel = () => {
    if (!label) return null;
    return <span className="text-[#E06C75] font-semibold">"{label}": </span>;
  };

  if (typeof node !== "object" || node === null) {
    let valStr = JSON.stringify(node);
    if (typeof node === "string") valStr = `"${node}"`;
    let color = "text-[#98C379]"; // string
    if (typeof node === "number") color = "text-[#D19A66]";
    if (typeof node === "boolean") color = "text-[#56B6C2]";
    if (node === null) color = "text-[#5C6370]";

    return (
      <div className="pl-4 py-0.5">
        {renderLabel()}
        <span className={color}>{valStr}</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(node);
  const keys = Object.keys(node);

  if (keys.length === 0) {
    return (
      <div className="pl-4 py-0.5">
        {renderLabel()}
        <span className="text-slate-500">{isArray ? "[]" : "{}"}</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  return (
    <div className="pl-4 py-0.5">
      <div 
        className="flex items-center gap-1 -ml-4 cursor-pointer hover:bg-slate-800/30 rounded py-0.5 select-none" 
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
        <span>
          {renderLabel()}
          <span className="text-slate-400">{isArray ? "[" : "{"}</span>
          {collapsed && (
            <span className="text-slate-500 text-[10px] bg-slate-800 px-1 rounded mx-1 font-sans">
              {isArray ? `${node.length} items` : `${keys.length} keys`}
            </span>
          )}
          {collapsed && <span className="text-slate-400">{isArray ? "]" : "}"}</span>}
        </span>
      </div>

      {!collapsed && (
        <div className="border-l border-slate-800 ml-[-7px] pl-3 my-0.5 space-y-0.5">
          {isArray ? (
            node.map((item: any, idx: number) => (
              <JsonTree key={idx} node={item} isLast={idx === node.length - 1} />
            ))
          ) : (
            keys.map((key: string, idx: number) => (
              <JsonTree key={key} label={key} node={node[key]} isLast={idx === keys.length - 1} />
            ))
          )}
        </div>
      )}

      {!collapsed && (
        <div className="text-slate-400">
          {isArray ? "]" : "}"}
          {!isLast && <span className="text-slate-500">,</span>}
        </div>
      )}
    </div>
  );
}
