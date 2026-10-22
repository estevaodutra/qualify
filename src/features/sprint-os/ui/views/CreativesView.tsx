/**
 * Aba 3: Criativos e Biblioteca de Conteúdo (AJ-020 / AJ-021 Seção 10 e 13).
 * Gestão de Anúncios de Validação e Acervo Multimídia:
 * - 12 Criativos de Validação do PVD com ângulos, ganchos e botão "Solicitar Áudio"
 * - Biblioteca de Conteúdo integrada com filtro especial de "Áudios" (reprodução WhatsApp)
 * - Vínculo bidirecional entre Criativo e Solicitação de Voz
 */

import React, { useState, useMemo } from "react";
import {
  Palette,
  Mic,
  Video,
  Image as ImageIcon,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAudioRequests,
  createAudioRequest,
} from "../../domain/ops";
import { WhatsAppAudioPlayer } from "../audio/WhatsAppAudioPlayer";

interface ValidationCreative {
  id: string;
  code: string;
  title: string;
  angle: string;
  hook: string;
  format: "Reels / Vídeo" | "Carrossel" | "Post Estático" | "Story";
  status: "ready" | "in_production" | "approved";
  scriptOutline: string;
}

const INITIAL_CREATIVES: ValidationCreative[] = [
  {
    id: "cr-01",
    code: "POST-AD-01",
    title: "Rotina do ICP & Cansaço Invisível",
    angle: "Dor Concreta do Dia a Dia",
    hook: "Você passa o dia inteiro ocupado, mas chega no final do mês com a sensação de que não avançou?",
    format: "Reels / Vídeo",
    status: "approved",
    scriptOutline: "Demonstrar a sobrecarga com operações manuais antes de conhecer o método estruturado.",
  },
  {
    id: "cr-02",
    code: "POST-AD-02",
    title: "O Mito do Esforço Solitário",
    angle: "Quebra de Crença Antiga",
    hook: "Tentar resolver tudo na força de vontade só vai te levar ao burnout.",
    format: "Carrossel",
    status: "in_production",
    scriptOutline: "Comparação passo a passo entre tentar fazer sozinho vs ter a esteira 7D implementada.",
  },
  {
    id: "cr-03",
    code: "POST-AD-03",
    title: "Mecanismo Único em Ação",
    angle: "Diferencial de Mercado",
    hook: "Existe uma brecha simples na forma como os clientes são atendidos que muda todo o jogo comercial.",
    format: "Reels / Vídeo",
    status: "approved",
    scriptOutline: "Apresentar a metodologia prática com exemplos reais e condução consultiva.",
  },
  {
    id: "cr-04",
    code: "POST-AD-04",
    title: "Transformação Observável (Antes / Depois)",
    angle: "Contraste de Realidade",
    hook: "O que muda na prática após os primeiros 30 dias de esteira ativa?",
    format: "Post Estático",
    status: "ready",
    scriptOutline: "Gráfico e prova de retenção de leads qualificados com atendimento imediato.",
  },
  {
    id: "cr-05",
    code: "POST-AD-05",
    title: "Provas e Casos Reais",
    angle: "Autoridade e Evidência",
    hook: "Como estruturar um fluxo que converte sem parecer um vendedor insistente.",
    format: "Reels / Vídeo",
    status: "in_production",
    scriptOutline: "Depoimento e print de feedback real de cliente atendido pelo método.",
  },
  {
    id: "cr-06",
    code: "POST-AD-06",
    title: "Convite Direto para o Grupo VIP",
    angle: "Oportunidade e Comunidade",
    hook: "Entregaremos os roteiros completos e os bastidores na aula inaugural dentro do grupo.",
    format: "Story",
    status: "ready",
    scriptOutline: "Chamada direta com CTA claro para o link do WhatsApp na bio.",
  },
];

