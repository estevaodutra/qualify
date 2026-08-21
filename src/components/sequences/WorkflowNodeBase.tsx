import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, LucideIcon } from "lucide-react";

export interface WorkflowNodeBaseProps {
  nodeId: string;
  title: string;
  categoryLabel?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  isSelected?: boolean;
  isHovered?: boolean;
  showToolbar?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const WorkflowNodeBase: React.FC<WorkflowNodeBaseProps> = ({
  nodeId,
  title,
  categoryLabel,
  icon: Icon,
  iconBgColor = "bg-purple-600",
  isSelected = false,
  isHovered = false,
  showToolbar = true,
  children,
  footer,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onDuplicate,
  onDelete,
  className,
}) => {
  return (
    <div
      data-node-wrapper={nodeId}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "w-[320px] rounded-xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col transition-[border-color,box-shadow] duration-150 cursor-grab active:cursor-grabbing select-none relative p-4",
        isSelected && "border-[#8A3CFF] ring-2 ring-[#8A3CFF]/10",
        className
      )}
    >
      {/* Floating Action Toolbar */}
      {isHovered && showToolbar && (
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-md p-0.5 animate-in fade-in duration-150"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md hover:bg-slate-100 text-slate-500"
              title="Duplicar"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-destructive hover:bg-destructive/10"
              title="Excluir"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Standard Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-3">
        {Icon && (
          <div className={cn("p-1.5 rounded-lg text-white shrink-0 shadow-sm flex items-center justify-center", iconBgColor)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xs text-slate-800 truncate leading-snug">{title}</h3>
          {categoryLabel && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-snug mt-0.5">
              {categoryLabel}
            </p>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 text-xs text-slate-600 font-normal leading-relaxed">{children}</div>

      {/* Optional Footer / Status */}
      {footer && <div className="mt-3 pt-2.5 border-t border-slate-100">{footer}</div>}
    </div>
  );
};
