import { useState } from "react";
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
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulação de salvamento na API
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Configurações salvas",
        description: "As rotas de notificação do sistema foram atualizadas com sucesso.",
      });
    }, 800);
  };

  const handleTest = (eventId: string) => {
    toast({
      title: "Teste enviado",
      description: `Disparando evento de teste para ${eventId}...`,
    });
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
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={isSaving}>
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
                  onCheckedChange={(val) => setEvents({ ...events, [event.id]: { ...state, isActive: val } })}
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
        <Button size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando Alterações..." : "Salvar Todas as Configurações"}
        </Button>
      </div>
    </div>
  );
}
