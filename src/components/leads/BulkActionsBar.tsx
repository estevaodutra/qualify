import { Button } from "@/components/ui/button";
import { Tag, Megaphone, Trash2, X, TagsIcon } from "lucide-react";

interface BulkActionsBarProps {
  count: number;
  totalCount?: number;
  allSelected?: boolean;
  onSelectAll?: () => void;
  onAddToCampaign: () => void;
  onAddTag: () => void;
  onRemoveTag: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ count, totalCount, allSelected, onSelectAll, onAddToCampaign, onAddTag, onRemoveTag, onDelete, onCancel }: BulkActionsBarProps) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">☑️ {count} leads selecionados</span>
          {!allSelected && totalCount && totalCount > count && onSelectAll && (
            <Button size="sm" variant="secondary" onClick={onSelectAll} className="text-xs h-7">
              Selecionar todos os {totalCount}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={onAddToCampaign} className="gap-1">
            <Megaphone className="h-3.5 w-3.5" /> Campanha
          </Button>
          <Button size="sm" variant="secondary" onClick={onAddTag} className="gap-1">
            <Tag className="h-3.5 w-3.5" /> Adicionar Tag
          </Button>
          <Button size="sm" variant="secondary" onClick={onRemoveTag} className="gap-1">
            <TagsIcon className="h-3.5 w-3.5" /> Remover Tag
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} className="gap-1">
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="text-primary-foreground hover:text-primary-foreground/80">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
