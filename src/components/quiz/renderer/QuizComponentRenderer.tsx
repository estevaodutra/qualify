// src/components/quiz/renderer/QuizComponentRenderer.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { QuizComponent } from "@/types/quiz";
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  Award,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  GripVertical
} from "lucide-react";
import { EditableRichText } from "../editor/EditableRichText";
import { RichTextRenderer } from "./RichTextRenderer";
import { normalizeLegacyTextConfig } from "@/utils/quiz/quizTextSanitizer";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";

function formatPhone(value: string, mask: string): string {
  if (!mask || mask === "no_mask") return value;
  const digits = value.replace(/\D/g, "");
  let formatted = "";
  let digitIdx = 0;

  for (let i = 0; i < mask.length; i++) {
    const maskChar = mask[i];
    if (maskChar === "9") {
      if (digitIdx < digits.length) {
        formatted += digits[digitIdx];
        digitIdx++;
      } else {
        break;
      }
    } else {
      if (digitIdx < digits.length) {
        formatted += maskChar;
      }
    }
  }
  return formatted;
}

interface ComponentRendererProps {
  component: QuizComponent;
  formValue?: string;
  selectedOptions?: string[];
  primaryColor: string;
  borderRadius: string;
  validationError?: string;
  isEditor?: boolean;
  isSelected?: boolean;
  submitting?: boolean;
  onFormChange?: (val: string) => void;
  onOptionSelect?: (optId: string, destination: string | null) => void;
  onNext?: () => void;
  onSelectComponent?: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onDeleteComponent?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export const QuizComponentRenderer: React.FC<ComponentRendererProps> = ({
  component,
  formValue = "",
  selectedOptions = [],
  primaryColor,
  borderRadius,
  validationError,
  isEditor = false,
  isSelected = false,
  submitting = false,
  onFormChange,
  onOptionSelect,
  onNext,
  onSelectComponent,
  onDuplicateComponent,
  onDeleteComponent,
  onMoveUp,
  onMoveDown,
}) => {
  const { componentType: type, config } = component;
  const hasError = !!validationError;

  const handleClick = (e: React.MouseEvent) => {
    if (isEditor) {
      e.stopPropagation();
      onSelectComponent?.(component.id);
    }
  };

  const borderStyle = {
    borderRadius: config.borderRadius || borderRadius || "12px",
  };

  const renderComponentBody = () => {
    // ─── Rich Text / Text / Heading (Unified) ───────────────────────────
    if (type === "rich_text" || type === "text" || type === "heading") {
      const normalized = normalizeLegacyTextConfig(type, config);

      return (
        <div className="w-full py-0 transition-all">
          <EditableRichText
            value={normalized.content}
            onChange={(newContent) => {
              if (isEditor) {
                useQuizBuilderStore.getState().updateComponentConfig(component.id, { content: newContent });
              }
            }}
            alignment={normalized.alignment}
            editable={isEditor}
            preset="full"
          />
        </div>
      );
    }

    // ─── Image / Banner / Logo ────────────────────────────────────────────────
    if (type === "image" || type === "logo") {
      const url = (config.url as string) || "";
      const alt = (config.alt as string) || "Imagem";
      const width = (config.width as string) || (type === "logo" ? "140px" : "100%");
      const alignment = (config.alignment as string) || "center";

      return (
        <div
          className={cn(
            "w-full flex my-2 transition-all",
            alignment === "left" && "justify-start",
            alignment === "center" && "justify-center",
            alignment === "right" && "justify-end"
          )}
        >
          {url ? (
            <img
              src={url}
              alt={alt}
              style={{ width, borderRadius: borderStyle.borderRadius, objectFit: (config.objectFit as any) || "cover" }}
              className="max-w-full h-auto shadow-sm"
            />
          ) : (
            <div
              style={{ width }}
              className="h-28 bg-muted/40 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-xs opacity-60"
            >
              {type === "logo" ? "Upload da Logo" : "Upload da Imagem"}
            </div>
          )}
        </div>
      );
    }

    // ─── Buttons (CTA & WhatsApp) ──────────────────────────────────────────────
    if (type === "button" || type === "cta_whatsapp") {
      const text = (config.text as string) || (type === "cta_whatsapp" ? "Falar no WhatsApp" : "Continuar");
      const buttonColor = (config.buttonColor as string) || (config.backgroundColor as string) || primaryColor;
      const textColor = (config.textColor as string) || (config.color as string) || "#ffffff";
      const width = (config.width as string) || "100%";
      const actionType = (config.actionType as string) || "navigate";
      const redirectUrl = (config.redirectUrl as string) || "";
      const openInNewTab = !!config.openInNewTab;
      const targetStepId = (config.targetStepId as string) || "";

      const handleButtonClick = () => {
        if (isEditor) return;

        if (actionType === "redirect") {
          if (redirectUrl) {
            let formattedUrl = redirectUrl.trim();
            if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
              formattedUrl = `https://${formattedUrl}`;
            }
            if (openInNewTab) {
              window.open(formattedUrl, "_blank");
            } else {
              window.location.href = formattedUrl;
            }
          }
          return;
        }

        if (targetStepId) {
          onOptionSelect?.("", targetStepId);
        } else {
          onNext?.();
        }
      };

      return (
        <div className="w-full my-1 flex justify-center transition-all">
          <button
            type="button"
            disabled={submitting || isEditor}
            onClick={handleButtonClick}
            style={{
              width,
              borderRadius: borderStyle.borderRadius,
              backgroundColor: buttonColor,
              color: textColor,
            }}
            className={cn(
              "py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all active:scale-[0.99]",
              config.animated && "animate-pulse",
              isEditor && "pointer-events-none"
            )}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{text}</span>
            {!submitting && <ArrowRight className="w-4 h-4 shrink-0" />}
          </button>
        </div>
      );
    }

    // ─── Options / Multiple Choice ────────────────────────────────────────────
    if (type === "options" || type === "cards_choice") {
      const options = (config.options as any[]) || [];
      const question = config.question as string;
      const isCards = type === "cards_choice" || config.displayStyle === "cards" || options.some((o) => o.image);

      return (
        <div className="w-full space-y-3 my-2 transition-all">
          {question && <p className="font-semibold text-base text-center mb-2">{question}</p>}

          {isCards ? (
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt) => {
                const isSel = selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isEditor}
                    onClick={() => onOptionSelect?.(opt.id, opt.destination)}
                    style={{
                      borderRadius: borderStyle.borderRadius,
                      borderColor: isSel ? primaryColor : "rgba(100,116,139,0.3)",
                      backgroundColor: isSel ? `${primaryColor}15` : "transparent",
                    }}
                    className={cn(
                      "flex flex-col items-center p-2.5 border-2 text-center transition-all hover:border-primary/60 active:scale-[0.98] h-full",
                      isEditor && "pointer-events-none"
                    )}
                  >
                    {opt.image ? (
                      <img src={opt.image} alt={opt.text} className="w-full h-24 object-cover rounded-md mb-2" />
                    ) : (
                      <div className="w-full h-24 bg-muted/30 rounded-md flex items-center justify-center mb-2 text-xs opacity-50">
                        Sem Foto
                      </div>
                    )}
                    <span className="text-xs font-semibold mt-auto truncate max-w-full">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {options.map((opt) => {
                const isSel = selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isEditor}
                    onClick={() => onOptionSelect?.(opt.id, opt.destination)}
                    style={{
                      borderRadius: borderStyle.borderRadius,
                      borderColor: isSel ? primaryColor : "rgba(100,116,139,0.3)",
                      backgroundColor: isSel ? `${primaryColor}15` : "transparent",
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 border-2 text-left text-sm font-medium transition-all hover:border-primary/60 active:scale-[0.99]",
                      isEditor && "pointer-events-none"
                    )}
                  >
                    <span
                      style={{
                        borderColor: isSel ? primaryColor : "currentColor",
                        color: isSel ? primaryColor : "currentColor",
                      }}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0"
                    >
                      {opt.value || "•"}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {isSel && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />}
                  </button>
                );
              })}
            </div>
          )}

