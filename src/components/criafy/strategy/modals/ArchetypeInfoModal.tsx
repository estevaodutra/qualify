import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, HelpCircle } from "lucide-react";

interface ArchetypeInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ARCHETYPES_LIST = [
  { name: "Sábio", description: "Conhecimento, dados, clareza, profundidade e rigor técnico.", icon: "📚" },
  { name: "Criador", description: "Inovação, originalidade, design, construção e novos caminhos.", icon: "🎨" },
  { name: "Herói", description: "Superação, disciplina, disciplina, coragem e vitória sobre desafios.", icon: "⚔️" },
  { name: "Rebelde / Fora da Lei", description: "Questiona o status quo, quebra regras ultrapassadas e desafia o mercado.", icon: "⚡" },
  { name: "Mago", description: "Transformações radicais, visão futurista e o que parecia impossível.", icon: "🔮" },
  { name: "Governante / Líder", description: "Poder, controle, ordem, excelência, prestígio e comunidade coesa.", icon: "👑" },
  { name: "Amante", description: "Conexão profunda, estética, paixão, intimidade e proximidade.", icon: "✨" },
  { name: "Cuidador", description: "Proteção, suporte empático, acolhimento e dedicação ao outro.", icon: "🛡️" },
  { name: "Explorador", description: "Liberdade, descoberta, pioneirismo e expansão de fronteiras.", icon: "🧭" },
  { name: "Inocente", description: "Otimismo, simplicidade, verdade e pureza de intenções.", icon: "🕊️" },
  { name: "Bobo da Corte / Divertido", description: "Humor, leveza, espontaneidade e descontração.", icon: "🎭" },
  { name: "Pessoa Comum", description: "Acessibilidade, empatia direta, igualdade e identificação imediata.", icon: "🤝" },
];

export function ArchetypeInfoModal({ open, onOpenChange }: ArchetypeInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">O que é Arquétipo de Marca?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                A personalidade primordial que orienta o tom, a energia e a conexão emocional com o público.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs text-foreground/90">
          <p className="leading-relaxed">
            Arquétipos são modelos universais de comportamento humano (baseados nos estudos de Carl Jung). No branding e na Criafy, o arquétipo define a <strong>sensação emocional que sua comunicação transmite</strong> para que os seguidores e a IA saibam exatamente como falar:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {ARCHETYPES_LIST.map((arch) => (
              <div
                key={arch.name}
                className="p-3 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-colors space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>{arch.icon}</span>
                  <span>{arch.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {arch.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
