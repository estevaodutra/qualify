import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyAccountBriefing, CriafyInstagramAccount } from "@/types/criafy";

interface AccountBriefingModalProps {
  account: CriafyInstagramAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountBriefingModal({ account, open, onOpenChange }: AccountBriefingModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [about, setAbout] = useState("");
  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [mainTopics, setMainTopics] = useState("");
  const [allowedTopics, setAllowedTopics] = useState("");
  const [forbiddenTopics, setForbiddenTopics] = useState("");
  const [preferredCtas, setPreferredCtas] = useState("");
  const [preferredVocabulary, setPreferredVocabulary] = useState("");
  const [forbiddenVocabulary, setForbiddenVocabulary] = useState("");
  const [freeAiContext, setFreeAiContext] = useState("");

  useEffect(() => {
    if (account && open) {
      loadBriefing();
    }
  }, [account, open]);

  const loadBriefing = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const data = await criafyService.getBriefing(account.id);
      if (data) {
        setBrandName(data.brand_name || account.name || account.username);
        setAbout(data.about || "");
        setObjective(data.objective || "");
        setTargetAudience(data.target_audience || "");
        setToneOfVoice(data.tone_of_voice || "");
        setMainTopics((data.main_topics || []).join(", "));
        setAllowedTopics((data.allowed_topics || []).join(", "));
        setForbiddenTopics((data.forbidden_topics || []).join(", "));
        setPreferredCtas((data.preferred_ctas || []).join(", "));
        setPreferredVocabulary((data.preferred_vocabulary || []).join(", "));
        setForbiddenVocabulary((data.forbidden_vocabulary || []).join(", "));
        setFreeAiContext(data.free_ai_context || "");
      } else {
        setBrandName(account.name || account.username);
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar briefing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setSaving(true);
    try {
      const parseCommaArray = (str: string) =>
        str
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      await criafyService.saveBriefing({
        company_id: account.company_id,
        account_id: account.id,
        brand_name: brandName,
        about,
        objective,
        target_audience: targetAudience,
        tone_of_voice: toneOfVoice,
        main_topics: parseCommaArray(mainTopics),
        allowed_topics: parseCommaArray(allowedTopics),
        forbidden_topics: parseCommaArray(forbiddenTopics),
        preferred_ctas: parseCommaArray(preferredCtas),
        preferred_vocabulary: parseCommaArray(preferredVocabulary),
        forbidden_vocabulary: parseCommaArray(forbiddenVocabulary),
        free_ai_context: freeAiContext,
      });

      toast.success(`Briefing da conta @${account.username} salvo com sucesso!`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao salvar briefing: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Briefing da Conta: @{account.username}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Este briefing serve como contexto permanente para a IA gerar legendas, copys e copys customizadas para esta conta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome da Marca / Conta</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ex: Qualify Software"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tom de Voz</Label>
                <Input
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  placeholder="Ex: Profissional, educativo, moderno, descontraído"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sobre a Conta / O que faz</Label>
              <Textarea
                rows={2}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Descrição resumida da empresa, serviços ou nicho desta conta"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Público-Alvo</Label>
                <Textarea
                  rows={2}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Quem são os seguidores / clientes dessa conta?"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Objetivo Principal</Label>
                <Textarea
                  rows={2}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Gerar leads, vender produtos, posicionamento de autoridade"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Temas Principais (separados por vírgula)</Label>
                <Input
                  value={mainTopics}
                  onChange={(e) => setMainTopics(e.target.value)}
                  placeholder="Vendas, IA, Automação"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Assuntos Permitidos
                </Label>
                <Input
                  value={allowedTopics}
                  onChange={(e) => setAllowedTopics(e.target.value)}
                  placeholder="Casos de sucesso, Dicas"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  Assuntos Proibidos
                </Label>
                <Input
                  value={forbiddenTopics}
                  onChange={(e) => setForbiddenTopics(e.target.value)}
                  placeholder="Política, Concorrentes"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">CTAs Preferidos (separados por vírgula)</Label>
                <Input
                  value={preferredCtas}
                  onChange={(e) => setPreferredCtas(e.target.value)}
                  placeholder="Comente QUERO, Clique no link da bio"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Vocabulário Preferido
                </Label>
                <Input
                  value={preferredVocabulary}
                  onChange={(e) => setPreferredVocabulary(e.target.value)}
                  placeholder="Escala, Alta Performance, Qualify"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  Palavras Proibidas
                </Label>
                <Input
                  value={forbiddenVocabulary}
                  onChange={(e) => setForbiddenVocabulary(e.target.value)}
                  placeholder="Barato, Promoção, Grátis"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Instruções Adicionais Livres para a IA
              </Label>
              <Textarea
                rows={3}
                value={freeAiContext}
                onChange={(e) => setFreeAiContext(e.target.value)}
                placeholder="Qualquer instrução livre. Exemplo: Sempre usar tom encorajador, colocar hashtags no final e terminar com uma pergunta engajadora."
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Briefing da Conta
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
