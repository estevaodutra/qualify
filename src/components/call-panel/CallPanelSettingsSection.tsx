import { useState } from "react";
import { Users, Settings as SettingsIcon, Bell, Volume2, PhoneCall, Key, CheckCircle2, AlertCircle, RefreshCw, Loader2, Globe, Radio } from "lucide-react";
import { OperatorsPanel } from "./OperatorsPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebphone } from "@/contexts/WebphoneContext";
import { useToast } from "@/hooks/use-toast";

interface CallPanelSettingsSectionProps {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  onRequestNotifications: () => void;
  onToggleSound?: () => void;
}

export function CallPanelSettingsSection({
  soundEnabled,
  notificationsEnabled,
  onRequestNotifications,
}: CallPanelSettingsSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("operators");
  const { operator, hasSipConfig, isOnline, status, syncOperator, toggleOnline } = useWebphone();

  const [tokenInput, setTokenInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!tokenInput.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Insira o token de acesso da API4COM.",
        variant: "destructive",
      });
      return;
    }
    setIsSyncing(true);
    const res = await syncOperator(tokenInput.trim());
    setIsSyncing(false);
    if (res.success) {
      setTokenInput("");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configurações de Telefonia
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerenciamento de operadores, ramais SIP e preferências do Webphone nativo.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="operators" className="gap-2 text-xs">
            <Users className="h-4 w-4" />
            <span>Operadores</span>
          </TabsTrigger>
          <TabsTrigger value="webphone" className="gap-2 text-xs">
            <PhoneCall className="h-4 w-4" />
            <span>Webphone Nativo (API4COM)</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 text-xs">
            <SettingsIcon className="h-4 w-4" />
            <span>Preferências do Discador</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Operadores */}
        <TabsContent value="operators" className="mt-6">
          <OperatorsPanel />
        </TabsContent>

        {/* Tab 2: Webphone Nativo */}
        <TabsContent value="webphone" className="mt-6 space-y-4">
          <Card className="bg-card/40 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-500" />
                    Status da Conexão Webphone SIP
                  </CardTitle>
                  <CardDescription>
                    O Webphone conecta o ramal diretamente no seu navegador via WebRTC SIP.
                  </CardDescription>
                </div>
                <Badge
                  variant={isOnline ? "default" : "secondary"}
                  className={isOnline ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""}
                >
                  {isOnline ? "Online / Registrado" : "Offline"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">Ramal SIP</span>
                  <span className="text-sm font-semibold font-mono">
                    {operator?.extension || "Não configurado"}
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">Domínio SIP</span>
                  <span className="text-sm font-semibold font-mono truncate block">
                    {operator?.sip_domain || "Não vinculado"}
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <span className="text-xs text-muted-foreground block">Webhook de Eventos</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    {operator?.sip_integration_id ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Pendente
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant={isOnline ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleOnline()}
                  disabled={!hasSipConfig || status === "connecting"}
                  className="gap-2"
                >
                  {status === "connecting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Conectando...
                    </>
                  ) : isOnline ? (
                    <>Desconectar Webphone</>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4" /> Conectar Webphone (Ficar Online)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Token de Acesso da API4COM
              </CardTitle>
              <CardDescription>
                Informe o Token de Acesso do seu usuário na API4COM para buscar o ramal SIP e configurar os webhooks automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api4token" className="text-xs font-semibold">
                  Novo Token de Acesso (com validade Nunca expira)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="api4token"
                    type="password"
                    placeholder="Cole seu token de acesso API4COM aqui..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="font-mono text-xs flex-1"
                  />
                  <Button
                    onClick={handleSync}
                    disabled={!tokenInput.trim() || isSyncing}
                    className="gap-2"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {isSyncing ? "Sincronizando..." : "Sincronizar Ramal"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  No Portal da API4COM, acesse <strong>Tokens de acesso → Novo Token de Acesso</strong> com validade{" "}
                  <strong>Nunca expira</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Preferências Gerais */}
        <TabsContent value="preferences" className="mt-6 space-y-4">
          <Card className="bg-card/40 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Alertas e Notificações
              </CardTitle>
              <CardDescription>
                Configure como você e sua equipe recebem alertas sobre chamadas recebidas e na fila.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Notificações do Navegador</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibe notificações do sistema quando uma nova chamada é conectada ou atribuída.
                  </p>
                </div>
                <Button
                  variant={notificationsEnabled ? "outline" : "default"}
                  size="sm"
                  onClick={onRequestNotifications}
                >
                  {notificationsEnabled ? "Notificações Ativas" : "Permitir Notificações"}
                </Button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Sons de Alerta e Toque</Label>
                  <p className="text-xs text-muted-foreground">
                    Tocar áudio de chamada ao iniciar discagem ou quando uma chamada for atendida.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Volume2 className="h-4 w-4" />
                  {soundEnabled ? "Áudio Habilitado" : "Áudio Desabilitado"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
