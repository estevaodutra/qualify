import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, FastForward, X, Check, Save, RefreshCw } from "lucide-react";
import { LocalNode } from "@/components/sequences/shared-types";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NodeEditorHeaderProps {
  node: LocalNode;
  previousNodes: LocalNode[];
  nextNodes: LocalNode[];
  onNavigate: (nodeId: string) => void;
  onRunStep: () => void;
  onRunPrevious: () => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  isUnsaved: boolean;
  isSimulating: boolean;
}

export function NodeEditorHeader({
  node,
  previousNodes,
  nextNodes,
  onNavigate,
  onRunStep,
  onRunPrevious,
  onClose,
  onSave,
  isSaving,
  isUnsaved,
  isSimulating,
}: NodeEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-6 py-4 bg-white shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-[#8A3CFF]/10 flex items-center justify-center text-[#8A3CFF] font-bold text-sm shrink-0">
          {node.nodeType.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800">
              {(node.config.label as string) || node.nodeType}
            </span>
            <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-5 font-bold text-slate-400">
              {node.nodeType}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Editor de Etapa</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Navigation - Previous */}
        {previousNodes.length > 0 && (
          previousNodes.length === 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(previousNodes[0].id)}
              className="h-8 text-xs rounded-xl border-slate-200"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl border-slate-200">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior ({previousNodes.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {previousNodes.map(prev => (
                  <DropdownMenuItem key={prev.id} onClick={() => onNavigate(prev.id)}>
                    {(prev.config.label as string) || prev.nodeType}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}

        {/* Action Toolbar */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRunPrevious}
          disabled={isSimulating}
          className="h-8 text-xs rounded-xl border-slate-200 text-slate-600 hover:text-slate-900"
          title="Executar fluxo até este nó"
        >
          <FastForward className="h-3.5 w-3.5 mr-1 text-slate-400" /> Executar anteriores
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRunStep}
          disabled={isSimulating}
          className="h-8 text-xs rounded-xl border-[#8A3CFF]/30 hover:bg-[#8A3CFF]/5 text-[#8A3CFF] font-semibold"
          title="Executar apenas este nó"
        >
          <Play className="h-3.5 w-3.5 mr-1" /> {isSimulating ? "Executando..." : "Executar etapa"}
        </Button>

        {/* Navigation - Next */}
        {nextNodes.length > 0 && (
          nextNodes.length === 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(nextNodes[0].id)}
              className="h-8 text-xs rounded-xl border-slate-200"
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl border-slate-200">
                  Próximo ({nextNodes.length}) <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {nextNodes.map(next => (
                  <DropdownMenuItem key={next.id} onClick={() => onNavigate(next.id)}>
                    {(next.config.label as string) || next.nodeType}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
