import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeCategory } from "./shared-types";

export const NODE_PALETTE_DND_MIME = "application/x-qualify-node-type";

interface NodePalettePopoverProps {
  nodeCategories: NodeCategory[];
  onAddNode: (type: string) => void;
}

// Floating "+ Adicionar bloco" trigger + popover — replaces the old fixed
// sidebar column so the canvas can use the full width. Closes on Esc/outside
// click for free via Radix Popover. Supports both click-to-add and
// drag-and-drop onto the canvas (see the dragStart handler below and the
// canvas' onDrop in UnifiedSequenceBuilder.tsx).
export function NodePalettePopover({ nodeCategories, onAddNode }: NodePalettePopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return nodeCategories;
    const term = search.trim().toLowerCase();
    return nodeCategories
      .map(cat => ({ ...cat, nodes: cat.nodes.filter(n => n.label.toLowerCase().includes(term)) }))
      .filter(cat => cat.nodes.length > 0);
  }, [nodeCategories, search]);

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          title="Adicionar bloco"
          className="absolute top-4 left-4 z-20 rounded-xl bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 shadow-sm gap-1.5 h-9 px-3 font-semibold"
        >
          <Plus className="h-4 w-4 text-[#8A3CFF]" />
          Adicionar bloco
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-[320px] max-h-[calc(100dvh-120px)] p-0 flex flex-col rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.08)] overflow-hidden"
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
                    return (
                      <button
                        key={node.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(NODE_PALETTE_DND_MIME, node.type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => { onAddNode(node.type); setOpen(false); }}
                        className="flex items-center gap-2.5 w-full p-2 text-left rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-200 transition-colors cursor-grab active:cursor-grabbing group"
                      >
                        <div className={cn("p-1.5 rounded-lg text-white shrink-0 group-hover:scale-105 transition-transform", node.color)}>
                          <NodeIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{node.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
