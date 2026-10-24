import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Instagram, CheckCircle2, Pin, Sparkles, Link2 } from "lucide-react";
import { ProfileStrategy, ProfileChecklist } from "@/types/criafyStrategy";

interface StrategyProfileSectionProps {
  profile: ProfileStrategy;
  isEditing: boolean;
  onChange: (updated: ProfileStrategy) => void;
}

export function StrategyProfileSection({
  profile,
  isEditing,
  onChange,
}: StrategyProfileSectionProps) {
  const ch = profile.checklist || {
    photo: false,
    nameWithKeyword: false,
    promiseInBio: false,
    ctaInBio: false,
    correctLink: false,
    highlightsOrganized: false,
    pinnedPostsActive: false,
  };

  const toggleCheck = (key: keyof ProfileChecklist) => {
    onChange({
      ...profile,
      checklist: {
        ...ch,
        [key]: !ch[key],
      },
    });
  };

  const completedCount = [
    ch.photo,
    ch.nameWithKeyword,
    ch.promiseInBio,
    ch.ctaInBio,
    ch.correctLink,
    ch.highlightsOrganized,
    ch.pinnedPostsActive,
  ].filter(Boolean).length;

  const totalCount = 7;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600">
            <Instagram className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">07. Perfil (Checklist Operacional)</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Estruturação operacional do perfil do Instagram para converter visitantes em seguidores e clientes.
        </p>
      </div>

      {/* BLOCO 1: PROGRESSO DO CHECKLIST */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Checklist de Otimização do Perfil
            </span>
            <Badge variant="outline" className="text-xs font-bold bg-primary/5 text-primary border-primary/20">
              {completedCount}/{totalCount} concluídos ({progressPct}%)
            </Badge>
          </div>

          <Progress value={progressPct} className="h-2 bg-muted/60" />

          {/* Itens do Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={ch.photo} onCheckedChange={() => toggleCheck("photo")} />
              <span className="text-xs font-medium text-foreground">Foto de perfil profissional definida</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={ch.nameWithKeyword} onCheckedChange={() => toggleCheck("nameWithKeyword")} />
              <span className="text-xs font-medium text-foreground">Nome com palavra-chave de busca</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={ch.promiseInBio} onCheckedChange={() => toggleCheck("promiseInBio")} />
              <span className="text-xs font-medium text-foreground">Promessa clara nas primeiras linhas da bio</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={ch.ctaInBio} onCheckedChange={() => toggleCheck("ctaInBio")} />
              <span className="text-xs font-medium text-foreground">Chamada para ação (CTA) objetiva na bio</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={ch.correctLink} onCheckedChange={() => toggleCheck("correctLink")} />
              <span className="text-xs font-medium text-foreground">Link de destino testado e funcionando</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox checked={ch.highlightsOrganized} onCheckedChange={() => toggleCheck("highlightsOrganized")} />
              <span className="text-xs font-medium text-foreground">Destaques estratégicos organizados</span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors sm:col-span-2">
              <Checkbox checked={ch.pinnedPostsActive} onCheckedChange={() => toggleCheck("pinnedPostsActive")} />
              <span className="text-xs font-medium text-foreground">3 Posts fixados no topo do feed estruturados</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: ESTRUTURAÇÃO DA BIO */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Dados Estratégicos da Bio
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nome Exibido no Perfil</label>
              {isEditing ? (
                <Input
                  value={profile.displayName || ""}
                  onChange={(e) => onChange({ ...profile, displayName: e.target.value })}
                  placeholder="Ex: Mauro | Dropshipping Nacional"
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40 font-semibold">
                  {profile.displayName || "Não definido."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Palavra-Chave Principal</label>
              {isEditing ? (
                <Input
                  value={profile.keyword || ""}
                  onChange={(e) => onChange({ ...profile, keyword: e.target.value })}
                  placeholder="Ex: Fornecedor, Estética, CRM..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40 font-mono">
                  {profile.keyword || "Não definida."}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Texto da Bio</label>
            {isEditing ? (
              <Textarea
                value={profile.bio || ""}
                onChange={(e) => onChange({ ...profile, bio: e.target.value })}
                placeholder="Cole ou redija o texto da bio..."
                className="text-xs rounded-xl min-h-[80px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                {profile.bio || "Texto da bio não cadastrado."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">CTA da Bio</label>
              {isEditing ? (
                <Input
                  value={profile.cta || ""}
                  onChange={(e) => onChange({ ...profile, cta: e.target.value })}
                  placeholder="Ex: Toque no link abaixo e receba a lista..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {profile.cta || "—"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Link de Destino</label>
              {isEditing ? (
                <Input
                  value={profile.link || ""}
                  onChange={(e) => onChange({ ...profile, link: e.target.value })}
                  placeholder="https://..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40 truncate">
                  {profile.link || "—"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 3: SLOTS DOS 3 POSTS FIXADOS */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Pin className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            3 Posts Fixados Recomendados (Topo do Perfil)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(profile.pinnedPosts || []).map((post, idx) => (
            <Card key={idx} className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase bg-muted/40">
                    Slot 0{post.slot || idx + 1}
                  </Badge>
                  <span className="text-xs font-semibold text-primary">{post.type}</span>
                </div>
                <h4 className="font-bold text-xs text-foreground">{post.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {post.suggestion}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
