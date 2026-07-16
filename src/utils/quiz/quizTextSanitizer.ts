// src/utils/quiz/quizTextSanitizer.ts

export type TextBlockStyle = "heading_1" | "heading_2" | "heading_3" | "paragraph";
export type TextSize = "small" | "normal" | "large";

export interface RichTextComponentConfig {
  content: string;
  defaultBlockStyle?: TextBlockStyle;
  defaultTextSize?: TextSize;
  alignment?: "left" | "center" | "right";
  textColor?: string;
  backgroundColor?: string;
  width?: string;
  maxWidth?: string;
  marginTop?: number;
  marginBottom?: number;
  showOnMobile?: boolean;
  showOnTablet?: boolean;
  showOnDesktop?: boolean;
}

const ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "p",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "a",
  "ul",
  "ol",
  "li",
  "span",
  "mark",
  "br",
  "div",
]);

/**
 * Sanitizes HTML input for secure rendering in public and preview views.
 * Strips script tags, iframe, event handlers (on*), javascript: URIs, and dangerous attributes.
 */
export function sanitizeQuizHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml) return "";

  // 1. Quick pre-filter for script/iframe tags
  let cleaned = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // 2. Browser DOMParser based sanitization (or fallback regex filter)
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, "text/html");

      const cleanNode = (node: Node) => {
        const children = Array.from(node.childNodes);
        children.forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            const tagName = el.tagName.toLowerCase();

            if (!ALLOWED_TAGS.has(tagName)) {
              // Replace disallowed tag with its text or child nodes
              const fragment = doc.createDocumentFragment();
              while (el.firstChild) {
                fragment.appendChild(el.firstChild);
              }
              el.parentNode?.replaceChild(fragment, el);
              return;
            }

            // Clean attributes
            const attrs = Array.from(el.attributes);
            attrs.forEach((attr) => {
              const attrName = attr.name.toLowerCase();
              const attrVal = attr.value.toLowerCase().trim();

              if (attrName.startsWith("on")) {
                el.removeAttribute(attr.name);
              } else if (attrName === "href" || attrName === "src") {
                if (attrVal.startsWith("javascript:") || attrVal.startsWith("data:text/html")) {
                  el.removeAttribute(attr.name);
                } else if (tagName === "a") {
                  el.setAttribute("rel", "noopener noreferrer");
                  el.setAttribute("target", "_blank");
                }
              } else if (attrName !== "style" && attrName !== "class" && attrName !== "target" && attrName !== "rel") {
                el.removeAttribute(attr.name);
              }
            });

            // Recurse into children
            cleanNode(el);
          }
        });
      };

      cleanNode(doc.body);
      return doc.body.innerHTML;
    } catch (e) {
      console.warn("DOMParser sanitization fallback used", e);
    }
  }

  // Basic regex fallback
  return cleaned
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "#");
}

/**
 * Normalizes legacy component configurations ('text', 'heading', 'title', 'paragraph')
 * into the unified 'rich_text' configuration structure.
 */
export function normalizeLegacyTextConfig(
  componentType: string,
  config: Record<string, unknown> = {}
): RichTextComponentConfig {
  let rawContent = (config.content as string) || "";

  // If content is missing, generate appropriate default
  if (!rawContent) {
    if (componentType === "heading") {
      rawContent = "<h2>Título em Destaque</h2>";
    } else {
      rawContent = "<p>Digite seu texto...</p>";
    }
  }

  // Wrap plain text in tags if not HTML
  if (!rawContent.trim().startsWith("<")) {
    if (componentType === "heading") {
      rawContent = `<h2>${rawContent}</h2>`;
    } else {
      rawContent = `<p>${rawContent}</p>`;
    }
  }

  const alignment = (config.align as any) || (config.alignment as any) || "center";
  const defaultBlockStyle: TextBlockStyle = componentType === "heading" ? "heading_2" : "paragraph";
  const defaultTextSize: TextSize = componentType === "heading" ? "large" : "normal";

  return {
    content: sanitizeQuizHtml(rawContent),
    defaultBlockStyle,
    defaultTextSize,
    alignment,
    textColor: (config.color as string) || undefined,
    width: (config.width as string) || "100%",
    showOnMobile: config.showOnMobile !== false,
    showOnTablet: config.showOnTablet !== false,
    showOnDesktop: config.showOnDesktop !== false,
  };
}

export const TEXT_COLOR_PRESETS = [
  { label: "Automático", value: null },
  { label: "Preto", value: "#111827" },
  { label: "Cinza Escuro", value: "#374151" },
  { label: "Cinza", value: "#6B7280" },
  { label: "Branco", value: "#FFFFFF" },
  { label: "Vermelho", value: "#DC2626" },
  { label: "Laranja", value: "#EA580C" },
  { label: "Amarelo", value: "#CA8A04" },
  { label: "Verde", value: "#16A34A" },
  { label: "Azul", value: "#2563EB" },
  { label: "Roxo", value: "#7C3AED" },
];

export const HIGHLIGHT_COLOR_PRESETS = [
  { label: "Sem Fundo", value: null },
  { label: "Amarelo Soft", value: "#FEF08A" },
  { label: "Verde Soft", value: "#BBF7D0" },
  { label: "Azul Soft", value: "#BFDBFE" },
  { label: "Rosa Soft", value: "#FBCFE8" },
  { label: "Laranja Soft", value: "#FFEDD5" },
  { label: "Roxo Soft", value: "#DDD6FE" },
  { label: "Cinza Claro", value: "#F3F4F6" },
  { label: "Escuro", value: "#1F2937" },
];
