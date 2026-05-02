import { Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface CooldownOverlayProps {
  remaining: number;
  total: number;
  operatorId: string;
}

export function CooldownOverlay({ remaining, total, operatorId }: CooldownOverlayProps) {
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 100;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handlePause = async () => {
    await (supabase as any)
      .from("call_operators")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", operatorId);
  };

  const handleSkip = async () => {
    await (supabase as any)
      .from("call_operators")
      .update({ status: "available", current_call_id: null, current_campaign_id: null, updated_at: new Date().toISOString() })
      .eq("id", operatorId);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">⏱️ Intervalo antes da próxima ligação</p>

      <div className="rounded-lg border bg-muted/30 p-4 text-center space-y-2">
        <span className="text-2xl font-mono font-bold text-foreground">{formatTime(remaining)}</span>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handlePause}>
          <Pause className="mr-1 h-3 w-3" /> Pausar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={handleSkip}>
          <SkipForward className="mr-1 h-3 w-3" /> Pular intervalo
        </Button>
      </div>
    </div>
  );
}
