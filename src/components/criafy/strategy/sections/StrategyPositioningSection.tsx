import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, HelpCircle, ShieldCheck, Flame, Quote } from "lucide-react";
import { PositioningStrategy } from "@/types/criafyStrategy";

interface StrategyPositioningSectionProps {
  positioning: PositioningStrategy;
  isEditing: boolean;
  onChange: (updated: PositioningStrategy) => void;
  onOpenArchetypeModal: () => void;
}

export function StrategyPositioningSection({
  positioning,
  isEditing,
  onChange,
  onOpenArchetypeModal,
}: StrategyPositioningSectionProps) {
  const updateBigIdea = (patch: any) => {
    onChange({
      ...positioning,
      bigIdea: { ...(positioning.bigIdea || {}), ...patch },
    });
  };

  const updateArchetype = (patch: any) => {
    onChange({
      ...positioning,
      archetype: { ...(positioning.archetype || {}), ...patch },
    });
  };

  const updateMovement = (patch: any) => {
    onChange({
      ...positioning,
      movement: { ...(positioning.movement || {}), ...patch },
    });
  };

  const updateAuthority = (patch: any) => {
    onChange({
      ...positioning,
      authority: { ...(positioning.authority || {}), ...patch },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Crown className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">05. Posicionamento</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          A grande ideia central (Big Idea), o arquétipo da marca, o movimento comunitário e os pilares de autoridade.
        </p>
      </div>

      {/* BLOCO 1: IDENTIDADE DE POSICIONAMENTO */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Identidade & Espaço no Mercado
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Percepção Desejada</label>
              {isEditing ? (
                <Textarea
                  value={positioning.desiredPerception || ""}
                  onChange={(e) => onChange({ ...positioning, desiredPerception: e.target.value })}
                  placeholder="Como o público deve descrever você para um amigo?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {positioning.desiredPerception || "Não informado."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Diferencial / Visão Única</label>
              {isEditing ? (
                <Textarea
                  value={positioning.differential || ""}
                  onChange={(e) => onChange({ ...positioning, differential: e.target.value })}
                  placeholder="O que você ensina ou faz diferente da maioria dos concorrentes?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {positioning.differential || "Não informado."}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Lacuna do Mercado (O Que Ignoram)</label>
              {isEditing ? (
                <Textarea
                  value={positioning.marketGap || ""}
                  onChange={(e) => onChange({ ...positioning, marketGap: e.target.value })}
                  placeholder="O que seu mercado explica mal, ignora ou faz errado?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {positioning.marketGap || "Não informada."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Grande Transformação</label>
              {isEditing ? (
                <Textarea
                  value={positioning.transformation || ""}
                  onChange={(e) => onChange({ ...positioning, transformation: e.target.value })}
                  placeholder="Qual grande mudança ou revolução sua marca representa?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {positioning.transformation || "Não informada."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: CARD ESPECIAL DA BIG IDEA */}
      <Card className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Big Idea da Marca</h3>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              A grande ideia que sustenta a visão de mundo da marca
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">A Mentira</span>
              {isEditing ? (
                <Textarea
                  value={positioning.bigIdea?.lie || ""}
                  onChange={(e) => updateBigIdea({ lie: e.target.value })}
                  placeholder="No que a maioria acredita errado..."
                  className="text-xs rounded-lg min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{positioning.bigIdea?.lie || "—"}</p>
              )}
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">A Verdade Oculta</span>
              {isEditing ? (
                <Textarea
                  value={positioning.bigIdea?.hiddenTruth || ""}
                  onChange={(e) => updateBigIdea({ hiddenTruth: e.target.value })}
                  placeholder="O que o público ainda não percebeu..."
                  className="text-xs rounded-lg min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{positioning.bigIdea?.hiddenTruth || "—"}</p>
              )}
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">O Novo Caminho</span>
              {isEditing ? (
                <Textarea
                  value={positioning.bigIdea?.newWay || ""}
                  onChange={(e) => updateBigIdea({ newWay: e.target.value })}
                  placeholder="Qual alternativa você propõe..."
                  className="text-xs rounded-lg min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{positioning.bigIdea?.newWay || "—"}</p>
              )}
            </div>
          </div>

          {/* Big Idea Final Consolidada */}
          <div className="p-4 rounded-xl border border-primary/20 bg-background/90 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Big Idea Consolidada
            </span>
            {isEditing ? (
              <Input
                value={positioning.bigIdea?.finalBigIdea || ""}
                onChange={(e) => updateBigIdea({ finalBigIdea: e.target.value })}
                placeholder="Ex: 'Venda primeiro. Estoque depois.'..."
                className="text-sm font-bold rounded-xl"
              />
            ) : (
              <p className="text-sm font-bold text-foreground">
                {positioning.bigIdea?.finalBigIdea ? `"${positioning.bigIdea.finalBigIdea}"` : "Big Idea não formulada ainda."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 3: ARQUÉTIPO DA MARCA */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Arquétipo da Marca
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenArchetypeModal}
              className="h-7 text-xs text-primary gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              O que é arquétipo?
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Arquétipo Principal</label>
              {isEditing ? (
                <Input
                  value={positioning.archetype?.primary || ""}
                  onChange={(e) => updateArchetype({ primary: e.target.value })}
                  placeholder="Ex: Sábio, Criador, Herói, Mago..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs font-semibold text-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {positioning.archetype?.primary || "Não selecionado."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Arquétipo Secundário (Opcional)</label>
              {isEditing ? (
                <Input
                  value={positioning.archetype?.secondary || ""}
                  onChange={(e) => updateArchetype({ secondary: e.target.value })}
                  placeholder="Ex: Criador, Rebelde, Amante..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {positioning.archetype?.secondary || "Nenhum secundário."}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Como o Arquétipo se Manifesta no Conteúdo</label>
            {isEditing ? (
              <Textarea
                value={positioning.archetype?.howItManifests || ""}
                onChange={(e) => updateArchetype({ howItManifests: e.target.value })}
                placeholder="Ex: Trazendo clareza analítica, desafiando a inércia, ensinando com dados..."
                className="text-xs rounded-xl min-h-[70px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                {positioning.archetype?.howItManifests || "Não informado."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 4: MOVIMENTO & MANTRA */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Movimento, Inimigo em Comum & Mantra
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Ideia que Une a Comunidade</label>
              {isEditing ? (
                <Input
                  value={positioning.movement?.unifyingIdea || ""}
                  onChange={(e) => updateMovement({ unifyingIdea: e.target.value })}
                  placeholder="Ex: Liberdade geográfica sem risco de estoque..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {positioning.movement?.unifyingIdea || "Não informada."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Inimigo em Comum</label>
              {isEditing ? (
                <Input
                  value={positioning.movement?.commonEnemy || ""}
                  onChange={(e) => updateMovement({ commonEnemy: e.target.value })}
                  placeholder="Ex: Modelos tradicionais com capital parado..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {positioning.movement?.commonEnemy || "Não informado."}
                </p>
              )}
            </div>
          </div>

          {/* Mantra em destaque tipográfico */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5" />
              <span>Mantra da Comunidade</span>
            </div>
            {isEditing ? (
              <Input
                value={positioning.movement?.mantra || ""}
                onChange={(e) => updateMovement({ mantra: e.target.value })}
                placeholder="Ex: 'Estoque é passivo. Venda é ativo.'..."
                className="text-sm font-bold rounded-xl"
              />
            ) : (
              <p className="text-base font-bold text-foreground italic">
                {positioning.movement?.mantra ? `"${positioning.movement.mantra}"` : "Nenhum mantra cadastrado."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
