import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Play, Pause, AlertTriangle } from "lucide-react";

interface InstanceQueueConfigProps {
  instanceId: string;
  companyId: string;
}

export function InstanceQueueConfig({ instanceId, companyId }: InstanceQueueConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["instance-queue-settings", instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instance_queue_settings")
        .select("*")
        .eq("instance_id", instanceId)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      return data || {
        is_paused: false,
        min_delay_seconds: 30,
        max_delay_seconds: 90,
        daily_limit: 1000,
        messages_sent_today: 0,
      };
    },
  });

  const { data: queueStats } = useQuery({
    queryKey: ["instance-queue-stats", instanceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("message_queue")
        .select("*", { count: "exact", head: true })
        .eq("instance_id", instanceId)
        .eq("status", "pending");
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 5000,
  });

  const [minDelay, setMinDelay] = useState(30);
  const [maxDelay, setMaxDelay] = useState(90);
  const [dailyLimit, setDailyLimit] = useState(1000);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (settings) {
      setMinDelay(settings.min_delay_seconds || 30);
      setMaxDelay(settings.max_delay_seconds || 90);
      setDailyLimit(settings.daily_limit || 1000);
      setIsPaused(settings.is_paused || false);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("instance_queue_settings")
        .upsert({
          instance_id: instanceId,
          company_id: companyId,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance-queue-settings", instanceId] });
      toast({ title: "Sucesso", description: "Configurações da fila atualizadas." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (minDelay >= maxDelay) {
      toast({ title: "Erro", description: "Delay mínimo deve ser menor que o máximo.", variant: "destructive" });
      return;
    }
    updateSettingsMutation.mutate({
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_limit: dailyLimit,
    });
  };

  const togglePause = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    updateSettingsMutation.mutate({ is_paused: newState });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;

  return (
    <Card className="border border-border/40 shadow-sm mt-4">
      <CardHeader className="pb-3 bg-card/10 border-b border-border/20">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Fila de Mensagens
              {isPaused ? (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">Pausada</span>
              ) : (
                <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium">Ativa</span>
              )}
            </CardTitle>
            <CardDescription>Configure o delay entre os disparos para evitar bloqueios</CardDescription>
          </div>
          <Button 
            variant={isPaused ? "default" : "outline"} 
            size="sm" 
            onClick={togglePause}
            className="flex gap-2"
          >
            {isPaused ? <><Play className="h-4 w-4" /> Retomar Fila</> : <><Pause className="h-4 w-4" /> Pausar Fila</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border/40 shadow-sm flex flex-col">
            <span className="text-sm text-muted-foreground font-medium">Aguardando Envio</span>
            <span className="text-3xl font-bold text-primary mt-1">{queueStats ?? 0}</span>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border/40 shadow-sm flex flex-col">
            <span className="text-sm text-muted-foreground font-medium">Enviadas Hoje</span>
            <span className="text-3xl font-bold mt-1">
              {settings?.messages_sent_today || 0} <span className="text-sm text-muted-foreground font-normal">/ {dailyLimit}</span>
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delay Mínimo (segundos)</Label>
              <Input 
                type="number" 
                min={0} 
                value={minDelay} 
                onChange={(e) => setMinDelay(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Delay Máximo (segundos)</Label>
              <Input 
                type="number" 
                min={0} 
                value={maxDelay} 
                onChange={(e) => setMaxDelay(Number(e.target.value))} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Limite Diário de Disparos</Label>
            <Input 
              type="number" 
              min={1} 
              value={dailyLimit} 
              onChange={(e) => setDailyLimit(Number(e.target.value))} 
            />
            <p className="text-xs text-muted-foreground">Após atingir o limite, a fila de disparos fará uma pausa até o dia seguinte.</p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
