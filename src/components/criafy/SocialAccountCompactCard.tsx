import { useEffect, useState } from "react";
import { Music, Youtube } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { criafyService } from "@/services/criafy/criafyService";
import type { CriafySocialAccount, CriafySocialStats } from "@/types/criafy";

type Props = {
  account: CriafySocialAccount;
  onPublish: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
  onAuthorizeStats?: () => void;
};

function count(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR") : "—";
}

export function SocialAccountCompactCard({ account, onPublish, onDisconnect, disconnecting, onAuthorizeStats }: Props) {
  const [stats, setStats] = useState<CriafySocialStats | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const isYouTube = account.provider === "YOUTUBE";
  const Icon = isYouTube ? Youtube : Music;

  useEffect(() => {
    let alive = true;
    if (account.connection_status !== "CONNECTED") return;
    criafyService.getSocialAccountStats(account.company_id, account)
      .then((result) => {
        if (!alive) return;
        setStats(result.stats);
        setNeedsPermission(Boolean(result.needsStatsPermission));
        setStatsError(false);
      })
      .catch(() => { if (alive) setStatsError(true); });
    return () => { alive = false; };
  }, [account]);

  return <Card className="rounded-2xl border border-border/70 bg-card shadow-xs hover:shadow-md transition-all overflow-hidden">
    <CardContent className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={account.avatar_url || undefined} alt={account.display_name} />
            <AvatarFallback className={isYouTube ? "bg-red-600 text-white" : "bg-slate-950 text-cyan-400"}>
              <Icon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md text-white ring-2 ring-card ${isYouTube ? "bg-red-600" : "bg-slate-950"}`}>
            <Icon className="h-3 w-3" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold" title={account.display_name}>{account.display_name}</p>
          <p className="text-xs text-muted-foreground">{isYouTube ? "YouTube" : "TikTok"}</p>
        </div>
        <Badge variant="outline" className={account.connection_status === "CONNECTED"
          ? "shrink-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
          : "shrink-0"}>
          {account.connection_status === "CONNECTED" ? "Conectado" : account.connection_status}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
        <div><p className="text-[11px] text-muted-foreground">{isYouTube ? "Inscritos" : "Seguidores"}</p>
          <p className="text-sm font-bold">{count(stats?.followers)}</p></div>
        <div><p className="text-[11px] text-muted-foreground">Vídeos</p>
          <p className="text-sm font-bold">{count(stats?.posts)}</p></div>
        <div><p className="text-[11px] text-muted-foreground">{isYouTube ? "Visualizações" : "Curtidas"}</p>
          <p className="text-sm font-bold">{count(isYouTube ? stats?.views : stats?.likes)}</p></div>
      </div>
      {needsPermission && <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground">Habilite user.info.stats no app TikTok para mostrar seguidores.</p>
        {onAuthorizeStats && <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={onAuthorizeStats}>
          Reconectar com permissão de métricas
        </Button>}
      </div>}
      {statsError && <p className="text-[11px] text-muted-foreground">Métricas indisponíveis no momento.</p>}
      <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
        <Button size="sm" className="flex-1" variant="outline" disabled={account.connection_status !== "CONNECTED"} onClick={onPublish}>
          {isYouTube ? "Publicar Short" : "Publicar vídeo"}
        </Button>
        {onDisconnect && <Button size="sm" variant="ghost" disabled={disconnecting} onClick={onDisconnect}>Desconectar</Button>}
      </div>
    </CardContent>
  </Card>;
}
