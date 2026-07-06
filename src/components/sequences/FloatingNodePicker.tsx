import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeCategory } from "./shared-types";

const PICKER_WIDTH = 280;
const PICKER_MAX_HEIGHT = 360;

interface FloatingNodePickerProps {
  nodeCategories: NodeCategory[];
  anchorScreenPos: { x: number; y: number };
  onPick: (type: string) => void;
  onCancel: () => void;
}

// Opens at the point where a dragged connection was released over empty
// canvas (see UnifiedSequenceBuilder's pendingConnectionDrop), letting the
// user search/pick a block that's created and auto-connected to the source
// node/port in one step. Reuses the same category list content as
// NodePalettePopover, but as a plain fixed-position portal rather than a
// Popover anchored to a fixed trigger button, since it must render at an
// arbitrary drop point instead of a fixed corner.
export function FloatingNodePicker({ nodeCategories, anchorScreenPos, onPick, onCancel }: FloatingNodePickerProps) {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    // Deferred so the same mouseup that opened the picker doesn't immediately close it.
    const timer = setTimeout(() => window.addEventListener("mousedown", handleMouseDown), 0);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      clearTimeout(timer);
    };
  }, [onCancel]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return nodeCategories;
    const term = search.trim().toLowerCase();
    return nodeCategories
      .map(cat => ({ ...cat, nodes: cat.nodes.filter(n => n.label.toLowerCase().includes(term)) }))
      .filter(cat => cat.nodes.length > 0);
  }, [nodeCategories, search]);

  const style: React.CSSProperties = { position: "fixed", width: PICKER_WIDTH, maxHeight: PICKER_MAX_HEIGHT, zIndex: 100 };
  if (anchorScreenPos.x + PICKER_WIDTH > window.innerWidth) {
    style.right = Math.max(8, window.innerWidth - anchorScreenPos.x);
  } else {
    style.left = anchorScreenPos.x;
  }
  if (anchorScreenPos.y + PICKER_MAX_HEIGHT > window.innerHeight) {
    style.bottom = Math.max(8, window.innerHeight - anchorScreenPos.y);
  } else {
    style.top = anchorScreenPos.y;
  }

  return createPortal(
    <div
      ref={containerRef}
      style={style}
      className="flex flex-col rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.08)] bg-white border border-slate-200/80 overflow-hidden"
    >
      <div className="p-3 border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar bloco..."
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {filteredCategories.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Nenhum bloco encontrado.</p>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">{category.label}</span>
              <div className="space-y-1">
                {category.nodes.map(node => {
                  const NodeIcon = node.icon;
                  const isComingSoon = node.status === "coming_soon";
                  return (
                    <button
                      key={node.type}
                      disabled={isComingSoon}
                      onClick={() => { if (isComingSoon) return; onPick(node.type); }}
                      className={cn(
                        "flex items-center gap-2.5 w-full p-2 text-left rounded-xl border border-slate-100 bg-slate-50/50 transition-colors group",
                        isComingSoon ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100/80 hover:border-slate-200 cursor-pointer"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-lg text-white shrink-0 transition-transform", node.color, !isComingSoon && "group-hover:scale-105")}>
                        <NodeIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 flex-1 min-w-0 truncate">{node.label}</span>
                      {isComingSoon && (
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider shrink-0">
                          Em breve
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}
