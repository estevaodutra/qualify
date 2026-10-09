import { Pipeline, PipelineGroup } from "@/types/crm.types";
import { Button } from "@/components/ui/button";
import { Settings, Search, Filter, PanelLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PipelineHeaderProps {
  pipeline: Pipeline;
  group?: PipelineGroup;
  search: string;
  setSearch: (val: string) => void;
  onOpenSettings: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function PipelineHeader({
  pipeline,
  group,
  search,
  setSearch,
  onOpenSettings,
  isSidebarCollapsed,
  onToggleSidebar,
}: PipelineHeaderProps) {
  const color = pipeline.color || group?.color || "#3b82f6";

  return (
    <div className="flex-none flex items-center justify-between p-4 border-b bg-background h-16">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Expandir listagem de pipelines" : "Recolher listagem de pipelines"}
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        )}
        <div 
          className="w-3 h-8 rounded-full shrink-0" 
          style={{ backgroundColor: color }}
        />
        <div className="truncate">
          <div className="text-xs text-muted-foreground font-medium truncate">
            {group?.name || "Geral"}
          </div>
          <h1 className="text-lg font-bold leading-tight truncate">
            {pipeline.name}
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar negócios..." 
            className="pl-9 w-64 h-9 bg-muted/50 border-transparent focus-visible:border-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Button variant="outline" size="sm" className="h-9 hidden sm:flex">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
        
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onOpenSettings}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
