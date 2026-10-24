import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, X, ExternalLink, Check, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { ReferencesStrategy, ReferenceItem, CompetitorItem } from "@/types/criafyStrategy";

interface StrategyReferencesSectionProps {
  references: ReferencesStrategy;
  isEditing: boolean;
  onChange: (updated: ReferencesStrategy) => void;
}

export function StrategyReferencesSection({
  references,
  isEditing,
  onChange,
}: StrategyReferencesSectionProps) {
  const [newMustDo, setNewMustDo] = useState("");
  const [newMustNotDo, setNewMustNotDo] = useState("");
  const [newRefHandle, setNewRefHandle] = useState("");
  const [newRefLike, setNewRefLike] = useState("");
  const [newRefNotCopy, setNewRefNotCopy] = useState("");

  const handleAddMustDo = () => {
    if (!newMustDo.trim()) return;
    const current = references.aiRules?.mustDo || [];
    onChange({
      ...references,
      aiRules: {
        ...(references.aiRules || { mustDo: [], mustNotDo: [] }),
        mustDo: [...current, newMustDo.trim()],
      },
    });
    setNewMustDo("");
  };

  const handleRemoveMustDo = (idx: number) => {
    const current = references.aiRules?.mustDo || [];
    onChange({
      ...references,
      aiRules: {
        ...(references.aiRules || { mustDo: [], mustNotDo: [] }),
        mustDo: current.filter((_, i) => i !== idx),
      },
    });
  };

  const handleAddMustNotDo = () => {
    if (!newMustNotDo.trim()) return;
    const current = references.aiRules?.mustNotDo || [];
    onChange({
      ...references,
      aiRules: {
        ...(references.aiRules || { mustDo: [], mustNotDo: [] }),
        mustNotDo: [...current, newMustNotDo.trim()],
      },
    });
    setNewMustNotDo("");
  };

  const handleRemoveMustNotDo = (idx: number) => {
    const current = references.aiRules?.mustNotDo || [];
    onChange({
      ...references,
      aiRules: {
        ...(references.aiRules || { mustDo: [], mustNotDo: [] }),
        mustNotDo: current.filter((_, i) => i !== idx),
      },
    });
  };

  const handleAddRef = () => {
    if (!newRefHandle.trim()) return;
    const current = references.references || [];
    const item: ReferenceItem = {
      handle: newRefHandle.trim().startsWith("@") ? newRefHandle.trim() : `@${newRefHandle.trim()}`,
      whatILike: newRefLike.trim() || "Comunicação e estilo visual.",
      whatNotToCopy: newRefNotCopy.trim() || "",
    };
    onChange({
      ...references,
      references: [...current, item],
    });
    setNewRefHandle("");
    setNewRefLike("");
    setNewRefNotCopy("");
  };

  const handleRemoveRef = (idx: number) => {
    const current = references.references || [];
    onChange({
      ...references,
      references: current.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">08. Referências & Regras para IA</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Perfis de inspiração, benchmark de concorrentes e as diretrizes fundamentais que a IA deve respeitar.
        </p>
      </div>

      {/* BLOCO 1: REGRAS PARA IA (DEVE vs NÃO DEVE) */}
      <Card className="rounded-2xl border-2 border-primary/30 bg-card shadow-md overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Diretrizes Invioláveis para a IA</h3>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Memória permanente injetada nos prompts de geração
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna: A IA DEVE (Verde) */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>A IA DEVE</span>
              </div>

              <div className="space-y-2">
                {(references.aiRules?.mustDo || []).map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-background/90 border border-emerald-500/20 text-xs text-foreground flex items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                      <span className="leading-snug">{rule}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMustDo(idx)}
                        className="text-muted-foreground hover:text-rose-500 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={newMustDo}
                    onChange={(e) => setNewMustDo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMustDo())}
                    placeholder="Ex: 'Usar analogias cotidianas'..."
                    className="text-xs rounded-xl h-8 bg-background"
                  />
                  <Button type="button" size="sm" onClick={handleAddMustDo} className="text-xs rounded-xl h-8 shrink-0">
                    +
                  </Button>
                </div>
              )}
            </div>

            {/* Coluna: A IA NÃO DEVE (Rosa/Vermelho) */}
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                <X className="w-3.5 h-3.5 stroke-[3]" />
                <span>A IA NÃO DEVE</span>
              </div>

              <div className="space-y-2">
                {(references.aiRules?.mustNotDo || []).map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-background/90 border border-rose-500/20 text-xs text-foreground flex items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold mt-0.5">×</span>
                      <span className="leading-snug">{rule}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMustNotDo(idx)}
                        className="text-muted-foreground hover:text-rose-500 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={newMustNotDo}
                    onChange={(e) => setNewMustNotDo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMustNotDo())}
                    placeholder="Ex: 'Prometer faturamento fixo'..."
                    className="text-xs rounded-xl h-8 bg-background"
                  />
                  <Button type="button" size="sm" onClick={handleAddMustNotDo} className="text-xs rounded-xl h-8 shrink-0">
                    +
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: PERFIS DE REFERÊNCIA */}
      <div className="space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Perfis de Referência ({references.references?.length || 0})
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(references.references || []).map((ref, idx) => (
            <Card key={idx} className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <span>{ref.handle}</span>
                    <a
                      href={`https://instagram.com/${ref.handle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-pink-500"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRef(idx)}
                      className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      O que gosto:
                    </span>
                    <p className="text-muted-foreground">{ref.whatILike || "—"}</p>
                  </div>

                  {ref.whatNotToCopy && (
                    <div>
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                        Não quero copiar:
                      </span>
                      <p className="text-muted-foreground">{ref.whatNotToCopy}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!references.references || references.references.length === 0) && (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card/40 md:col-span-2">
              Nenhum perfil de referência adicionado.
            </div>
          )}
        </div>

        {/* Adicionar Referência em modo de edição */}
        {isEditing && (
          <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2 max-w-lg">
            <span className="text-[11px] font-semibold text-foreground block">+ Adicionar Novo Perfil de Referência</span>
            <Input
              value={newRefHandle}
              onChange={(e) => setNewRefHandle(e.target.value)}
              placeholder="@usuario ou nome do perfil..."
              className="text-xs rounded-xl"
            />
            <Input
              value={newRefLike}
              onChange={(e) => setNewRefLike(e.target.value)}
              placeholder="O que você admira / gosta nesse perfil..."
              className="text-xs rounded-xl"
            />
            <Input
              value={newRefNotCopy}
              onChange={(e) => setNewRefNotCopy(e.target.value)}
              placeholder="O que você NÃO quer copiar..."
              className="text-xs rounded-xl"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddRef}
              disabled={!newRefHandle.trim()}
              className="text-xs rounded-xl"
            >
              Adicionar Referência
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
