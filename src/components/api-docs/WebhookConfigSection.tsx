import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useWebhookConfigs } from "@/hooks/useWebhookConfigs";
import { webhookCategories } from "@/data/webhook-categories";
import { 
  Webhook, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Play, 
  Save,
  RotateCcw,
  Phone,
  MessageSquare,
  Server,
  Users,
  Contact,
  MessagesSquare,
  User,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const categoryIcons: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4 text-primary" />,
  instance: <Server className="h-4 w-4 text-primary" />,
  groups: <Users className="h-4 w-4 text-primary" />,
  calls: <Phone className="h-4 w-4 text-primary" />,
  contacts: <Contact className="h-4 w-4 text-primary" />,
  chat: <MessagesSquare className="h-4 w-4 text-primary" />,
  profile: <User className="h-4 w-4 text-primary" />,
  webhooks: <Webhook className="h-4 w-4 text-primary" />,
  utilities: <Wrench className="h-4 w-4 text-primary" />,
};

export function WebhookConfigSection() {
  const { toast } = useToast();
  const { configs, isLoading, upsertConfig, deleteConfig, testWebhook, getConfigForCategory, getDynamicUrl } = useWebhookConfigs();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleUrlChange = (categoryId: string, url: string) => {
    setLocalUrls(prev => ({ ...prev, [categoryId]: url }));
  };

  const getDisplayUrl = (categoryId: string) => {
    if (localUrls[categoryId] !== undefined) {
      return localUrls[categoryId];
    }
    const config = getConfigForCategory(categoryId);
    return config?.url || "";
  };

  const handleSave = async (categoryId: string) => {
    const url = getDisplayUrl(categoryId);
    await upsertConfig.mutateAsync({ category: categoryId, url, is_active: true });
    setLocalUrls(prev => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const handleToggleActive = async (categoryId: string, isActive: boolean) => {
    const url = getDisplayUrl(categoryId);
    await upsertConfig.mutateAsync({ category: categoryId, url, is_active: isActive });
  };

  const handleReset = async (categoryId: string) => {
    await deleteConfig.mutateAsync(categoryId);
    setLocalUrls(prev => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const handleTest = async (categoryId: string) => {
    const url = getDisplayUrl(categoryId);
    if (!url) {
      toast({
        title: "URL vazia",
        description: "Configure uma URL antes de testar.",
        variant: "destructive",
      });
      return;
    }
    await testWebhook(url);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copiado!", description: "URL copiada para a área de transferência." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Configurar Webhooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Configure URLs de webhook para receber notificações em tempo real sobre eventos do sistema.
          Cada categoria agrupa eventos relacionados.
        </p>

        <div className="space-y-3">
          {webhookCategories.map((category) => {
            const config = getConfigForCategory(category.id);
            const isExpanded = expandedCategories.includes(category.id);
            const isActive = config?.is_active ?? false;
            const hasUrl = !!getDisplayUrl(category.id);

            return (
              <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                <div className="border border-border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            {categoryIcons[category.id]}
                            <span className="font-medium text-foreground">{category.name}</span>
                            {hasUrl && (
                              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                {isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => handleToggleActive(category.id, checked)}
                          disabled={!hasUrl}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-4 space-y-4 border-t border-border bg-background">
                      {/* Your Webhook URL */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Sua URL de Webhook</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://your-server.com/webhook"
                            value={getDisplayUrl(category.id)}
                            onChange={(e) => handleUrlChange(category.id, e.target.value)}
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleTest(category.id)}
                            title="Testar conexão"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleSave(category.id)}
                            disabled={upsertConfig.isPending}
                            title="Salvar"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Dynamic URL to send events */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          URL da API (para enviar eventos)
                        </Label>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                          <code className="flex-1 font-mono text-xs text-primary truncate">
                            {getDynamicUrl(category.id)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(getDynamicUrl(category.id), `api-${category.id}`)}
                          >
                            {copiedId === `api-${category.id}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Available Events */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Eventos Disponíveis</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {category.actions.map((action) => (
                            <div
                              key={action.id}
                              className="flex items-start gap-2 p-2 bg-muted/30 rounded border border-border"
                            >
                              <code className="font-mono text-xs text-primary">{action.name}</code>
                              <span className="text-xs text-muted-foreground flex-1">{action.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reset button */}
                      {config && (
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReset(category.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar Padrões
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
