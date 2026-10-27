import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Sparkles,
  CheckCircle2,
  Check,
  Mic,
  MicOff,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  Lock,
  AlertCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { SprintOSRepository } from "../persistence/repository";
import { Workspace, BrandManualField, BrandManualModule } from "../domain/types";
import { getBrandManualData } from "../domain/ops";

export const CriafyPublicBriefingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  // Respostas locais do cliente
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, "saving" | "saved" | "idle">>({});
  const [expandedPresets, setExpandedPresets] = useState<Record<string, boolean>>({});
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [isCompletedView, setIsCompletedView] = useState(false);

  // Gravação de voz
  const [recordingFieldId, setRecordingFieldId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const debounceTimersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    SprintOSRepository.loadSharedData(token)
      .then((ws) => {
        if (ws) {
          setWorkspace(ws);
          const bm = getBrandManualData(ws);
          const cfg = bm.publicShareConfig;
          const allowedMods =
            cfg?.allowedModuleIds && cfg.allowedModuleIds.length > 0
              ? cfg.allowedModuleIds
              : ["posicionamento", "alma_copy", "raio_x_icp"];

          if (allowedMods.length > 0) {
            setActiveModuleId(allowedMods[0]);
          }

          // Inicializar mapa de respostas
          const initMap: Record<string, string> = {};
          const relevantFields = bm.fields.filter(
            (f) => !f.archived && !f.removed && allowedMods.includes(f.moduleId)
          );

          relevantFields.forEach((f) => {
            initMap[f.id] = f.response || "";
          });
          setResponses(initMap);

          if (cfg?.submittedBy) {
            setClientName(cfg.submittedBy);
          }

          // Verifica regra de acesso único:
          // Se já está marcado como completed E não há nenhum campo faltando (e não foi reaberto)
          const missingCount = relevantFields.filter(
            (f) => !(f.response || "").trim()
          ).length;

          if (cfg?.status === "completed" && missingCount === 0 && !cfg?.allowReopen) {
            setIsCompletedView(true);
          }
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const brandManual = useMemo(() => {
    if (!workspace) return null;
    return getBrandManualData(workspace);
  }, [workspace]);

  const config = brandManual?.publicShareConfig;

  const allowedModuleIds = useMemo(() => {
    if (config?.allowedModuleIds && config.allowedModuleIds.length > 0) {
      return config.allowedModuleIds;
    }
    return ["posicionamento", "alma_copy", "raio_x_icp"];
  }, [config]);

  const allowedModules = useMemo(() => {
    if (!brandManual) return [];
    return brandManual.modules.filter((m) => allowedModuleIds.includes(m.id));
  }, [brandManual, allowedModuleIds]);

  const allAllowedFields = useMemo(() => {
    if (!brandManual) return [];
    return brandManual.fields.filter(
      (f) => !f.archived && !f.removed && allowedModuleIds.includes(f.moduleId)
    );
  }, [brandManual, allowedModuleIds]);

  const activeModuleFields = useMemo(() => {
    return allAllowedFields
      .filter((f) => f.moduleId === activeModuleId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [allAllowedFields, activeModuleId]);

  const progressStats = useMemo(() => {
    const total = allAllowedFields.length;
    const answered = allAllowedFields.filter(
      (f) => (responses[f.id] || "").trim().length > 0
    ).length;
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { total, answered, missing: total - answered, pct };
  }, [allAllowedFields, responses]);

  // Autosave individual de cada resposta
  const handleResponseChange = (fieldId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    setSavingStatus((prev) => ({ ...prev, [fieldId]: "saving" }));

    if (debounceTimersRef.current[fieldId]) {
      clearTimeout(debounceTimersRef.current[fieldId]);
    }

    debounceTimersRef.current[fieldId] = setTimeout(async () => {
      if (!token) return;
      const res = await SprintOSRepository.submitPublicBriefing({
        token,
        responses: { [fieldId]: value },
        markCompleted: false,
        clientName: clientName.trim() || undefined,
      });

      if (res.success) {
        setSavingStatus((prev) => ({ ...prev, [fieldId]: "saved" }));
      } else {
        setSavingStatus((prev) => ({ ...prev, [fieldId]: "idle" }));
      }
    }, 900);
  };

  // Gravação de voz via Web Speech API
  const toggleVoiceRecording = (fieldId: string) => {
    if (recordingFieldId === fieldId) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecordingFieldId(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta transcrição de voz nativa. Use o Google Chrome ou Edge.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + " ";
        }
      }
      if (transcript.trim()) {
        const current = responses[fieldId] || "";
        const updated = current ? `${current.trim()} ${transcript.trim()}` : transcript.trim();
        handleResponseChange(fieldId, updated);
      }
    };

    recognition.onerror = () => {
      setRecordingFieldId(null);
    };

    recognition.onend = () => {
      setRecordingFieldId(null);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecordingFieldId(fieldId);
    toast.info("🎙️ Gravando... Fale normalmente que transcreveremos sua resposta.");
  };

  // Finalizar e enviar briefing
  const handleFinalSubmit = async () => {
    if (!token) return;

    // Verificar perguntas obrigatórias pendentes
    const missingRequired = allAllowedFields.filter(
      (f) => (f.required ?? true) && !(responses[f.id] || "").trim()
    );

    if (missingRequired.length > 0) {
      const firstMissing = missingRequired[0];
      setActiveModuleId(firstMissing.moduleId);
      toast.error(
        `Ainda faltam ${missingRequired.length} pergunta(s) para preencher antes de finalizar.`
      );
      setTimeout(() => {
        const el = document.getElementById(`public-field-${firstMissing.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return;
    }

    setIsSubmittingFinal(true);
    try {
      const res = await SprintOSRepository.submitPublicBriefing({
        token,
        responses,
        markCompleted: true,
        clientName: clientName.trim() || "Cliente",
      });

      if (res.success) {
        toast.success("Briefing enviado com sucesso!");
        setIsCompletedView(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(res.error || "Erro ao finalizar o envio do briefing.");
      }
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">
            Carregando formulário do Manual de Marca...
          </span>
        </div>
      </div>
    );
  }

  if (!workspace || !brandManual || (config && config.enabled === false)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-foreground">
            Link Indisponível ou Expirado
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este link público de briefing foi desativado pelo estrategista ou não existe mais. Solicite um novo link à equipe responsável.
          </p>
        </div>
      </div>
    );
  }

  // Tela de Briefing já preenchido (Acesso Único concluído)
  if (isCompletedView) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-lg w-full bg-card border border-border rounded-3xl p-8 text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] px-3 py-0.5">
              Preenchimento Concluído
            </Badge>
            <h1 className="text-xl font-black text-foreground">
              Briefing da Marca Enviado com Sucesso!
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Todas as informações solicitadas para o projeto{" "}
              <strong className="text-foreground">{workspace.project.name}</strong> já foram registradas e sincronizadas diretamente com o Manual de Marca 7D.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 text-left space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status do Link:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Finalizado e Protegido
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Perguntas Respondidas:</span>
              <span className="font-bold text-foreground">
                {progressStats.answered} de {progressStats.total}
              </span>
            </div>
            {clientName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enviado por:</span>
                <span className="font-bold text-foreground">{clientName}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Caso precise complementar ou retificar alguma resposta, basta solicitar a reabertura do link ao estrategista responsável.
          </p>
        </div>
      </div>
    );
  }

  const activeModule = allowedModules.find((m) => m.id === activeModuleId) || allowedModules[0];

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* Top Banner Fixo / Cabeçalho */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black text-foreground tracking-tight">
                  Manual de Marca 7D · {workspace.project.name}
                </h1>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                  Formulário Oficial
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Preencha as respostas abaixo com suas próprias palavras. Suas respostas são salvas automaticamente.
              </p>
            </div>
          </div>

          {/* Progresso Geral */}
          <div className="sm:w-48 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Progresso</span>
              <span className="font-bold text-foreground">
                {progressStats.answered}/{progressStats.total} ({progressStats.pct}%)
              </span>
            </div>
            <Progress value={progressStats.pct} className="h-2" />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Identificação Opcional do Responsável */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="text-xs font-bold text-foreground block">
                Identificação do Responsável
              </span>
              <span className="text-[11px] text-muted-foreground">
                Informe seu nome para registrarmos no histórico do Manual de Marca.
              </span>
            </div>
          </div>
          <Input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Seu nome ou cargo..."
            className="sm:w-64 h-8 text-xs rounded-xl bg-background"
          />
        </div>

        {/* Navegação entre os Módulos Habilitados */}
        {allowedModules.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allowedModules.map((m) => {
              const isActive = m.id === activeModule?.id;
              const modFields = allAllowedFields.filter((f) => f.moduleId === m.id);
              const modAnswered = modFields.filter(
                (f) => (responses[f.id] || "").trim().length > 0
              ).length;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveModuleId(m.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{m.title}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {modAnswered}/{modFields.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Descrição do Módulo Ativo */}
        {activeModule && (
          <div className="bg-muted/40 border border-border/80 rounded-2xl p-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              {activeModule.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeModule.description}
            </p>
          </div>
        )}

        {/* Lista Padronizada de Perguntas do Módulo */}
        <div className="space-y-4">
          {activeModuleFields.map((field, index) => {
            const responseValue = responses[field.id] || "";
            const isRecording = recordingFieldId === field.id;
            const isSaved = savingStatus[field.id] === "saved";
            const isSaving = savingStatus[field.id] === "saving";
            const isPresetExpanded = !!expandedPresets[field.id];

            return (
              <div
                key={field.id}
                id={`public-field-${field.id}`}
                className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3 transition-all hover:border-border/80"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      Pergunta {index + 1}
                    </span>
                    {field.required && (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        *Obrigatório
                      </span>
                    )}
                    {(responseValue || "").trim().length > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 ml-auto"
                      >
                        <Check className="w-2.5 h-2.5 mr-0.5" /> Preenchido
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-foreground leading-snug pt-0.5">
                    {field.title}
                  </h3>

                  {field.context && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {field.context}
                    </p>
                  )}
                </div>

                {/* Campo de Resposta + Gravador de Voz */}
                <div className="relative">
                  <Textarea
                    value={responseValue}
                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                    placeholder="Digite sua resposta aqui ou use o botão de microfone para responder falando..."
                    rows={3}
                    className="text-xs bg-background border-input text-foreground rounded-xl resize-y min-h-[95px] pr-28 pb-7 focus-visible:ring-1 focus-visible:ring-primary"
                  />

                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                    {isSaving && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                        Salvando...
                      </span>
                    )}
                    {isSaved && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="h-3 w-3" />
                        Salvo
                      </span>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant={isRecording ? "destructive" : "secondary"}
                      onClick={() => toggleVoiceRecording(field.id)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                        isRecording ? "animate-pulse" : ""
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-3.5 w-3.5" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5 text-primary" />
                          <span>Gravar Voz</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Exemplo de preenchimento (Preset) */}
                {field.preset && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPresets((prev) => ({
                          ...prev,
                          [field.id]: !prev[field.id],
                        }))
                      }
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer select-none"
                    >
                      <HelpCircle className="h-3 w-3" />
                      <span>
                        {isPresetExpanded
                          ? "Ocultar exemplo de preenchimento"
                          : "💡 Ver exemplo de preenchimento"}
                      </span>
                      {isPresetExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {isPresetExpanded && (
                      <div className="mt-2 p-3 bg-muted/60 border border-border/80 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-muted-foreground">
                        <p className="italic leading-relaxed flex-1">"{field.preset}"</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleResponseChange(field.id, field.preset || "");
                            toast.success("Exemplo inserido para você personalizar!");
                          }}
                          className="h-6 text-[10px] px-2 rounded-lg shrink-0"
                        >
                          Usar como base
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navegação entre módulos no rodapé da lista */}
        {allowedModules.length > 1 && (
          <div className="flex items-center justify-between pt-2">
            {(() => {
              const currentIdx = allowedModules.findIndex((m) => m.id === activeModule?.id);
              const prevMod = currentIdx > 0 ? allowedModules[currentIdx - 1] : null;
              const nextMod =
                currentIdx < allowedModules.length - 1 ? allowedModules[currentIdx + 1] : null;

              return (
                <>
                  {prevMod ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveModuleId(prevMod.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs rounded-xl"
                    >
                      ← Anterior: {prevMod.title}
                    </Button>
                  ) : (
                    <div />
                  )}

                  {nextMod ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setActiveModuleId(nextMod.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-xs rounded-xl font-bold"
                    >
                      Próxima Etapa: {nextMod.title} →
                    </Button>
                  ) : (
                    <div />
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Barra Fixa Inferior para Finalizar e Enviar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-3.5 z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong>{progressStats.answered}</strong> de{" "}
              <strong>{progressStats.total}</strong> perguntas respondidas
              {progressStats.missing > 0
                ? ` (faltam ${progressStats.missing})`
                : " · Tudo pronto para enviar!"}
            </span>
          </div>

          <Button
            onClick={handleFinalSubmit}
            disabled={isSubmittingFinal}
            className="w-full sm:w-auto h-9 px-5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-2 shadow-md"
          >
            {isSubmittingFinal ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Finalizando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Finalizar e Enviar Briefing</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CriafyPublicBriefingPage;
