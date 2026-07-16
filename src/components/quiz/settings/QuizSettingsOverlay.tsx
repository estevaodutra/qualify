// src/components/quiz/settings/QuizSettingsOverlay.tsx
import React, { useState } from "react";
import {
  X,
  Palette,
  Sparkles,
  Sliders,
  Share2,
  Activity,
  Code2,
  Globe,
  Webhook,
  ShieldCheck,
  Save,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuizDesignConfig } from "@/types/quiz";
import { ImageUploader } from "../media/ImageUploader";

interface CodeEditorTextareaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const CodeEditorTextarea: React.FC<CodeEditorTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder = "Digite seu script...",
}) => {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</Label>
      <div className="border border-border rounded-lg overflow-hidden bg-slate-950 font-mono text-xs flex flex-col shadow-xs">
        <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-slate-400 text-[10px]">
          <span>{label} Scripts</span>
          <span className="opacity-60">HTML / JS</span>
        </div>
        <div className="flex flex-1 min-h-[120px] relative">
          {/* Line number gutter */}
          <div className="w-9 bg-slate-900 border-r border-slate-800 text-slate-600 text-right pr-2.5 py-3 select-none leading-relaxed text-[10px]">
            {Array.from({ length: Math.max(6, value.split("\n").length) }).map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>
          {/* Actual textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-slate-100 p-3 outline-none resize-y border-0 focus:ring-0 leading-relaxed min-h-[120px] text-xs"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection =
  | "branding"
  | "appearance"
  | "progress"
  | "seo"
  | "pixels"
  | "domain"
  | "integrations"
  | "advanced";

const SECTIONS: { id: SettingsSection; label: string; icon: any; desc: string }[] = [
  { id: "branding", label: "Identidade Visual", icon: Sparkles, desc: "Logotipos, favicon e alinhamento de marca" },
  { id: "appearance", label: "Aparência & Cor Base", icon: Palette, desc: "Cor principal, fundo, cartões e tipografia" },
  { id: "progress", label: "Barra de Progresso", icon: Sliders, desc: "Estilos, vínculo com cor base e posições" },
  { id: "seo", label: "SEO & Compartilhamento", icon: Share2, desc: "Meta tags, título, descrição e social preview" },
  { id: "pixels", label: "Pixels & Scripts", icon: Code2, desc: "Configuração de Meta Pixel, Google Analytics, GTM e scripts customizados" },
  { id: "domain", label: "Domínio & Publicação", icon: Globe, desc: "Slug público, status e segurança" },
  { id: "integrations", label: "Integrações & Webhooks", icon: Webhook, desc: "Endpoints Webhook, tokens e gatilhos CRM" },
  { id: "advanced", label: "Configurações Avançadas", icon: ShieldCheck, desc: "Sessão, anti-spam, idioma e restauração" },
];

export const QuizSettingsOverlay: React.FC<SettingsOverlayProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>("branding");

  const funnel = useQuizBuilderStore((s) => s.funnel);
  const setFunnel = useQuizBuilderStore((s) => s.setFunnel);
  const designConfig = useQuizBuilderStore((s) => s.designConfig);
  const setDesignConfig = useQuizBuilderStore((s) => s.setDesignConfig);

  const [saving, setSaving] = useState(false);

  // Local state for settings form
  const [design, setDesign] = useState<QuizDesignConfig>(
    designConfig || ({} as QuizDesignConfig)
  );

  const [seo, setSeo] = useState<Record<string, string>>(
    (funnel?.seoConfig as Record<string, string>) || {}
  );

  const [pixel, setPixel] = useState<Record<string, string>>(
    (funnel?.pixelConfig as Record<string, string>) || {}
  );

  const [webhook, setWebhook] = useState<Record<string, string>>(
    (funnel?.webhookConfig as Record<string, string>) || {}
  );

  const [slug, setSlug] = useState(funnel?.slug || "");

  // Base Color Picker binding
  const handlePrimaryColorChange = (hex: string) => {
    const updated = {
      ...design,
      primaryColor: hex,
      progress: {
        ...(design.progress || {}),
        color: hex,
      },
    };
    setDesign(updated);
    setDesignConfig(updated);
  };

  const handleSaveAll = async () => {
    if (!funnel) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("quiz_funnels")
        .update({
          slug,
          design_config: design,
          seo_config: seo,
          pixel_config: pixel,
          webhook_config: webhook,
          updated_at: new Date().toISOString(),
        })
        .eq("id", funnel.id);

      if (error) throw error;

      setDesignConfig(design);
      setFunnel({
        ...funnel,
        slug,
        designConfig: design,
        seoConfig: seo as any,
        pixelConfig: pixel as any,
        webhookConfig: webhook as any,
      });

      toast({ title: "Configurações salvas com sucesso!" });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">Configurações do Quiz</span>
          <span className="text-xs text-muted-foreground">({funnel?.name})</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar Alterações
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Body with Sidebar Nav */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section Selector */}
        <div className="w-64 border-r border-border bg-card p-3 space-y-1 overflow-y-auto shrink-0 select-none">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs font-medium"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-white" : "text-indigo-600"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-none">{sec.label}</p>
                  <p className={`text-[10px] truncate mt-1 ${isActive ? "text-indigo-100" : "text-muted-foreground"}`}>
                    {sec.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Active Content Panel */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
          {/* 1. IDENTIDADE VISUAL */}
          {activeSection === "branding" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Identidade Visual & Logos</h3>
                <p className="text-xs text-muted-foreground">Gerencie o logotipo principal, favicon e marcas da empresa.</p>
              </div>

              <div className="grid grid-cols-2 gap-6 border p-6 rounded-lg bg-card">
                <div className="space-y-4">
                  <ImageUploader
                    label="Logotipo Principal"
                    value={design.logo?.url || ""}
                    onChange={(url) =>
                      setDesign({
                        ...design,
                        logo: { ...(design.logo || {}), url },
                      })
                    }
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">URL da Logo (ou cole o link)</Label>
                    <Input
                      value={design.logo?.url || ""}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          logo: { ...(design.logo || {}), url: e.target.value },
                        })
                      }
                      placeholder="https://exemplo.com/logo.png"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Largura da Logo no Cabeçalho</Label>
                    <Input
                      value={design.logo?.width || "140px"}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          logo: { ...(design.logo || {}), width: e.target.value },
                        })
                      }
                      placeholder="140px"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Alinhamento da Logo</Label>
                    <select
                      value={design.logo?.alignment || "center"}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          logo: { ...(design.logo || {}), alignment: e.target.value as any },
                        })
                      }
                      className="w-full h-9 px-3 border rounded-md text-xs bg-background"
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centralizado</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. APARÊNCIA & COR BASE */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Aparência & Cor Base do Quiz</h3>
                <p className="text-xs text-muted-foreground">
                  A cor base é aplicada automaticamente em botões, destaques, bordas ativas e barra de progresso.
                </p>
              </div>

              <div className="border p-4 rounded-lg bg-card space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Cor Base do Quiz (Primary Color)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={design.primaryColor || "#6366f1"}
                      onChange={(e) => handlePrimaryColorChange(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border p-1"
                    />
                    <Input
                      value={design.primaryColor || "#6366f1"}
                      onChange={(e) => handlePrimaryColorChange(e.target.value)}
                      className="w-36 text-xs uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold">Cor de Fundo da Página</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={design.backgroundColor || "#ffffff"}
                      onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border p-1"
                    />
                    <Input
                      value={design.backgroundColor || "#ffffff"}
                      onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                      className="w-36 text-xs uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. BARRA DE PROGRESSO */}
          {activeSection === "progress" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Barra de Progresso</h3>
                <p className="text-xs text-muted-foreground">Personalize a exibição do progresso durante o preenchimento.</p>
              </div>

              <div className="border p-4 rounded-lg bg-card space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Estilo Visual</Label>
                  <select
                    value={design.progress?.style || "line"}
                    onChange={(e) =>
                      setDesign({
                        ...design,
                        progress: { ...(design.progress || {}), style: e.target.value as any },
                      })
                    }
                    className="w-full h-9 px-3 border rounded-md text-xs bg-background"
                  >
                    <option value="line">Linha Superior Contínua</option>
                    <option value="segmented">Linha Segmentada</option>
                    <option value="points">Pontos / Indicadores</option>
                    <option value="none">Oculta (Sem Barra)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. SEO & COMPARTILHAMENTO */}
          {activeSection === "seo" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">SEO & Compartilhamento Social</h3>
                <p className="text-xs text-muted-foreground">Configure os títulos e imagens exibidos ao compartilhar o link.</p>
              </div>

              <div className="border p-4 rounded-lg bg-card space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título da Página (Meta Title)</Label>
                  <Input
                    value={seo.title || ""}
                    onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                    placeholder="Diagnóstico Completo"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Descrição da Página (Meta Description)</Label>
                  <Textarea
                    value={seo.description || ""}
                    onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                    placeholder="Responda em 1 minuto..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Imagem de Compartilhamento (OG Image)</Label>
                  <Input
                    value={seo.ogImage || ""}
                    onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                    placeholder="https://exemplo.com/banner-social.png"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. PIXELS E SCRIPTS UNIFICADOS */}
          {activeSection === "pixels" && (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
              <div>
                <h3 className="text-lg font-bold">Pixels & Scripts</h3>
                <p className="text-xs text-muted-foreground">Configuração de códigos de rastreamento e injeção de scripts personalizados.</p>
              </div>

              {/* Attention Panel */}
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 rounded-lg text-xs space-y-2">
                <p className="font-bold">Atenção!</p>
                <p>
                  Esta seção é dedicada à configuração global de códigos de acompanhamento e integrações, que serão ativados assim que a página for carregada. Cada plataforma possui instruções específicas, portanto, é essencial seguir os passos indicados em cada uma delas.
                </p>
                <p>
                  Para configurações em momentos específicos de navegação do usuário, utilize o campo "Script" nos componentes de botão e opções.
                </p>
              </div>

              {/* ID Inputs Grid */}
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-card">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Google Analytics ID</Label>
                  <Input
                    value={pixel.gaId || ""}
                    onChange={(e) => setPixel({ ...pixel, gaId: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Google Tag Manager ID</Label>
                  <Input
                    value={pixel.gtmId || ""}
                    onChange={(e) => setPixel({ ...pixel, gtmId: e.target.value })}
                    placeholder="GTM-XXXXXX"
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Google Site Verification</Label>
                  <Input
                    value={pixel.googleSiteVerification || ""}
                    onChange={(e) => setPixel({ ...pixel, googleSiteVerification: e.target.value })}
                    placeholder="XXXXXXXXXXXXXXXX"
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Facebook Pixel ID</Label>
                  <Input
                    value={pixel.fbPixelId || ""}
                    onChange={(e) => setPixel({ ...pixel, fbPixelId: e.target.value })}
                    placeholder="XXXXXXXXXXXXXXXX"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Code Editors */}
              <div className="space-y-4">
                <CodeEditorTextarea
                  label="Head"
                  value={pixel.headScript || ""}
                  onChange={(val) => setPixel({ ...pixel, headScript: val })}
                  placeholder="Digite seu script do Head aqui..."
                />

                <CodeEditorTextarea
                  label="Body"
                  value={pixel.bodyScript || ""}
                  onChange={(val) => setPixel({ ...pixel, bodyScript: val })}
                  placeholder="Digite seu script do Body aqui..."
                />

                <CodeEditorTextarea
                  label="Footer"
                  value={pixel.footerScript || ""}
                  onChange={(val) => setPixel({ ...pixel, footerScript: val })}
                  placeholder="Digite seu script do Footer aqui..."
                />
              </div>

              {/* Bottom Help Box */}
              <div className="bg-muted/40 border border-border p-4 rounded-lg text-center text-xs space-y-1">
                <p className="font-bold text-muted-foreground uppercase tracking-wide">Ainda precisa de ajuda?</p>
                <p>
                  Aprenda{" "}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="underline text-indigo-600 font-semibold hover:text-indigo-500"
                  >
                    "Como configurar Facebook Pixel e Scripts"
                  </a>{" "}
                  em nossa Central de Ajuda.
                </p>
              </div>
            </div>
          )}

          {/* 7. DOMÍNIO E PUBLICAÇÃO */}
          {activeSection === "domain" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Domínio & Publicação</h3>
                <p className="text-xs text-muted-foreground">Gerencie a URL pública e o slug do quiz.</p>
              </div>

              <div className="border p-4 rounded-lg bg-card space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Slug Público do Quiz</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{window.location.origin}/q/</span>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. INTEGRAÇÕES */}
          {activeSection === "integrations" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Integrações & Webhooks</h3>
                <p className="text-xs text-muted-foreground">Envie dados das respostas para n8n, Make ou Webhooks próprios.</p>
              </div>

              <div className="border p-4 rounded-lg bg-card space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">URL do Webhook Endpoint</Label>
                  <Input
                    value={webhook.url || ""}
                    onChange={(e) => setWebhook({ ...webhook, url: e.target.value })}
                    placeholder="https://seu-servidor.com/webhook"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Bearer Token de Autenticação (Opcional)</Label>
                  <Input
                    type="password"
                    value={webhook.token || ""}
                    onChange={(e) => setWebhook({ ...webhook, token: e.target.value })}
                    placeholder="Token secreto"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 9. AVANÇADO */}
          {activeSection === "advanced" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Configurações Avançadas</h3>
                <p className="text-xs text-muted-foreground">Controle de sessão, anti-spam e preferências técnicas.</p>
              </div>

              <div className="border p-4 rounded-lg bg-card space-y-4">
                <p className="text-xs text-muted-foreground">
                  Suporte a persistência de sessão e honeypot habilitados automaticamente no runtime público.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
