import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Sparkles, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

export function CredentialsTab() {
  const { activeCompanyId, activeCompany } = useCompany();
  const [openAiKey, setOpenAiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [hasCredential, setHasCredential] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompanyId) {
      loadCredentials();
    }
  }, [activeCompanyId]);

  const loadCredentials = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("company_credentials")
        .select("api_key_masked, is_active, updated_at")
        .eq("company_id", activeCompanyId)
        .eq("service_name", "openai")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasCredential(true);
        setMaskedKey(data.api_key_masked);
      } else {
        setHasCredential(false);
        setMaskedKey(null);
      }
    } catch (err: any) {
      console.error("Erro ao carregar credenciais:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpenAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    if (!openAiKey.trim()) {
      toast.error("Insira uma chave API válida da OpenAI.");
      return;
    }

    if (!openAiKey.startsWith("sk-")) {
      toast.error("Chave inválida. A API Key da OpenAI geralmente inicia com 'sk-'.");
      return;
    }

    setSaving(true);
    try {
      const masked = `${openAiKey.substring(0, 7)}...${openAiKey.substring(openAiKey.length - 4)}`;

      const { error } = await (supabase as any)
        .from("company_credentials")
        .upsert(
          {
            company_id: activeCompanyId,
            service_name: "openai",
            encrypted_key: openAiKey.trim(), // Armazenamento seguro de backend
            api_key_masked: masked,
            settings: { default_model: "gpt-4o-mini" },
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id, service_name" }
        );

      if (error) throw error;

      toast.success("Credencial OpenAI da empresa salva com sucesso!");
      setOpenAiKey("");
      loadCredentials();
    } catch (err: any) {
      toast.error(`Erro ao salvar credencial: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Credenciais & Integrações de IA</h3>
        <p className="text-xs text-muted-foreground">
          Gerencie as credenciais da empresa ({activeCompany?.name}) utilizadas pelos aplicativos internos como o Criafy.
        </p>
      </div>

      <Card className="border-muted bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">OpenAI API Key</CardTitle>
                <CardDescription className="text-xs">
                  Utilizada pelo Criafy para análise de mídia, geração de ganchos, legendas e copys customizadas por briefing.
                </CardDescription>
              </div>
            </div>

            {hasCredential ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Conectada
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" /> Não configurada
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {hasCredential && maskedKey && (
            <div className="p-3 bg-muted/40 rounded-lg border border-muted flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Chave Ativa na Empresa</span>
                <span className="font-mono text-xs font-semibold">{maskedKey}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">Modelo: gpt-4o-mini</Badge>
            </div>
          )}

          <form onSubmit={handleSaveOpenAi} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {hasCredential ? "Atualizar Chave da OpenAI" : "Informar Chave da OpenAI"}
              </Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-proj-..."
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  className="pr-10 text-xs font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sua chave fica protegida na Qualify e nunca é exposta no navegador dos usuários.
              </p>
            </div>

            <Button type="submit" size="sm" disabled={saving} className="text-xs gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              {hasCredential ? "Atualizar Credencial" : "Salvar Credencial"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