export const CreativesView: React.FC = () => {
  const { workspace, mutate, setActiveTab } = useSprintOSStore();
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<"creatives" | "media_library">("creatives");
  const [mediaFilter, setMediaFilter] = useState<"all" | "audios" | "videos" | "images">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!workspace) return null;

  const audioRequests = getAudioRequests(workspace);

  // Todos os áudios gravados no projeto para a Biblioteca de Conteúdo (Seção 13)
  const allRecordedAudios = useMemo(() => {
    return audioRequests.flatMap((req) =>
      (req.recordings || []).map((rec) => ({
        ...rec,
        requestTitle: req.title,
        requestCode: req.code,
      }))
    );
  }, [audioRequests]);

  // Ação da Seção 10: Solicitar áudio a partir de um criativo
  const handleRequestAudioForCreative = async (cr: ValidationCreative) => {
    await mutate((ws, ctx) => {
      createAudioRequest(ws, ctx, {
        code: `AUD-${cr.code}`,
        title: `Gravação de Voz — ${cr.title}`,
        category: "criativos_ads",
        creativeId: cr.id,
        objective: `Captação de áudio original para o criativo ${cr.code} (${cr.format})`,
        context: `Imagine que você está gravando a copy do anúncio ${cr.code}. O ângulo principal é "${cr.angle}". Fale com naturalidade e energia para engajar o ouvinte nos primeiros segundos.`,
        script: cr.hook,
        preset: `Comece dizendo exatamente: "${cr.hook}"`,
        assigneeName: "Expert",
      });
    }, user?.email || "Estrategista");

    toast.success(`Solicitação AUD-${cr.code} criada com sucesso!`);
    setActiveTab("scripts_and_audios");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <span>Criativos & Biblioteca de Conteúdo</span>
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
              Acervo Multimídia
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Anúncios de validação, matriz de criativos e biblioteca multimídia integrada aos fluxos de voz.
          </p>
        </div>

        {/* Sub-Tabs: Criativos vs Biblioteca */}
        <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/80 gap-1 text-xs">
          <button
            onClick={() => setActiveSubTab("creatives")}
            className={`px-3 py-1 rounded-xl font-bold transition-all ${
              activeSubTab === "creatives"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Anúncios de Validação ({INITIAL_CREATIVES.length})
          </button>
          <button
            onClick={() => setActiveSubTab("media_library")}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === "media_library"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Biblioteca de Conteúdo</span>
            {allRecordedAudios.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 rounded-full bg-primary/10 text-primary font-bold">
                {allRecordedAudios.length} áudios
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ABA 1: ANÚNCIOS DE VALIDAÇÃO COM BOTÃO "SOLICITAR ÁUDIO" */}
      {activeSubTab === "creatives" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INITIAL_CREATIVES.map((cr) => {
              // Verifica se já existe solicitação de áudio vinculada
              const linkedRequest = audioRequests.find((r) => r.creativeId === cr.id || r.code.includes(cr.code));
              const hasAudios = linkedRequest && linkedRequest.recordings && linkedRequest.recordings.length > 0;

              return (
                <div
                  key={cr.id}
                  className="bg-card border border-border rounded-3xl p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        {cr.code}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold border-border">
                        {cr.format}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-snug">
                      {cr.title}
                    </h3>

                    <div className="p-2.5 bg-muted/40 border border-border/50 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Gancho Inicial (Hook):
                      </span>
                      <p className="text-xs text-foreground/90 italic font-serif">
                        "{cr.hook}"
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Ângulo:</strong> {cr.angle}
                    </p>
                  </div>

                  {/* Player de áudio vinculado se já tiver gravado */}
                  {hasAudios && (
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Áudio da Copy Gravado:
                      </span>
                      <WhatsAppAudioPlayer recording={linkedRequest.recordings[0]} />
                    </div>
                  )}

                  {/* Ação: Solicitar Áudio (AJ-021 Seção 10) */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestAudioForCreative(cr)}
                      className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 rounded-xl font-bold flex items-center gap-1.5 w-full justify-center"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>{hasAudios ? "Nova Gravação de Áudio" : "Solicitar Áudio"}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 2: BIBLIOTECA DE CONTEÚDO (FILTRO "ÁUDIOS" CONFORME SEÇÃO 13) */}
      {activeSubTab === "media_library" && (
        <div className="space-y-4">
          {/* Filtros da Biblioteca */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs gap-1">
              <button
                onClick={() => setMediaFilter("all")}
                className={`px-3 py-1 rounded-lg font-medium ${
                  mediaFilter === "all" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
                }`}
              >
                Todos os Materiais
              </button>
              <button
                onClick={() => setMediaFilter("audios")}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  mediaFilter === "audios" ? "bg-background text-primary shadow-xs font-bold" : "text-muted-foreground"
                }`}
              >
                <Mic className="h-3 w-3" />
                <span>Áudios ({allRecordedAudios.length})</span>
              </button>
              <button
                onClick={() => setMediaFilter("videos")}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  mediaFilter === "videos" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
                }`}
              >
                <Video className="h-3 w-3" />
                <span>Vídeos</span>
              </button>
              <button
                onClick={() => setMediaFilter("images")}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  mediaFilter === "images" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
                }`}
              >
                <ImageIcon className="h-3 w-3" />
                <span>Imagens</span>
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => setActiveTab("scripts_and_audios")}
              className="text-xs bg-primary text-primary-foreground font-bold rounded-xl"
            >
              Ir para Scripts e Áudios ↗
            </Button>
          </div>

          {/* Listagem de Áudios da Biblioteca de Conteúdo */}
          <div className="space-y-3">
            {allRecordedAudios.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center space-y-2">
                <Volume2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <h4 className="text-sm font-bold text-foreground">
                  Nenhum áudio gravado ainda
                </h4>
                <p className="text-xs text-muted-foreground">
                  As gravações realizadas na aba Scripts e Áudios ficarão reunidas nesta biblioteca.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allRecordedAudios.map((rec) => (
                  <div key={rec.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono font-bold text-primary">
                        {rec.requestCode}
                      </span>
                      <span>{rec.requestTitle}</span>
                    </div>
                    <WhatsAppAudioPlayer recording={rec} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
