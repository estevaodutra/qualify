import { QuizComponent } from "@/hooks/useQuizComponents";
import { QuizStep } from "@/hooks/useQuizSteps";
import { DesignConfig, DEFAULT_DESIGN_CONFIG } from "../design/DesignTab";
import { cn } from "@/lib/utils";

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
  designConfig?: DesignConfig;
  stepIndex?: number;
  totalSteps?: number;
}

export function MobilePreview({ step, components, selectedComponentId, onSelectComponent, designConfig, stepIndex = 0, totalSteps = 1 }: Props) {
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

          {components.map((comp) => (
            <div
              key={comp.id}
              className={cn(
                "rounded-lg cursor-pointer transition-all",
                selectedComponentId === comp.id
                  ? "ring-2 ring-offset-1"
                  : "hover:ring-1 hover:ring-current/30"
              )}
              style={selectedComponentId === comp.id ? { ringColor: d.primaryColor } as React.CSSProperties : {}}
              onClick={() => onSelectComponent(comp.id)}
            >
              <ComponentPreview component={comp} primaryColor={d.primaryColor} borderRadius={borderRadius} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComponentPreview({ component, primaryColor, borderRadius }: { component: QuizComponent; primaryColor: string; borderRadius: string }) {
  const { componentType: type, config } = component;

  if (type === "text") {
    return (
      <div
        className="text-sm py-1"
        style={{ textAlign: (config.align as any) || "center" }}
        dangerouslySetInnerHTML={{ __html: (config.content as string) || "" }}
      />
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
    const options = (config.options as Array<{ id: string; text: string; value: string }>) || [];
    return (
      <div className="space-y-2">
        {config.question && (
          <p className="text-sm font-medium text-center mb-3">{config.question as string}</p>
        )}
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
