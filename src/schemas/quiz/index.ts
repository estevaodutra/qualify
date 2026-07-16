// src/schemas/quiz/index.ts
import { z } from "zod";

export const DeviceConfigSchema = z.object({
  hideOnMobile: z.boolean().optional(),
  hideOnTablet: z.boolean().optional(),
  hideOnDesktop: z.boolean().optional(),
  customWidthMobile: z.string().optional(),
  customWidthDesktop: z.string().optional(),
  customMarginMobile: z.string().optional(),
  customPaddingMobile: z.string().optional(),
});

export const ConditionRuleSchema = z.object({
  id: z.string(),
  fieldId: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
    "in",
    "score_greater",
    "score_less",
  ]),
  value: z.string(),
});

export const ConditionActionSchema = z.object({
  id: z.string(),
  action: z.enum([
    "show",
    "hide",
    "go_to_step",
    "add_score",
    "set_variable",
    "finish",
    "redirect",
  ]),
  target: z.string().optional(),
  value: z.any().optional(),
});

export const ComponentConditionGroupSchema = z.object({
  id: z.string(),
  match: z.enum(["ALL", "ANY"]),
  rules: z.array(ConditionRuleSchema),
  actions: z.array(ConditionActionSchema).optional(),
});

// Component Specific Config Schemas
export const TextComponentSchema = z.object({
  content: z.string().default("<p>Texto informativo</p>"),
  align: z.enum(["left", "center", "right"]).default("center"),
  fontSize: z.number().optional(),
  color: z.string().optional(),
});

export const ImageComponentSchema = z.object({
  url: z.string().default(""),
  alt: z.string().default(""),
  width: z.string().default("100%"),
  maxWidth: z.string().default("100%"),
  aspectRatio: z.string().default("auto"),
  objectFit: z.enum(["contain", "cover", "fill", "none"]).default("cover"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  borderRadius: z.string().default("inherit"),
  caption: z.string().optional(),
  linkUrl: z.string().optional(),
});

export const VideoComponentSchema = z.object({
  url: z.string().default(""),
  provider: z.enum(["youtube", "vimeo", "wistia", "custom"]).default("youtube"),
  autoPlay: z.boolean().default(false),
  controls: z.boolean().default(true),
  aspectRatio: z.string().default("16:9"),
});

export const ButtonComponentSchema = z.object({
  text: z.string().default("Próxima Etapa"),
  style: z.enum(["primary", "secondary", "outline", "ghost"]).default("primary"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  width: z.string().default("100%"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  animated: z.boolean().default(true),
  iconName: z.string().optional(),
  destination: z.string().nullable().default(null),
  actionType: z.enum(["next_step", "goto_step", "submit", "redirect", "whatsapp"]).default("next_step"),
  redirectUrl: z.string().optional(),
});

export const OptionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  value: z.string(),
  points: z.number().default(0),
  destination: z.string().nullable().default(null),
  image: z.string().nullable().default(null),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export const OptionsComponentSchema = z.object({
  question: z.string().default("Selecione uma opção:"),
  required: z.boolean().default(true),
  multiple: z.boolean().default(false),
  autoAdvance: z.boolean().default(true),
  displayStyle: z.enum(["list", "grid", "cards", "images"]).default("list"),
  columns: z.number().default(1),
  options: z.array(OptionItemSchema).default([]),
  variableName: z.string().optional(),
});

export const InputFieldSchema = z.object({
  label: z.string().default("Campo"),
  placeholder: z.string().default(""),
  required: z.boolean().default(false),
  variableName: z.string().default("field"),
  mask: z.string().optional(),
  helpText: z.string().optional(),
  defaultValue: z.string().optional(),
  width: z.string().default("100%"),
});

export const SliderFieldSchema = z.object({
  label: z.string().default("Medida"),
  required: z.boolean().default(false),
  unit: z.string().default(""),
  defaultValue: z.number().default(50),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  variableName: z.string().default("slider_value"),
});

export const ResultCardSchema = z.object({
  title: z.string().default("Parabéns!"),
  description: z.string().default("Aqui está o resultado da sua qualificação."),
  showScore: z.boolean().default(true),
  showBadge: z.boolean().default(true),
  badgeText: z.string().default("Perfil Aprovado"),
  ctaText: z.string().default("Falar com Consultor no WhatsApp"),
  ctaAction: z.enum(["whatsapp", "redirect", "custom"]).default("whatsapp"),
  whatsappMessage: z.string().default("Olá! Concluí o quiz e gostaria de atendimento."),
});

// Global Design Config Schema
export const QuizDesignConfigSchema = z.object({
  primaryColor: z.string().default("#6366f1"),
  secondaryColor: z.string().default("#4f46e5"),
  accentColor: z.string().default("#10b981"),

  backgroundType: z.enum(["solid", "gradient", "image"]).default("solid"),
  backgroundColor: z.string().default("#ffffff"),
  backgroundGradient: z.string().optional(),
  backgroundImageUrl: z.string().optional(),

  textColor: z.string().default("#1e293b"),
  headingColor: z.string().default("#0f172a"),
  mutedTextColor: z.string().default("#64748b"),
  successColor: z.string().default("#10b981"),
  warningColor: z.string().default("#f59e0b"),
  errorColor: z.string().default("#ef4444"),

  fontFamily: z.string().default("Inter"),
  baseFontSize: z.number().default(16),
  headingScale: z.number().default(1.25),
  lineHeight: z.number().default(1.5),

  pageMaxWidth: z.number().default(640),
  contentMaxWidth: z.number().default(600),
  minHeight: z.string().default("100vh"),
  verticalAlignment: z.enum(["top", "center", "bottom"]).default("top"),

  pagePaddingDesktop: z.number().default(32),
  pagePaddingMobile: z.number().default(16),
  componentGap: z.number().default(16),

  borderRadius: z.string().default("12px"),
  inputBorderRadius: z.string().default("8px"),
  buttonBorderRadius: z.string().default("10px"),

  inputBackgroundColor: z.string().default("#ffffff"),
  inputBorderColor: z.string().default("#cbd5e1"),
  inputTextColor: z.string().default("#0f172a"),
  inputPlaceholderColor: z.string().default("#94a3b8"),
  inputFocusColor: z.string().default("#6366f1"),

  cardEnabled: z.boolean().default(true),
  cardBackgroundColor: z.string().default("#ffffff"),
  cardBorderColor: z.string().default("#e2e8f0"),
  cardShadow: z.enum(["none", "sm", "md", "lg"]).default("md"),
  cardPadding: z.number().default(24),

  logo: z.object({
    url: z.string().optional(),
    alt: z.string().optional(),
    width: z.string().default("140px"),
    alignment: z.enum(["left", "center", "right"]).default("center"),
    marginTop: z.number().default(0),
    marginBottom: z.number().default(16),
    showLogo: z.boolean().default(true),
  }).default({}),

  progress: z.object({
    style: z.enum(["line", "segmented", "points", "text", "none"]).default("line"),
    color: z.string().default("#6366f1"),
    trackColor: z.string().default("#e2e8f0"),
    height: z.number().default(6),
    position: z.enum(["top", "bottom"]).default("top"),
    showLabel: z.boolean().default(false),
  }).default({}),
});
