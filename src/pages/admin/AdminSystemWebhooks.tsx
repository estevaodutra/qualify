import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  Bell, 
  Server, 
  Globe, 
  Zap, 
  AlertTriangle,
  CreditCard,
  Building2,
  CalendarDays,
  Smartphone,
  ShieldAlert,
  Send
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/dispatch/PageHeader";

// Definição dos eventos sugeridos e aprovados
const SYSTEM_EVENTS = [
  {
    id: "instance.connected",
    name: "Instância Conectada",
    description: "Quando um número de WhatsApp é conectado com sucesso (QR Code lido).",
    icon: Smartphone,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: "instance.disconnected",
    name: "Instância Desconectada",
    description: "Quando a conexão com o WhatsApp é perdida ou desconectada.",
    icon: AlertTriangle,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    id: "instance.error",
    name: "Erro Crítico na Instância",
    description: "Quando ocorrem falhas repetidas na sincronização ou erro no provedor.",
    icon: ShieldAlert,
    color: "text-rose-600",
    bg: "bg-rose-600/10",
  },
  {
    id: "company.created",
    name: "Nova Conta Criada",
    description: "Quando um novo cliente/empresa se cadastra na plataforma.",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "wallet.low_balance",
    name: "Saldo Baixo / Esgotado",
    description: "Quando os créditos da carteira de um cliente atingem o limite mínimo ou zeram.",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: "payment.confirmed",
    name: "Pagamento Confirmado",
    description: "Quando uma recarga ou pagamento de cliente é aprovado.",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-600/10",
  },
  {
    id: "subscription.expiring",
    name: "Vencimento de Assinatura",
    description: "Quando a assinatura do plano do cliente está próxima do vencimento ou venceu.",
    icon: CalendarDays,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

export default function AdminSystemWebhooks() {
  const { toast } = useToast();
  const [globalUrl, setGlobalUrl] = useState("");
  const [events, setEvents] = useState<Record<string, { isActive: boolean; customUrl: string }>>(
    SYSTEM_EVENTS.reduce((acc, ev) => ({ ...acc, [ev.id]: { isActive: true, customUrl: "" } }), {})
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega as configurações do Supabase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "system_webhooks")
          .single();

        if (error && error.code !== "PGRST116") { // Não encontrou é ok (primeira vez)
          console.error("Erro ao carregar configurações de webhook:", error);
          return;
        }

        if (data?.value) {
          const config = data.value as { globalUrl?: string, events?: Record<string, { isActive: boolean; customUrl: string }> };
          if (config.globalUrl) setGlobalUrl(config.globalUrl);
          if (config.events) {
            setEvents(prev => ({ ...prev, ...config.events }));
          }
        }
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (currentGlobalUrl = globalUrl, currentEvents = events) => {
    setIsSaving(true);
    try {
      const payload = {
        globalUrl: currentGlobalUrl,
        events: currentEvents
      };

      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          key: "system_webhooks",
          value: payload,
          description: "Configuração de webhooks do sistema (n8n/make)"
        }, { onConflict: "key" });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As rotas de notificação do sistema foram atualizadas com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (eventId: string) => {
    const state = events[eventId];
    const url = state?.customUrl || globalUrl;
    
    if (!url) {
      toast({
        title: "Erro",
        description: "Nenhuma URL configurada para este evento.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Base payload data for all events
      const baseData = {
        user: {
          id: "usr_987654",
          name: "João Silva",
          email: "joao.silva@exemplo.com",
          phone: "5511999999999"
        },
        company: {
          id: "comp_123456",
          name: "Empresa Exemplo LTDA",
          document: "12.345.678/0001-90",
          plan: "Plano Pro"
        }
      };

      // Specific data based on event type
      let specificData = {};
      
      if (eventId.startsWith("instance.")) {
        // Try to fetch the last connection status event from the database
        const { data: lastDbEvent } = await supabase
          .from("webhook_events" as any)
          .select("instance_id, user_id, raw_event")
          .eq("event_type", "connection_status")
          .not("instance_id", "is", null)
          .order("received_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastDbEvent) {
          console.log("[AdminSystemWebhooks] Found last db event for test:", lastDbEvent);
          let instanceRow = null;
          if (lastDbEvent.instance_id) {
            const { data: inst } = await supabase
              .from("instances")
              .select("id, name, phone, provider, status")
              .eq("id", lastDbEvent.instance_id)
              .maybeSingle();
            if (inst) instanceRow = inst;
          }

          let userRow = null;
          if (lastDbEvent.user_id) {
            const { data: usr } = await supabase
              .from("profiles")
              .select("id, name, email")
              .eq("id", lastDbEvent.user_id)
              .maybeSingle();
            if (usr) userRow = usr;
          }

          specificData = {
            instance: {
              id: instanceRow?.id || lastDbEvent.instance_id || "inst_123",
              name: instanceRow?.name || "Atendimento Principal",
              phone_number: instanceRow?.phone || "5511999998888",
              status: eventId.split('.')[1],
              provider: instanceRow?.provider || "z-api"
            }
          };

          if (userRow) {
            baseData.user = {
              id: userRow.id,
              name: userRow.name || "Sem nome",
              email: userRow.email || "sem@email.com",
              phone: ""
            };
          }
        } else {
          // Default fallback
          specificData = {
            instance: {
              id: "inst_123",
              name: "Atendimento Principal",
              phone_number: "5511999998888",
              status: eventId.split('.')[1],
              action_url: `https://qualify.app/auth/magic?token=temp_abc123&redirect=/instances?id=inst_123`
            }
          };
        }

        if (eventId === "instance.error" || eventId === "instance.disconnected") {
          specificData = {
            ...specificData,
            error: {
              code: eventId === "instance.error" ? "ERR_CRITICAL" : "ERR_DISCONNECTED",
              message: "Conexão perdida com o WhatsApp",
              attempts: 3
            }
          };
        }
      } else if (eventId === "wallet.low_balance") {
        specificData = {
          wallet: {
            balance: 5.50,
            currency: "BRL",
            minimum_threshold: 10.00
          }
        };
      } else if (eventId === "payment.confirmed") {
        specificData = {
          wallet: {
            balance: 105.50,
            currency: "BRL"
          },
          payment: {
            id: "pay_999",
            amount: 100.00,
            method: "PIX",
            status: "approved"
          }
        };
      } else if (eventId === "subscription.expiring") {
        specificData = {
          subscription: {
            id: "sub_444",
            plan: "Plano Pro",
            status: "active",
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            days_remaining: 3
          }
        };
      } else if (eventId === "company.created") {
        // Query the last created company
        const { data: lastCompany } = await supabase
          .from("companies")
          .select("id, name, owner_id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastCompany) {
          baseData.company = {
            id: lastCompany.id,
            name: lastCompany.name,
            document: "",
            plan: "Plano Standard"
          };

          const { data: owner } = await supabase
            .from("profiles")
            .select("id, name, email")
            .eq("id", lastCompany.owner_id)
            .maybeSingle();

          if (owner) {
            baseData.user = {
              id: owner.id,
              name: owner.name || "Sem nome",
              email: owner.email || "sem@email.com",
              phone: ""
            };
          }
        }

        specificData = {
          source: "landing_page",
          coupon: "BEMVINDO20"
        };
      }

      const payload = {
        event: eventId,
        test: true,
        timestamp: new Date().toISOString(),
        data: {
          ...baseData,
          ...specificData,
          _test_message: `Teste simulado de ${eventId} a partir do painel Admin`
        }
      };

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      toast({
        title: "Teste enviado",
        description: `Disparando evento de teste para ${eventId} na URL ${url.substring(0, 30)}...`,
      });
    } catch (err) {
      toast({
        title: "Erro de Conexão",
        description: "Falha ao enviar o teste para a URL informada.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <PageHeader
        title="Notificações do Sistema"
        description="Configure os webhooks para receber alertas operacionais da plataforma (ideal para n8n/Make)."
      />

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-blue-800 dark:text-blue-300">
        <Server className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Integração Externa (ex: n8n)</h4>
          <p className="text-xs mt-1 leading-relaxed max-w-3xl">
            Estes webhooks são exclusivos para a administração da plataforma. Sempre que um dos eventos abaixo ocorrer no sistema, 
            um payload JSON completo será enviado para a URL configurada. Defina uma <strong>URL Global</strong> para receber tudo 
            no mesmo endpoint, ou defina <strong>URLs específicas</strong> por evento se preferir rotear de forma separada.
          </p>
        </div>
      </div>

      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Webhook Global
          </CardTitle>
          <CardDescription>
            URL padrão que receberá os eventos caso uma URL específica não seja informada.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="global-url">Endpoint Global (n8n, Make, etc)</Label>
            <div className="flex gap-2">
              <Input
                id="global-url"
                placeholder="https://seu-n8n.com/webhook/notificacoes"
                value={globalUrl}
                onChange={(e) => setGlobalUrl(e.target.value)}
                onBlur={() => handleSave(globalUrl, events)}
                className="flex-1"
              />
              <Button onClick={() => handleSave()} disabled={isSaving}>
                {isSaving ? "Salvando..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 mt-8">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5" />
          Eventos Disponíveis
        </h3>
        
        {SYSTEM_EVENTS.map((event) => {
          const state = events[event.id];
          return (
            <Card key={event.id} className={`overflow-hidden transition-all duration-200 ${state.isActive ? "border-muted-foreground/30" : "opacity-60 grayscale-[50%]"}`}>
              <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between">
                <div className="flex gap-3 items-start">
                  <div className={`p-2 rounded-lg ${event.bg}`}>
                    <event.icon className={`h-5 w-5 ${event.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {event.name}
                      <Badge variant="outline" className="font-mono text-[10px] uppercase bg-muted/50">
                        {event.id}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">{event.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={state.isActive}
                  onCheckedChange={(val) => {
                    const newEvents = { ...events, [event.id]: { ...state, isActive: val } };
                    setEvents(newEvents);
                    handleSave(globalUrl, newEvents);
                  }}
                />
              </CardHeader>
              
              <CardContent className="p-4 pt-4">
                <div className="pl-12">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">URL Específica (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Deixe em branco para usar a URL Global"
                      value={state.customUrl}
                      onChange={(e) => setEvents({ ...events, [event.id]: { ...state, customUrl: e.target.value } })}
                      onBlur={() => handleSave(globalUrl, events)}
                      className="h-9 text-sm bg-muted/30"
                      disabled={!state.isActive}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-9"
                      onClick={() => handleTest(event.id)}
                      disabled={!state.isActive || (!globalUrl && !state.customUrl)}
                    >
                      <Send className="h-3.5 w-3.5 mr-2" />
                      Testar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="flex justify-end pt-4">
        <Button size="lg" onClick={() => handleSave()} disabled={isSaving}>
          {isSaving ? "Salvando Alterações..." : "Salvar Todas as Configurações"}
        </Button>
      </div>
    </div>
  );
}
