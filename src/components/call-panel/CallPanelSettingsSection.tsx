import { useState } from "react";
import { Users, Settings as SettingsIcon, Bell, Volume2, ShieldAlert } from "lucide-react";
import { OperatorsPanel } from "./OperatorsPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configurações de Telefonia
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerenciamento de operadores, ramais e preferências gerais do discador.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="operators" className="gap-2 text-xs">
            <Users className="h-4 w-4" />
            <span>Operadores</span>
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

        {/* Tab 2: Preferências Gerais */}
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
