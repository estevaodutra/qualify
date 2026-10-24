import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Clock, User, Sparkles } from "lucide-react";
import { StrategyHistoryEntry } from "@/types/criafyStrategy";

interface StrategyHistorySectionProps {
  history: StrategyHistoryEntry[];
  version: string;
}

export function StrategyHistorySection({
  history,
  version,
}: StrategyHistorySectionProps) {
  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Histórico de Alterações</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Linha do tempo de atualizações, revisões e importações na estratégia desta conta.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary border-primary/20">
          Versão {version || "v1"}
        </Badge>
      </div>

      <div className="space-y-3">
        {(history || []).map((entry, idx) => (
          <Card key={entry.id || idx} className="rounded-2xl border border-border/70 bg-card shadow-xs">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-foreground">{entry.title}</h4>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.author || "Usuário"}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {entry.description}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!history || history.length === 0) && (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card/40">
            Nenhum histórico registrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