          {hasError && <p className="text-xs text-red-500 font-medium text-center">{validationError}</p>}
        </div>
      );
    }

    // ─── Input Fields (Name, Email, Phone, CPF, etc.) ─────────────────────────
    if (type.startsWith("field_")) {
      const isTextarea = type === "field_textarea";
      const isSlider = type === "field_height" || type === "field_weight" || type === "scale_slider";
      const label = (config.label as string) || "Campo";
      const placeholder = (config.placeholder as string) || "";

      if (isSlider) {
        const min = (config.min as number) ?? 0;
        const max = (config.max as number) ?? 100;
        const unit = (config.unit as string) || "";
        const val = formValue ? Number(formValue) : (config.defaultValue as number) ?? 50;

        return (
          <div className="w-full space-y-2 py-2 transition-all">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>{label}</span>
              <span style={{ color: primaryColor }} className="text-base font-bold">
                {val} {unit}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              disabled={isEditor}
              value={val}
              onChange={(e) => onFormChange?.(e.target.value)}
              className={cn(
                "w-full accent-indigo-600 cursor-pointer h-2 bg-muted rounded-lg",
                isEditor && "pointer-events-none"
              )}
            />
          </div>
        );
      }

      const inputInputStyle = {
        borderRadius: borderStyle.borderRadius,
        borderColor: hasError ? "#ef4444" : "rgba(100,116,139,0.3)",
      };

      return (
        <div className="w-full space-y-1.5 my-2 text-left transition-all">
          <label className="text-xs font-semibold text-foreground/80">{label}</label>
          {isTextarea ? (
            <textarea
              disabled={isEditor}
              placeholder={placeholder}
              value={formValue}
              onChange={(e) => onFormChange?.(e.target.value)}
              style={inputInputStyle}
              className={cn(
                "w-full px-3.5 py-2.5 border-2 text-sm bg-transparent outline-none focus:border-primary transition-colors min-h-[90px]",
                isEditor && "pointer-events-none"
              )}
            />
          ) : (
            <input
              type={type === "field_email" ? "email" : type === "field_phone" ? "tel" : "text"}
              disabled={isEditor}
              placeholder={placeholder}
              value={formValue}
              onChange={(e) => {
                let val = e.target.value;
                if (type === "field_phone") {
                  const mask = (config.mask as string) || "(99) 99999-9999";
                  val = formatPhone(val, mask);
                }
                onFormChange?.(val);
              }}
              style={inputInputStyle}
              className={cn(
                "w-full px-3.5 py-2.5 border-2 text-sm bg-transparent outline-none focus:border-primary transition-colors",
                isEditor && "pointer-events-none"
              )}
            />
          )}
          {hasError && <p className="text-xs text-red-500 font-medium">{validationError}</p>}
        </div>
      );
    }

    // ─── Result Cards ────────────────────────────────────────────────────────
    if (type.startsWith("result_")) {
      const title = (config.title as string) || "Resultado da Sua Avaliação";
      const description = (config.description as string) || "Sua qualificação foi concluída com sucesso!";

      return (
        <div
          style={{ borderRadius: borderStyle.borderRadius, borderColor: primaryColor }}
          className="w-full p-6 text-center space-y-4 border-2 bg-primary/5 my-3 shadow-sm transition-all"
        >
          <div className="flex justify-center">
            <Award className="w-12 h-12" style={{ color: primaryColor }} />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-sm opacity-80 max-w-md mx-auto">{description}</p>
          <button
            type="button"
            disabled={isEditor}
            style={{ backgroundColor: primaryColor, borderRadius: borderStyle.borderRadius }}
            className={cn(
              "w-full py-3 px-6 text-white font-semibold text-sm shadow-md hover:opacity-90 transition-opacity",
              isEditor && "pointer-events-none"
            )}
          >
            {(config.ctaText as string) || "Falar no WhatsApp"}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative group/comp w-full transition-all",
        isEditor && "cursor-pointer rounded-lg p-0.5 hover:ring-2 hover:ring-indigo-400/50",
        isEditor && isSelected && "ring-2 ring-indigo-600 shadow-sm"
      )}
    >
      {/* Action Toolbar on Component Hover/Select (Mover, Duplicar, Excluir) */}
      {isEditor && isSelected && (
        <div className="absolute top-1 right-1 z-50 flex items-center bg-card border border-indigo-300 shadow-md rounded-md px-1.5 py-0.5 text-xs gap-1 select-none animate-in fade-in zoom-in-95 duration-150">
          {/* 1. Mover (Reordenar) */}
          <div className="flex items-center border-r border-border pr-1 gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.(component.id);
              }}
              className="p-1 hover:bg-indigo-50 rounded text-slate-600 hover:text-indigo-600 transition-colors"
              title="Mover para Cima"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.(component.id);
              }}
              className="p-1 hover:bg-indigo-50 rounded text-slate-600 hover:text-indigo-600 transition-colors"
              title="Mover para Baixo"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Duplicar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateComponent?.(component.id);
            }}
            className="p-1 hover:bg-indigo-50 rounded text-indigo-600 transition-colors flex items-center gap-1 font-medium text-[11px]"
            title="Duplicar Elemento"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* 3. Excluir */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteComponent?.(component.id);
            }}
            className="p-1 hover:bg-rose-50 rounded text-rose-600 transition-colors flex items-center gap-1 font-medium text-[11px]"
            title="Excluir Elemento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {renderComponentBody()}
    </div>
  );
};
