import { GripVertical, Copy, Trash2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuizComponent } from "@/hooks/useQuizComponents";
import { QuizStep } from "@/hooks/useQuizSteps";
import { DesignConfig, DEFAULT_DESIGN_CONFIG } from "../design/DesignTab";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const RADIUS: Record<string, string> = {
  square: "0px",
  medium: "12px",
  rounded: "24px",
};

interface Props {
  step: QuizStep | null;
  components: QuizComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  onChangeComponent?: (id: string, config: Record<string, unknown>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (component: QuizComponent) => void;
  onReorderComponents: (ids: string[]) => void;
  designConfig?: DesignConfig;
  stepIndex?: number;
  totalSteps?: number;
}

export function MobilePreview({
  step,
  components,
  selectedComponentId,
  onSelectComponent,
  onChangeComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onReorderComponents,
  designConfig,
  stepIndex = 0,
  totalSteps = 1,
}: Props) {
  const d = { ...DEFAULT_DESIGN_CONFIG, ...designConfig };
  const borderRadius = RADIUS[d.borderRadius] || "12px";

  const cssVars = {
    "--quiz-primary": d.primaryColor,
    "--quiz-bg": d.backgroundColor,
    "--quiz-text": d.textColor,
    "--quiz-radius": borderRadius,
    fontFamily: d.fontFamily + ", sans-serif",
    backgroundColor: d.backgroundColor,
    color: d.textColor,
  } as React.CSSProperties;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = components.findIndex((c) => c.id === active.id);
    const newIndex = components.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(components, oldIndex, newIndex);
    onReorderComponents(reordered.map((c) => c.id));
  };

  if (!step) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Selecione uma etapa para visualizar.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start h-full py-4 overflow-y-auto bg-muted/30">
      {/* Phone frame */}
      <div
        className="w-[390px] min-h-[700px] rounded-[2rem] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={cssVars}
      >
        {/* Status bar */}
        <div className="h-10 flex items-center px-6 justify-between shrink-0">
          <span className="text-[10px] font-medium opacity-60">9:41</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-current opacity-20" />
            <div className="w-3 h-3 rounded-full bg-current opacity-20" />
          </div>
        </div>

