import { useState, useEffect } from "react";
import { useWebhookConfigs } from "@/hooks/useWebhookConfigs";
import { webhookCategories, WebhookCategory } from "@/data/webhook-categories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, HelpCircle, RotateCcw, Send, Settings, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminSettings() {
  const {
    configs,
    isLoading,
    upsertConfig,
    deleteConfig,
    testWebhook,
    getConfigForCategory,
  } = useWebhookConfigs();

  const [formState, setFormState] = useState<Record<string, { url: string; isActive: boolean }>>({});
  const [testingCategory, setTestingCategory] = useState<string | null>(null);

  // Initialize form state when configurations are loaded
  useEffect(() => {
    if (configs) {
      const state: Record<string, { url: string; isActive: boolean }> = {};
      webhookCategories.forEach((cat) => {
        const customConfig = configs.find((c) => c.category === cat.id);
        state[cat.id] = {
          url: customConfig?.url || cat.defaultUrl || "",
          isActive: customConfig?.is_active ?? true,
        };
      });
      setFormState(state);
    }
  }, [configs]);

  const handleUrlChange = (catId: string, url: string) => {
    setFormState((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        url,
      },
    }));
  };

  const handleActiveToggle = (catId: string, isActive: boolean) => {
    setFormState((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        isActive,
      },
    }));
  };

  const handleSave = async (catId: string) => {
    const state = formState[catId];
    if (!state) return;

    await upsertConfig.mutateAsync({
      category: catId,
      url: state.url,
      is_active: state.isActive,
    });
  };

  const handleReset = async (catId: string) => {
    await deleteConfig.mutateAsync(catId);
    const cat = webhookCategories.find((c) => c.id === catId);
    setFormState((prev) => ({
      ...prev,
      [catId]: {
        url: cat?.defaultUrl || "",
        isActive: true,
      },
    }));
  };

  const handleTest = async (catId: string) => {
    const urlToTest = formState[catId]?.url || webhookCategories.find((c) => c.id === catId)?.defaultUrl;
    if (!urlToTest) return;

    setTestingCategory(catId);
    await testWebhook(urlToTest);
    setTestingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações Globais</h1>
          <p className="text-muted-foreground">Carregando destinos de requisição...</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações Globais</h1>
        <p className="text-muted-foreground">
          Gerencie os destinos de webhooks e rotas de requisição para cada categoria de evento da plataforma.
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-800 dark:text-amber-300">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Informação Importante</h4>
          <p className="text-xs mt-1 leading-relaxed">
            As requisições da plataforma que integram com o n8n serão enviadas para os webhooks configurados abaixo.
            Caso nenhum webhook customizado esteja preenchido ou ativo, a plataforma utilizará as rotas padrão da VPS.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {webhookCategories.map((category) => {
          const customConfig = getConfigForCategory(category.id);
          const state = formState[category.id] || { url: "", isActive: true };
          const isCustomized = !!customConfig;

          return (
            <Card key={category.id} className="overflow-hidden border-muted/80 shadow-sm">
              <CardHeader className="bg-muted/15 pb-4 border-b border-muted/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      {category.name}
                      {isCustomized && (
                        <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          Customizado
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{category.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`active-${category.id}`}
                        checked={state.isActive}
                        onCheckedChange={(val) => handleActiveToggle(category.id, val)}
                      />
                      <Label htmlFor={`active-${category.id}`} className="text-xs font-semibold cursor-pointer">
                        {state.isActive ? "Ativo" : "Inativo"}
                      </Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`url-${category.id}`} className="text-sm font-semibold">
                      URL do Webhook
                    </Label>
                    {category.defaultUrl && (
                      <span className="text-[11px] text-muted-foreground">
                        Padrão: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{category.defaultUrl}</code>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id={`url-${category.id}`}
                      placeholder={category.defaultUrl || "Digite a URL do webhook customizado"}
                      value={state.url}
                      onChange={(e) => handleUrlChange(category.id, e.target.value)}
                      className="pr-10"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            Defina uma URL completa iniciada com http:// ou https:// para interceptar os eventos dessa categoria.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {category.actions && category.actions.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {category.actions.some(a => a.type === "request") && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          {"Ações enviadas no payload (Z-API -> Webhook):"}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {category.actions.filter(a => a.type === "request").map((act) => (
                            <span
                              key={act.id}
                              className="text-[10px] bg-[#8A3CFF]/10 text-[#8A3CFF] dark:text-[#A770FF] px-2 py-0.5 rounded-md font-mono border border-[#8A3CFF]/20"
                              title={act.description}
                            >
                              {act.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {category.actions.some(a => a.type === "event") && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          {"Eventos recebidos (Webhook -> Qualify):"}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {category.actions.filter(a => a.type === "event").map((act) => (
                            <span
                              key={act.id}
                              className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-mono border border-emerald-500/20"
                              title={act.description}
                            >
                              {act.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-muted/30">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(category.id)}
                      disabled={testingCategory === category.id}
                      className="text-xs"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {testingCategory === category.id ? "Testando..." : "Testar Conexão"}
                    </Button>
                    {isCustomized && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(category.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Resetar Padrão
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSave(category.id)}
                    disabled={
                      upsertConfig.isPending ||
                      (state.url === (customConfig?.url || "") && state.isActive === (customConfig?.is_active ?? true))
                    }
                    className="text-xs"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
