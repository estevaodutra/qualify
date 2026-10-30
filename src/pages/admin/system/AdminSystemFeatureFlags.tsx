import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Flag, Save, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

const defaultFlags: FeatureFlag[] = [
  {
    key: "ff_ai_autonomous_dispatch",
    name: "Disparo Autônomo com IA",
    description: "Permite que Skills de IA iniciem despachos diretos para o WhatsApp sem revisão humana.",
    enabled: true,
  },
  {
    key: "ff_criafy_multi_publish",
    name: "Multi-Publicação Simultânea Criafy",
    description: "Habilita a postagem sincronizada de Reels em múltiplas contas do Instagram simultaneamente.",
    enabled: true,
  },
  {
    key: "ff_advanced_analytics_v2",
    name: "Painel de Analytics Avançado v2",
    description: "Ativa relatórios com predição de conversão e latência média de resposta nos funis.",
    enabled: false,
  },
  {
    key: "ff_anti_spam_heuristic",
    name: "Heurística Reforçada Anti-Bloqueio",
    description: "Aplica variações semânticas nas mensagens enviadas em massa para reduzir taxa de report.",
    enabled: true,
  },
];

export default function AdminSystemFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = defaultFlags, isLoading } = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data } = await sb
        .from("platform_settings")
        .select("key, value, description")
        .like("key", "ff_%");

      if (!data || data.length === 0) return defaultFlags;

      const map = new Map<string, any>(data.map((d: any) => [d.key, d]));
      return defaultFlags.map((df) => {
        const stored = map.get(df.key);
        return {
          ...df,
          enabled: stored?.value?.enabled !== undefined ? stored.value.enabled : df.enabled,
        };
      });
    },
  });

  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});

  const toggleFlag = async (key: string, current: boolean) => {
    const nextVal = !current;
    setLocalFlags((prev) => ({ ...prev, [key]: nextVal }));

    try {
      const sb = supabase as any;
      await sb.from("platform_settings").upsert({
        key,
        value: { enabled: nextVal },
        description: flags.find((f) => f.key === key)?.description,
        updated_at: new Date().toISOString(),
      });
      toast.success(`Feature Flag atualizada com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar Feature Flag.");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Feature Flags</h1>
            <Badge variant="outline" className="text-xs">
              Mecanismo Nativo (platform_settings)
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controle de ativação granular de funcionalidades experimentais e regras da plataforma em tempo real.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {flags.map((flag) => {
          const isEnabled = localFlags[flag.key] !== undefined ? localFlags[flag.key] : flag.enabled;

          return (
            <Card key={flag.key} className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-semibold">{flag.name}</CardTitle>
                      <Badge variant={isEnabled ? "default" : "secondary"} className="text-[10px]">
                        {isEnabled ? "Ativa" : "Desativada"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{flag.description}</CardDescription>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleFlag(flag.key, isEnabled)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <span className="font-mono text-[10px] text-muted-foreground">Chave: {flag.key}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