        {/* Logo */}
        {step.showLogo && d.logoUrl && (
          <div className="flex justify-center px-5 pb-2">
            <img
              src={d.logoUrl}
              alt="Logo"
              className="h-8 object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        )}

        {/* Progress bar */}
        {step.showProgress && (
          <div className="h-1.5 bg-black/10 mx-4 rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0}%`, backgroundColor: d.primaryColor }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">
          {components.length === 0 && (
            <div className="flex items-center justify-center h-32 text-xs text-current opacity-30 border-2 border-dashed border-current/20 rounded-lg">
              Adicione componentes do painel esquerdo
            </div>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {components.map((comp) => (
                <SortableComponentItem
                  key={comp.id}
                  component={comp}
                  isSelected={selectedComponentId === comp.id}
                  primaryColor={d.primaryColor}
                  borderRadius={borderRadius}
                  onSelect={() => onSelectComponent(comp.id)}
                  onChangeConfig={(config) => onChangeComponent?.(comp.id, config)}
                  onDuplicate={() => onDuplicateComponent(comp)}
                  onDelete={() => onDeleteComponent(comp.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

function SortableComponentItem({
  component,
  isSelected,
  primaryColor,
  borderRadius,
  onSelect,
  onChangeConfig,
  onDuplicate,
  onDelete
}: {
  component: QuizComponent;
  isSelected: boolean;
  primaryColor: string;
  borderRadius: string;
  onSelect: () => void;
  onChangeConfig?: (config: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: component.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isSelected ? { ringColor: primaryColor } : {})
      } as React.CSSProperties}
      className={cn(
        "relative group rounded-lg cursor-pointer transition-all",
        isSelected ? "ring-2 ring-offset-1" : "hover:ring-1 hover:ring-current/30",
        isDragging && "opacity-50 ring-2 z-50"
      )}
      onClick={onSelect}
    >
      {/* Floating Action Bar */}
      <div className={cn(
        "absolute right-2 top-2 flex items-center gap-1 p-1 rounded-md bg-white/90 dark:bg-black/90 backdrop-blur-sm border shadow-sm transition-opacity opacity-0 group-hover:opacity-100 z-10 text-foreground",
        isSelected && "opacity-100"
      )}>
        <button
          {...attributes}
          {...listeners}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-grab"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="pointer-events-auto">
        <ComponentPreview 
          component={component} 
          primaryColor={primaryColor} 
          borderRadius={borderRadius} 
          onChangeConfig={onChangeConfig}
        />
      </div>
    </div>
  );
}

function ComponentPreview({ 
  component, 
  primaryColor, 
  borderRadius,
  onChangeConfig 
}: { 
  component: QuizComponent; 
  primaryColor: string; 
  borderRadius: string;
  onChangeConfig?: (config: Record<string, unknown>) => void;
}) {
  const { componentType: type, config } = component;

  if (type === "text") {
    return (
      <div className="text-sm py-1" style={{ textAlign: (config.align as any) || "center" }}>
        <RichTextEditor
          variant="inline"
          value={(config.content as string) || ""}
          onChange={(val) => onChangeConfig?.({ ...config, content: val })}
        />
      </div>
    );
  }

  if (type === "image") {
    if (!config.url) {
      return (
        <div className="h-24 bg-current/10 rounded-lg flex items-center justify-center text-xs opacity-40">
          Imagem
        </div>
      );
    }
    return (
      <img
        src={config.url as string}
        alt={(config.alt as string) || ""}
        className="w-full object-cover"
        style={{ borderRadius }}
      />
    );
  }

  if (type === "button") {
    const style = config.style as string || "primary";
    return (
      <button
        className="w-full py-3 text-sm font-semibold transition-opacity"
        style={{
          borderRadius,
          backgroundColor: style === "primary" ? primaryColor : "transparent",
          color: style === "primary" ? "#fff" : primaryColor,
          border: style !== "primary" ? `2px solid ${primaryColor}` : "none",
        }}
      >
        {(config.text as string) || "Botão"}
      </button>
    );
  }

  if (type === "options") {
    const options = (config.options as Array<{ id: string; text: string; value: string; image?: string | null }>) || [];
    const hasImages = options.some((opt) => opt.image);

    return (
      <div className="space-y-2">
        {config.question && (
          <div className="text-sm font-medium text-center mb-3">
            <RichTextEditor
              variant="inline"
              value={(config.question as string) || ""}
              onChange={(val) => onChangeConfig?.({ ...config, question: val })}
            />
          </div>
        )}
        {hasImages ? (
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                className="flex flex-col items-center p-2 text-sm text-center transition-colors border-2 border-current/20 h-full"
                style={{ borderRadius }}
              >
                {opt.image ? (
                  <img
                    src={opt.image}
                    alt={opt.text}
                    className="w-full h-20 object-cover mb-1.5 rounded"
                  />
                ) : (
                  <div className="w-full h-20 bg-current/5 rounded flex items-center justify-center mb-1.5 text-[10px] opacity-40">
                    Sem Imagem
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className="w-4 h-4 flex items-center justify-center text-[8px] font-bold shrink-0 border border-current/30"
                    style={{ borderRadius: "50%" }}
                  >
                    {opt.value}
                  </span>
                  <span className="text-xs truncate max-w-[80px] font-medium">{opt.text}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-2 border-current/20"
                style={{ borderRadius }}
              >
                <span
                  className="w-6 h-6 flex items-center justify-center text-[10px] font-bold shrink-0 border-2 border-current/30"
                  style={{ borderRadius: "50%" }}
                >
                  {opt.value}
                </span>
                {opt.text}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (
    type === "field_name" || type === "field_email" || type === "field_phone" ||
    type === "field_number" || type === "field_date"
  ) {
    return (
      <div className="space-y-1" style={{ width: (config.width as string) || "100%" }}>
        {config.label && (config.labelStyle as string) !== "none" && (
          <label className="text-xs font-medium opacity-70">{config.label as string}</label>
        )}
        <div
          className="w-full px-3 py-2.5 border-2 border-current/20 text-sm opacity-50"
          style={{ borderRadius }}
        >
          {(config.placeholder as string) || (type === "field_date" ? "dd/mm/YYYY" : "...")}
        </div>
      </div>
    );
  }

  if (type === "field_textarea") {
    return (
      <div className="space-y-1" style={{ width: (config.width as string) || "100%" }}>
        {config.label && (config.labelStyle as string) !== "none" && (
          <label className="text-xs font-medium opacity-70">{config.label as string}</label>
        )}
        <div
          className="w-full px-3 py-2.5 border-2 border-current/20 text-sm opacity-50 min-h-[72px]"
          style={{ borderRadius }}
        >
          {(config.placeholder as string) || "..."}
        </div>
      </div>
    );
  }

  if (type === "field_height" || type === "field_weight") {
    const unit = (config.unit as string) || (type === "field_height" ? "cm" : "kg");
    const val = (config.defaultValue as number) ?? (type === "field_height" ? 180 : 70);
    const min = (config.min as number) ?? (type === "field_height" ? 100 : 30);
    const max = (config.max as number) ?? (type === "field_height" ? 250 : 300);
    const pct = ((val - min) / (max - min)) * 100;
    return (
      <div className="space-y-2 py-1" style={{ width: (config.width as string) || "100%" }}>
        <div className="flex justify-between text-xs opacity-70">
          <span>{min} {unit}</span>
          <span className="font-semibold text-sm">{val} {unit}</span>
          <span>{max} {unit}</span>
        </div>
        <div className="relative h-2 rounded-full bg-current/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, backgroundColor: primaryColor }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ left: `calc(${pct}% - 8px)`, backgroundColor: primaryColor }}
          />
        </div>
      </div>
    );
  }

  return null;
}
