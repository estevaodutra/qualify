import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, Edit3, MessageCircle } from "lucide-react";
import { AudienceStrategy } from "@/types/criafyStrategy";

interface StrategyAudienceSectionProps {
  audience: AudienceStrategy;
  isEditing: boolean;
  onChange: (updated: AudienceStrategy) => void;
}

export function StrategyAudienceSection({
  audience,
  isEditing,
  onChange,
}: StrategyAudienceSectionProps) {
  const [newPhrase, setNewPhrase] = useState("");
  const [newWord, setNewWord] = useState("");
  const [newQuestion, setNewQuestion] = useState("");

  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;
    const current = audience.realPhrases || [];
    onChange({ ...audience, realPhrases: [...current, newPhrase.trim()] });
    setNewPhrase("");
  };

  const handleRemovePhrase = (idx: number) => {
    const current = audience.realPhrases || [];
    onChange({ ...audience, realPhrases: current.filter((_, i) => i !== idx) });
  };

  const handleAddWord = () => {
    if (!newWord.trim()) return;
    const current = audience.recurringWords || [];
    onChange({ ...audience, recurringWords: [...current, newWord.trim()] });
    setNewWord("");
  };

  const handleRemoveWord = (idx: number) => {
    const current = audience.recurringWords || [];
    onChange({ ...audience, recurringWords: current.filter((_, i) => i !== idx) });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    const current = audience.recurringQuestions || [];
    onChange({ ...audience, recurringQuestions: [...current, newQuestion.trim()] });
    setNewQuestion("");
  };

  const handleRemoveQuestion = (idx: number) => {
    const current = audience.recurringQuestions || [];
    onChange({ ...audience, recurringQuestions: current.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">01. Público</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Entenda profundamente quem queremos atrair, como essa pessoa pensa, fala e decide.
        </p>
      </div>

      {/* BLOCO 1: IDENTIDADE */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Identidade do Público
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Público Principal</label>
              {isEditing ? (
                <Input
                  value={audience.mainAudience || ""}
                  onChange={(e) => onChange({ ...audience, mainAudience: e.target.value })}
                  placeholder="Ex: Donos de ecommerce, gestores de clínica..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {audience.mainAudience || "Público principal não preenchido."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Estágio do Público</label>
              {isEditing ? (
                <Input
                  value={audience.audienceStage || ""}
                  onChange={(e) => onChange({ ...audience, audienceStage: e.target.value })}
                  placeholder="Ex: Frustrado com agências, buscando escala..."
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {audience.audienceStage || "Inconformado / Frustrado com soluções anteriores"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Cliente Típico (Persona Representativa)</label>
            {isEditing ? (
              <Textarea
                value={audience.typicalClient || ""}
                onChange={(e) => onChange({ ...audience, typicalClient: e.target.value })}
                placeholder="Descreva uma pessoa representativa: rotina, momento de vida, tamanho do negócio..."
                className="text-xs rounded-xl min-h-[90px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed whitespace-pre-wrap">
                {audience.typicalClient || "Nenhuma descrição de cliente típico informada."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: REALIDADE ATUAL */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Realidade Atual & Hábitos
          </span>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Situação Atual</label>
            {isEditing ? (
              <Textarea
                value={audience.currentSituation || ""}
                onChange={(e) => onChange({ ...audience, currentSituation: e.target.value })}
                placeholder="Como é a vida ou negócio dessa pessoa hoje antes de resolver o problema?"
                className="text-xs rounded-xl min-h-[80px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                {audience.currentSituation || "Não informada."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Rotina Diária</label>
              {isEditing ? (
                <Textarea
                  value={audience.routine || ""}
                  onChange={(e) => onChange({ ...audience, routine: e.target.value })}
                  placeholder="O que faz de manhã? Onde perde tempo?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {audience.routine || "Não informada."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Hábitos que Atrapalham / Padrões</label>
              {isEditing ? (
                <Textarea
                  value={audience.habits || ""}
                  onChange={(e) => onChange({ ...audience, habits: e.target.value })}
                  placeholder="Comportamentos recorrentes que mantêm o problema..."
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {audience.habits || "Não informados."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 3: COMPORTAMENTO DE COMPRA & SOLUÇÕES TENTADAS */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Comportamento de Compra & Soluções Anteriores
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Consumo de Conteúdo</label>
              {isEditing ? (
                <Textarea
                  value={audience.contentConsumption || ""}
                  onChange={(e) => onChange({ ...audience, contentConsumption: e.target.value })}
                  placeholder="Onde consome? Que perfis segue? Que formatos prendem atenção?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {audience.contentConsumption || "Não informado."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Decisão de Compra</label>
              {isEditing ? (
                <Textarea
                  value={audience.buyingPatterns || ""}
                  onChange={(e) => onChange({ ...audience, buyingPatterns: e.target.value })}
                  placeholder="O que gera confiança? Preço, prova social, urgência?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {audience.buyingPatterns || "Não informado."}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Soluções Já Tentadas</label>
              {isEditing ? (
                <Textarea
                  value={audience.triedSolutions || ""}
                  onChange={(e) => onChange({ ...audience, triedSolutions: e.target.value })}
                  placeholder="Cursos, ferramentas, agências, consultorias já contratadas..."
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {audience.triedSolutions || "Não informado."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Por Que Falharam?</label>
              {isEditing ? (
                <Textarea
                  value={audience.whyFailed || ""}
                  onChange={(e) => onChange({ ...audience, whyFailed: e.target.value })}
                  placeholder="Falta de execução? Complexidade? Sem suporte?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                  {audience.whyFailed || "Não informado."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 4: LINGUAGEM DO PÚBLICO (CHIPS) */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Linguagem & Expressões Reais
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Essenciais para a IA gerar legendas, ganchos e copys que soem naturais para a audiência.
            </p>
          </div>

          {/* Frases reais do público */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Frases Reais do Público</label>
            <div className="flex flex-wrap gap-2">
              {(audience.realPhrases || []).map((phrase, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs bg-muted/50 border border-border/70 text-foreground"
                >
                  <MessageCircle className="w-3 h-3 text-muted-foreground" />
                  <span>"{phrase}"</span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhrase(idx)}
                      className="text-muted-foreground hover:text-rose-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {(!audience.realPhrases || audience.realPhrases.length === 0) && !isEditing && (
                <span className="text-xs text-muted-foreground">Nenhuma frase cadastrada.</span>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPhrase())}
                  placeholder="Ex: 'Eu posto todos os dias e ninguém chama no direct'..."
                  className="text-xs rounded-xl"
                />
                <Button type="button" size="sm" onClick={handleAddPhrase} className="text-xs rounded-xl shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </div>
            )}
          </div>

          {/* Palavras Recorrentes */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs font-semibold text-foreground block">Palavras Recorrentes</label>
            <div className="flex flex-wrap gap-1.5">
              {(audience.recurringWords || []).map((word, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-normal px-2.5 py-0.5 rounded-lg border-border/80 gap-1"
                >
                  <span>{word}</span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(idx)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {(!audience.recurringWords || audience.recurringWords.length === 0) && !isEditing && (
                <span className="text-xs text-muted-foreground">Nenhuma palavra cadastrada.</span>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 pt-1 max-w-sm">
                <Input
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddWord())}
                  placeholder="Adicionar palavra..."
                  className="text-xs rounded-xl h-8"
                />
                <Button type="button" size="sm" onClick={handleAddWord} className="text-xs rounded-xl h-8 shrink-0">
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
