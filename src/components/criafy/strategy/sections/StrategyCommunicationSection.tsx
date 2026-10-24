import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Plus,
  X,
  Volume2,
  Trash2,
  Layers,
  Sparkles,
  Hash,
} from "lucide-react";
import { CommunicationStrategy, ContentPillar } from "@/types/criafyStrategy";

interface StrategyCommunicationSectionProps {
  communication: CommunicationStrategy;
  isEditing: boolean;
  onChange: (updated: CommunicationStrategy) => void;
}

const AVAILABLE_TONES = [
  "Direto",
  "Didático",
  "Provocador",
  "Popular",
  "Descontraído",
  "Inspirador",
  "Técnico",
  "Elegante",
  "Enérgico",
  "Calmo",
  "Bem-humorado",
  "Sério",
];

export function StrategyCommunicationSection({
  communication,
  isEditing,
  onChange,
}: StrategyCommunicationSectionProps) {
  const [newDialect, setNewDialect] = useState("");
  const [newPrefWord, setNewPrefWord] = useState("");
  const [newForbWord, setNewForbWord] = useState("");
  const [newCta, setNewCta] = useState("");

  const toggleTone = (tone: string) => {
    const current = communication.toneOfVoice || [];
    if (current.includes(tone)) {
      onChange({ ...communication, toneOfVoice: current.filter((t) => t !== tone) });
    } else {
      onChange({ ...communication, toneOfVoice: [...current, tone] });
    }
  };

  const handleAddDialect = () => {
    if (!newDialect.trim()) return;
    const current = communication.expressionsAndDialects || [];
    onChange({ ...communication, expressionsAndDialects: [...current, newDialect.trim()] });
    setNewDialect("");
  };

  const handleRemoveDialect = (idx: number) => {
    const current = communication.expressionsAndDialects || [];
    onChange({ ...communication, expressionsAndDialects: current.filter((_, i) => i !== idx) });
  };

  const handleAddPrefWord = () => {
    if (!newPrefWord.trim()) return;
    const current = communication.preferredWords || [];
    onChange({ ...communication, preferredWords: [...current, newPrefWord.trim()] });
    setNewPrefWord("");
  };

  const handleRemovePrefWord = (idx: number) => {
    const current = communication.preferredWords || [];
    onChange({ ...communication, preferredWords: current.filter((_, i) => i !== idx) });
  };

  const handleAddForbWord = () => {
    if (!newForbWord.trim()) return;
    const current = communication.forbiddenWords || [];
    onChange({ ...communication, forbiddenWords: [...current, newForbWord.trim()] });
    setNewForbWord("");
  };

  const handleRemoveForbWord = (idx: number) => {
    const current = communication.forbiddenWords || [];
    onChange({ ...communication, forbiddenWords: current.filter((_, i) => i !== idx) });
  };

  const handleAddCta = () => {
    if (!newCta.trim()) return;
    const current = communication.ctas || [];
    onChange({ ...communication, ctas: [...current, newCta.trim()] });
    setNewCta("");
  };

  const handleRemoveCta = (idx: number) => {
    const current = communication.ctas || [];
    onChange({ ...communication, ctas: current.filter((_, i) => i !== idx) });
  };

  const handleAddPillar = () => {
    const current = communication.contentPillars || [];
    const newP: ContentPillar = {
      id: `p-${Date.now()}`,
      name: `Novo Pilar 0${current.length + 1}`,
      objective: "Objetivo estratégico deste pilar.",
      themes: [],
    };
    onChange({ ...communication, contentPillars: [...current, newP] });
  };

  const handleRemovePillar = (idx: number) => {
    const current = communication.contentPillars || [];
    onChange({ ...communication, contentPillars: current.filter((_, i) => i !== idx) });
  };

  const handleUpdatePillar = (idx: number, patch: Partial<ContentPillar>) => {
    const current = [...(communication.contentPillars || [])];
    current[idx] = { ...current[idx], ...patch };
    onChange({ ...communication, contentPillars: current });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">06. Comunicação</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Tom de voz, personalidade do especialista, expressões habituais, vocabulário e pilares editoriais.
        </p>
      </div>

      {/* BLOCO 1: TOM DE VOZ & PERSONALIDADE */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Tom de Voz
            </span>

            {isEditing ? (
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TONES.map((tone) => {
                  const selected = (communication.toneOfVoice || []).includes(tone);
                  return (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => toggleTone(tone)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/60"
                      }`}
                    >
                      {tone}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                {communication.toneOfVoice?.length
                  ? communication.toneOfVoice.join(" · ")
                  : "Nenhum tom de voz selecionado."}
              </p>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <label className="text-xs font-semibold text-foreground">Personalidade do Especialista / Marca</label>
            {isEditing ? (
              <Textarea
                value={communication.expertPersonality || ""}
                onChange={(e) => onChange({ ...communication, expertPersonality: e.target.value })}
                placeholder="Ex: Impaciente com enrolação, explica usando exemplos práticos, fala simples e provoca a audiência..."
                className="text-xs rounded-xl min-h-[80px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 leading-relaxed">
                {communication.expertPersonality || "Não informada."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: EXPRESSÕES & DIALETOS (CHIPS) */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Expressões, Bordões & Dialetos
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gírias, bordões ou manias de fala para a IA incorporar nos textos gerados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(communication.expressionsAndDialects || []).map((exp, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs font-mono px-3 py-1 rounded-xl border-border/80 gap-1.5 bg-muted/30"
              >
                <span>"{exp}"</span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDialect(idx)}
                    className="text-muted-foreground hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            {(!communication.expressionsAndDialects || communication.expressionsAndDialects.length === 0) && !isEditing && (
              <span className="text-xs text-muted-foreground">Nenhuma expressão cadastrada.</span>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center gap-2 pt-1 max-w-md">
              <Input
                value={newDialect}
                onChange={(e) => setNewDialect(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDialect())}
                placeholder="Ex: 'Fechou?', 'Basicamente...', 'Pô'..."
                className="text-xs rounded-xl h-8"
              />
              <Button type="button" size="sm" onClick={handleAddDialect} className="text-xs rounded-xl h-8 shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 3: VOCABULÁRIO PERMITIDO & PROIBIDO */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Filtro de Vocabulário para IA
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Palavras Preferidas */}
            <div className="space-y-2 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                Palavras Preferidas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(communication.preferredWords || []).map((w, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-emerald-500/30 gap-1 bg-background">
                    <span>{w}</span>
                    {isEditing && (
                      <button onClick={() => handleRemovePrefWord(idx)} className="hover:text-rose-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {isEditing && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={newPrefWord}
                    onChange={(e) => setNewPrefWord(e.target.value)}
                    placeholder="Adicionar palavra..."
                    className="text-xs rounded-lg h-7 bg-background"
                  />
                  <Button type="button" size="sm" onClick={handleAddPrefWord} className="h-7 text-xs px-2">
                    +
                  </Button>
                </div>
              )}
            </div>

            {/* Palavras Proibidas */}
            <div className="space-y-2 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                Palavras Proibidas / Evitadas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(communication.forbiddenWords || []).map((w, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-rose-500/30 gap-1 bg-background">
                    <span>{w}</span>
                    {isEditing && (
                      <button onClick={() => handleRemoveForbWord(idx)} className="hover:text-rose-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {isEditing && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={newForbWord}
                    onChange={(e) => setNewForbWord(e.target.value)}
                    placeholder="Adicionar proibida..."
                    className="text-xs rounded-lg h-7 bg-background"
                  />
                  <Button type="button" size="sm" onClick={handleAddForbWord} className="h-7 text-xs px-2">
                    +
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 4: PILARES DE CONTEÚDO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Pilares Editoriais de Conteúdo ({communication.contentPillars?.length || 0})
          </span>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPillar}
              className="h-8 text-xs gap-1 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Pilar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(communication.contentPillars || []).map((pillar, idx) => (
            <Card key={pillar.id || idx} className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    {isEditing ? (
                      <Input
                        value={pillar.name}
                        onChange={(e) => handleUpdatePillar(idx, { name: e.target.value })}
                        className="text-xs font-bold rounded-xl h-8"
                      />
                    ) : (
                      <h4 className="font-bold text-xs text-foreground">{pillar.name}</h4>
                    )}
                  </div>

                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePillar(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Objetivo do Pilar
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={pillar.objective || ""}
                      onChange={(e) => handleUpdatePillar(idx, { objective: e.target.value })}
                      placeholder="Ex: Gerar autoridade através de dados..."
                      className="text-xs rounded-xl min-h-[50px]"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                      {pillar.objective || "—"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!communication.contentPillars || communication.contentPillars.length === 0) && (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card/40 md:col-span-2">
              Nenhum pilar de conteúdo cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
