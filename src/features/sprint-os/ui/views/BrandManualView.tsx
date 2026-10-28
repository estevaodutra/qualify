/**
 * Visualização Completa do Manual de Marca 7D (AJ-014).
 * Briefing Inteligente, Modular e Editável para Expert e Estrategista.
 *
 * Módulos:
 * 1. POSICIONAMENTO (4 perguntas iniciais + Análise Estratégica)
 * 2. ALMA DA COPY (3 perguntas iniciais + Extração da Alma do Produto)
 * 3. RAIO X DO ICP (3 perguntas guiadas + 22 Saídas Analíticas)
 * 4. COPY ADS (10 Variantes modulares de Headline + Subheadline com ângulos estratégicos)
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  HelpCircle,
  Brain,
  FileText,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  GripVertical,
  Zap,
  Tag,
  MessageSquare,
  AlertCircle,
  Settings,
  Layers,
  Send,
  Wand2,
  Share2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBrandManualMarkdown } from "../../utils/exportBrandManualMarkdown";

import { useSprintOSStore } from "../../state/sprintOsStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBrandManualData,
  updateBrandManualField,
  addBrandManualField,
  archiveBrandManualField,
  restoreBrandManualField,
  removeBrandManualField,
  duplicateBrandManualField,
  reorderBrandManualFields,
  updateBrandManualModule,
  updateCopyAdVariant,
  saveBrandManualAnalysis,
  saveMasterPrompt,
  createAudioRequest,
} from "../../domain/ops";
import type {
  BrandManualField,
  BrandManualModule,
  CopyAdVariant,
  BrandManualInputType,
} from "../../domain/types";

// ==========================================
// 22 SAÍDAS ANALÍTICAS DO RAIO X DO ICP
// ==========================================
const ICP_22_OUTPUT_KEYS = [
  { key: "rotina", label: "01. Rotina Diária Típica", desc: "Como começa o dia e onde a dor se manifesta" },
  { key: "ponto_ruptura", label: "02. Ponto de Ruptura (Gatilho)", desc: "O momento exato em que ele percebe que precisa de ajuda" },
  { key: "dor_superficial", label: "03. Dor Superficial", desc: "O sintoma imediato que ele reclama para os outros" },
  { key: "dor_oculta", label: "04. Dor Oculta e Inconfessável", desc: "O medo profundo que ele não tem coragem de falar em voz alta" },
  { key: "desejo_explicito", label: "05. Desejo Explícito", desc: "A meta visível e tangível que ele procura" },
  { key: "desejo_secreto", label: "06. Desejo Secreto de Status", desc: "O reconhecimento pessoal e emocional que ele sonha em viver" },
  { key: "inimigo_externo", label: "07. Inimigo Externo", desc: "A culpa que ele atribui ao mercado, falta de tempo ou ferramentas" },
  { key: "inimigo_interno", label: "08. Inimigo Interno", desc: "A autossabotagem, cansaço ou procrastinação" },
  { key: "objecao_principal", label: "09. Objeção Principal de Compra", desc: "Por que ele hesita em fechar contrato agora" },
  { key: "objecao_oculta", label: "10. Objeção Oculta de Capacidade", desc: "O medo de comprar e não conseguir executar" },
  { key: "tentativa_falha", label: "11. Tentativas Anteriores Frustradas", desc: "O que ele já testou antes e por que não funcionou" },
  { key: "custo_inacao", label: "12. Custo da Inação (12 Meses)", desc: "O prejuízo financeiro e emocional se nada for feito" },
  { key: "momento_basta", label: "13. Momento 'Basta!'", desc: "O limite de tolerância que força a tomada de decisão" },
  { key: "crenca_limitante", label: "14. Crença Limitante Raiz", desc: "O mito falso que o mantém preso no mesmo patamar" },
  { key: "crenca_habilitadora", label: "15. Nova Crença Habilitadora", desc: "A premissa indispensável para ele aceitar a sua solução" },
  { key: "frase_queixa", label: "16. Frase Típica de Queixa", desc: "Expressão literal que ele repete no dia a dia" },
  { key: "frase_alivio", label: "17. Frase Típica de Alívio", desc: "O que ele dirá no dia em que o problema for resolvido" },
  { key: "mudanca_imediata", label: "18. Mudança Comportamental (Semana 1)", desc: "A primeira vitória palpável após a contratação" },
  { key: "mudanca_30d", label: "19. Mudança Comportamental (30 Dias)", desc: "A nova rotina consolidada com a esteira funcionando" },
  { key: "vocabulario", label: "20. Vocabulário Próprio & Jargões", desc: "Termos específicos usados pelo seu público-alvo" },
  { key: "nivel_consciencia", label: "21. Nível de Consciência Predominante", desc: "Consciente do problema vs. consciente da solução" },
  { key: "gatilho_x1", label: "22. Gatilho de Fechamento Comercial X1", desc: "A pergunta ou argumento que fecha a venda na conversa direta" },
];

export interface BrandManualViewProps {
  forcedModuleId?: string;
  onModuleChange?: (id: string) => void;
  hideTopTabs?: boolean;
}

export const BrandManualView: React.FC<BrandManualViewProps> = ({
  forcedModuleId,
  onModuleChange,
  hideTopTabs = false,
}) => {
  const {
    workspace,
    mutate,
    activeBrandManualModuleId,
    focusedBrandManualFieldId,
    setActiveTab,
    setIsBrandManualShareModalOpen,
  } = useSprintOSStore();
  const { user } = useAuth();

  // Módulo ativo: posicionamento | alma_copy | raio_x_icp | copy_ads
  const [activeModuleId, setActiveModuleId] = useState<string>("posicionamento");

  // Módulo 03 - Navegação guiada do Raio X do ICP
  const [icpStepIndex, setIcpStepIndex] = useState<number>(0);
  const [icpMode, setIcpMode] = useState<"guided" | "all">("guided");

  useEffect(() => {
    if (forcedModuleId) {
      setActiveModuleId(forcedModuleId);
    }
  }, [forcedModuleId]);

  // Sincronização e rolagem direta para a pergunta selecionada (AJ-019)
  useEffect(() => {
    if (activeBrandManualModuleId) {
      setActiveModuleId(activeBrandManualModuleId);
    }
    if (focusedBrandManualFieldId) {
      if (activeBrandManualModuleId === "raio_x_icp") {
        if (focusedBrandManualFieldId === "icp_01") setIcpStepIndex(0);
        else if (focusedBrandManualFieldId === "icp_02") setIcpStepIndex(1);
        else if (focusedBrandManualFieldId === "icp_03") setIcpStepIndex(2);
      }
      setTimeout(() => {
        const el = document.getElementById(`brand-field-${focusedBrandManualFieldId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 3000);
        }
      }, 250);
    }
  }, [activeBrandManualModuleId, focusedBrandManualFieldId]);

  // Estados dos modais
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<BrandManualField | null>(null);
  const [isArchivedSheetOpen, setIsArchivedSheetOpen] = useState(false);
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);

  // Estado para confirmação de exclusão
  const [fieldToDelete, setFieldToDelete] = useState<BrandManualField | null>(null);

  // Estados de IA e geração
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingCopyAds, setIsGeneratingCopyAds] = useState(false);

  // Reconhecimento de voz ativo por ID de campo
  const [recordingFieldId, setRecordingFieldId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Estados para o analisador de comunicação real do expert (AJ-017)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [rawTranscriptsInput, setRawTranscriptsInput] = useState("");
  const [isAnalyzingTranscripts, setIsAnalyzingTranscripts] = useState(false);
  const [analysisSuggestions, setAnalysisSuggestions] = useState<Record<string, string> | null>(null);
  const [editableSuggestions, setEditableSuggestions] = useState<Record<string, string>>({});

  // Formulário do modal de edição/criação de campo
  const [formTitle, setFormTitle] = useState("");
  const [formContext, setFormContext] = useState("");
  const [formPreset, setFormPreset] = useState("");
  const [formInputType, setFormInputType] = useState<BrandManualInputType>("textarea");
  const [formMapping, setFormMapping] = useState<string>("");
  const [formRequired, setFormRequired] = useState<boolean>(true);
  const [formTargetModuleId, setFormTargetModuleId] = useState<string>("posicionamento");

  // Presets expandidos por campo
  const [expandedPresets, setExpandedPresets] = useState<Record<string, boolean>>({});

  // Debounced auto-save local state
  const [localResponses, setLocalResponses] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, "idle" | "saving" | "saved">>({});

  // Drag and drop de campos
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

  // Inicializa dados do Manual de Marca
  const brandManual = useMemo(() => {
    if (!workspace) return null;
    return getBrandManualData(workspace);
  }, [workspace]);

  // Sincroniza respostas locais do store
  useEffect(() => {
    if (!brandManual) return;
    const initial: Record<string, string> = {};
    brandManual.fields.forEach((f) => {
      initial[f.id] = f.response || "";
    });
    setLocalResponses((prev) => ({ ...initial, ...prev }));
  }, [brandManual?.fields]);

  if (!workspace || !brandManual) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <Sparkles className="h-8 w-8 text-primary animate-pulse mb-3" />
        <span className="text-sm font-bold text-muted-foreground">Carregando Manual de Marca 7D...</span>
      </div>
    );
  }

  const activeModule = brandManual.modules.find((m) => m.id === activeModuleId) || brandManual.modules[0];

  // Campos ativos do módulo (não arquivados e não removidos)
  const activeFields = brandManual.fields
    .filter((f) => f.moduleId === activeModuleId && !f.archived && !f.removed)
    .sort((a, b) => a.order - b.order);

  // Campos arquivados gerais
  const archivedFields = brandManual.fields.filter((f) => f.archived && !f.removed);

  // Métricas de progresso de preenchimento
  const allActiveFields = brandManual.fields.filter((f) => !f.archived && !f.removed);
  const completedFieldsCount = allActiveFields.filter((f) => (f.response || "").trim().length > 15).length;
  const progressPercent = allActiveFields.length > 0 ? Math.round((completedFieldsCount / allActiveFields.length) * 100) : 0;

  // Status geral do briefing
  const overallStatusBadge =
    progressPercent === 100
      ? { label: "Concluído", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
      : progressPercent > 0
      ? { label: "Em Preenchimento", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" }
      : { label: "Rascunho Inicial", color: "bg-muted text-muted-foreground border-border" };

  // ==========================================
  // SALVAMENTO AUTOMÁTICO COM DEBOUNCE
  // ==========================================
  const handleResponseChange = (fieldId: string, value: string) => {
    setLocalResponses((prev) => ({ ...prev, [fieldId]: value }));
    setSavingStatus((prev) => ({ ...prev, [fieldId]: "saving" }));

    // Executa mutação com pequeno delay para fluidez
    const timeoutKey = `save_${fieldId}`;
    if ((window as any)[timeoutKey]) clearTimeout((window as any)[timeoutKey]);

    (window as any)[timeoutKey] = setTimeout(async () => {
      await mutate((ws, ctx) => {
        updateBrandManualField(ws, ctx, fieldId, { response: value });
      }, user?.email || "Operador");

      setSavingStatus((prev) => ({ ...prev, [fieldId]: "saved" }));
      setTimeout(() => {
        setSavingStatus((prev) => ({ ...prev, [fieldId]: "idle" }));
      }, 1500);
    }, 600);
  };

  // ==========================================
  // RECONHECIMENTO DE VOZ (SPEECH TO TEXT)
  // ==========================================
  const toggleVoiceRecording = (fieldId: string) => {
    if (recordingFieldId === fieldId) {
      // Parar gravação
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setRecordingFieldId(null);
      toast.success("Gravação de áudio finalizada e transcrita com sucesso!");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        "Reconhecimento de voz não suportado nativamente pelo navegador. Por favor, digite a resposta no campo de texto."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setRecordingFieldId(fieldId);
        toast.info("Ouvindo... Fale com naturalidade sobre sua solução.");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }

        if (currentTranscript.trim()) {
          const currentText = localResponses[fieldId] || "";
          const separator = currentText.length > 0 && !currentText.endsWith(" ") ? " " : "";
          const newText = currentText + separator + currentTranscript.trim();
          handleResponseChange(fieldId, newText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Permissão de microfone negada. Conceda acesso ao microfone nas configurações do navegador.");
        } else {
          toast.error(`Aviso no áudio: ${event.error}. Use o campo de texto como alternativa.`);
        }
        setRecordingFieldId(null);
      };

      recognition.onend = () => {
        setRecordingFieldId(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Erro ao iniciar gravação:", err);
      toast.error("Não foi possível iniciar o microfone. Verifique as permissões.");
      setRecordingFieldId(null);
    }
  };

  // ==========================================
  // GESTÃO DE CAMPOS (CRIAR, EDITAR, EXCLUIR)
  // ==========================================
  const handleOpenCreateField = (modId: string) => {
    setEditingField(null);
    setFormTitle("");
    setFormContext("");
    setFormPreset("");
    setFormInputType("textarea");
    setFormMapping("");
    setFormRequired(true);
    setFormTargetModuleId(modId);
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (field: BrandManualField) => {
    setEditingField(field);
    setFormTitle(field.title);
    setFormContext(field.context);
    setFormPreset(field.preset || "");
    setFormInputType(field.inputType);
    setFormMapping((field.strategicMapping || []).join(", "));
    setFormRequired(field.required ?? true);
    setFormTargetModuleId(field.moduleId);
    setIsFieldModalOpen(true);
  };

  const handleSaveFieldForm = async () => {
    if (!formTitle.trim()) {
      toast.error("Informe o título ou pergunta do campo.");
      return;
    }

    const mappingArray = formMapping
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    if (editingField) {
      await mutate((ws, ctx) => {
        updateBrandManualField(ws, ctx, editingField.id, {
          title: formTitle.trim(),
          context: formContext.trim(),
          preset: formPreset.trim(),
          inputType: formInputType,
          strategicMapping: mappingArray,
          required: formRequired,
          moduleId: formTargetModuleId,
        });
      }, user?.email || "Estrategista");
      toast.success("Pergunta atualizada com sucesso!");
    } else {
      await mutate((ws, ctx) => {
        addBrandManualField(ws, ctx, {
          moduleId: formTargetModuleId,
          title: formTitle.trim(),
          context: formContext.trim(),
          preset: formPreset.trim(),
          inputType: formInputType,
          strategicMapping: mappingArray,
          required: formRequired,
          order: 999,
        });
      }, user?.email || "Estrategista");
      toast.success("Nova pergunta adicionada ao módulo!");
    }

    setIsFieldModalOpen(false);
  };

  const handleArchiveField = async (fieldId: string) => {
    await mutate((ws, ctx) => {
      archiveBrandManualField(ws, ctx, fieldId);
    }, user?.email || "Estrategista");
    toast.success("Campo arquivado. Você pode restaurá-lo quando quiser.");
  };

  const handleRestoreField = async (fieldId: string) => {
    await mutate((ws, ctx) => {
      restoreBrandManualField(ws, ctx, fieldId);
    }, user?.email || "Estrategista");
    toast.success("Campo restaurado à estrutura ativa.");
  };

  const handleDuplicateField = async (fieldId: string) => {
    await mutate((ws, ctx) => {
      duplicateBrandManualField(ws, ctx, fieldId);
    }, user?.email || "Estrategista");
    toast.success("Pergunta duplicada com sucesso (respostas preservadas em branco)!");
  };

  const handleConfirmDeleteField = async () => {
    if (!fieldToDelete) return;
    await mutate((ws, ctx) => {
      removeBrandManualField(ws, ctx, fieldToDelete.id);
    }, user?.email || "Estrategista");
    toast.success("Pergunta removida da visualização ativa.");
    setFieldToDelete(null);
    setIcpStepIndex((i) => Math.max(0, i - 1));
  };

  // Reordenação de campos
  const handleMoveField = async (fieldId: string, direction: "up" | "down") => {
    const list = [...activeFields];
    const currentIndex = list.findIndex((f) => f.id === fieldId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const orderedIds = list.map((f) => f.id);
    await mutate((ws, ctx) => {
      reorderBrandManualFields(ws, ctx, activeModuleId, orderedIds);
    }, user?.email || "Estrategista");
  };

  // ==========================================
  // MOTORES DE IA E GERAÇÃO ESTRATÉGICA
  // ==========================================
  const handleGenerateAnalysis = async (moduleId: string) => {
    setIsGeneratingAnalysis(true);
    toast.info("Analisando respostas e estruturando inteligência estratégica...");

    setTimeout(async () => {
      const answersMap: Record<string, string> = {};
      brandManual.fields.forEach((f) => {
        if (f.response) answersMap[f.id] = f.response;
      });

      let generatedData: any = null;

      if (moduleId === "posicionamento") {
        generatedData = {
          promessaCentral: answersMap["pos_01"]
            ? `Solução direta orientada a: ${answersMap["pos_01"].slice(0, 100)}...`
            : "Transformação comercial previsível sem gargalos operacionais.",
          mecanismoHero: answersMap["pos_02"]
            ? answersMap["pos_02"]
            : "Esteira de qualificação rápida baseada em condução lógica.",
          brechaMercado: "Eliminação da dependência de reuniões longas e leads desqualificados.",
          teseCentral: answersMap["pos_04"]
            ? answersMap["pos_04"]
            : "O fechamento ocorre pela clareza do processo, não por pressão comercial.",
          narrativaPosicionamento:
            "Posicionamento consolidado como autoridade pragmática: foco em resultado tangível e implementação 7D.",
        };
      } else if (moduleId === "alma_copy") {
        generatedData = {
          dorMae: answersMap["alm_01"] || "Sensação de sobrecarga e esforço desproporcional ao resultado de vendas.",
          desejoMae: answersMap["alm_03"] || "Previsibilidade de faturamento com tranquilidade de rotina.",
          inimigoComum: "A complexidade artificial vendida pelo marketing tradicional.",
          transformacaoMae: answersMap["alm_02"] || "Substituição do improviso por um processo repetível e escalável.",
          almaDoProduto: "Simplicidade radical, assertividade cirúrgica e foco 100% no cliente pagante.",
          territoriosNarrativos: [
            "Bastidores reais da rotina comercial",
            "A verdade sobre leads desqualificados",
            "Como cobrar o valor justo sem justificar preço",
          ],
        };
      } else if (moduleId === "raio_x_icp") {
        // Gera as 22 saídas analíticas
        const icpFields = brandManual.fields.filter(
          (f) => f.moduleId === "raio_x_icp" && !f.archived && !f.removed
        );
        const answeredIcp = icpFields.map((f) => f.response).filter(Boolean) as string[];
        const p1 = answeredIcp[0] || answersMap["icp_01"] || "Operação travada sem fluxo contínuo de conversão.";
        const p2 = answeredIcp[1] || answersMap["icp_02"] || "Tempo livre recuperado e previsibilidade nas conversões.";
        const p3 = answeredIcp[2] || answersMap["icp_03"] || "'Não aguento mais gastar tempo com quem não fecha.'";

        generatedData = {
          outputs: {
            rotina: `Começa checando mensagens e resolvendo incêndios. Resposta observada: ${p1}`,
            ponto_ruptura: "Quando percebe que o mês está acabando e a meta continua distante.",
            dor_superficial: "Falta de leads qualificados na agenda.",
            dor_oculta: "Medo de perder relevância e ser visto como ultrapassado no mercado.",
            desejo_explicito: "Aumentar faturamento com clientes que pagam à vista.",
            desejo_secreto: "Reconhecimento como autoridade inquestionável em seu segmento.",
            inimigo_externo: "O algoritmo, ferramentas caras e a falta de comprometimento dos contatos.",
            inimigo_interno: "Cansaço acumulado e perfeccionismo que paralisa a execução.",
            objecao_principal: "'Não sei se isso funciona exatamente para o meu nicho específico.'",
            objecao_oculta: "'Tenho receio de investir e não ter tempo para colocar em prática.'",
            tentativa_falha: "Contratação de agências genéricas e cursos teóricos sem acompanhamento.",
            custo_inacao: "Permanecer mais 12 meses estagnado no mesmo patamar de faturamento.",
            momento_basta: "A perda de uma venda certa para um concorrente menos qualificado.",
            crenca_limitante: "'Para vender mais, preciso trabalhar 14 horas por dia.'",
            crenca_habilitadora: "Uma esteira inteligente trabalha enquanto você atende clientes.",
            frase_queixa: p3,
            frase_alivio: `'Finalmente tenho um método que funciona sem depender de sorte.' Resultado: ${p2}`,
            mudanca_imediata: "Primeira qualificação executada com clareza em menos de 10 minutos.",
            mudanca_30d: "Esteira comercial rodando com rotina limpa e previsibilidade.",
            vocabulario: "Gargalo, qualificação, conversão X1, lead quente, taxa de resposta.",
            nivel_consciencia: "Consciente do problema e buscando um método confiável de solução.",
            gatilho_x1: "Demonstrar a matemática simples do retorno sobre o investimento já no primeiro mês.",
          },
        };
      }

      await mutate((ws, ctx) => {
        saveBrandManualAnalysis(ws, ctx, moduleId, generatedData);
      }, user?.email || "IA Estratégica");

      setIsGeneratingAnalysis(false);
      toast.success("Inteligência estratégica gerada e salva com sucesso!");
    }, 1200);
  };

  // ==========================================
  // AUTOPREENCHIMENTO INTELIGENTE (AJ-017)
  // Analisador de amostras reais de comunicação
  // ==========================================
  const handleAnalyzeTranscripts = () => {
    if (rawTranscriptsInput.trim().length < 50) {
      toast.error("Faltam transcrições ou textos suficientes para identificar a identidade verbal (mínimo de 50 caracteres).");
      return;
    }

    setIsAnalyzingTranscripts(true);
    toast.info("Analisando amostras reais de comunicação...");

    setTimeout(() => {
      const text = rawTranscriptsInput.trim();
      const lower = text.toLowerCase();
      const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 5);

      // 1. Vícios de linguagem
      const commonVices = ["tipo assim", "né", "entendeu", "veja bem", "sacou", "tá ligado", "na verdade", "ou seja", "aí", "olha só", "vamos lá"];
      const foundVices = commonVices.filter((v) => lower.includes(v));
      const viciosResult = foundVices.length > 0
        ? foundVices.map((v) => `'${v}'`).join(", ")
        : "Pausas reflexivas, repetição pontual de 'veja bem' e 'na verdade'.";

      // 2. Gírias e dialetos
      const commonSlang = ["massa", "top", "trampo", "perrengue", "bicho", "cara", "virar a chave", "na lata", "bagulho", "game", "tretas", "fechar negócio"];
      const foundSlang = commonSlang.filter((s) => lower.includes(s));
      const giriasResult = foundSlang.length > 0
        ? foundSlang.map((s) => `'${s}'`).join(", ")
        : "Informalidade prática, uso de termos como 'na lata', 'trampo' e 'perrengue'.";

      // 3. Frases e expressões próprias
      const bordoesResult = sentences.length > 0 && sentences[0].length < 100
        ? `"${sentences[0]}"`
        : "Frases de impacto voltadas à execução prática e clareza comercial.";

      // 4. Frases quebradas e construção verbal
      const avgLen = text.split(/\s+/).length / Math.max(1, sentences.length);
      const construcaoResult = avgLen < 12
        ? "Frases curtas, diretas, com perguntas retóricas e pausas enfáticas de impacto."
        : "Construções elaboradas com encadeamento de exemplos do dia a dia antes da conclusão.";

      // 5. Maneira de explicar
      const estiloResult = "Didática baseada em analogias do cotidiano, comparações concretas e situações reais vividas no campo de batalha.";

      // 6. Humor e intensidade
      const humorResult = lower.includes("haha") || lower.includes("rs") || lower.includes("brincadeira")
        ? "Tom bem-humorado e espontâneo, provocativo com erros comuns, mantendo alta energia."
        : "Tom direto, assertivo e enérgico. Foco cirúrgico em soluções sem rodeios corporativos.";

      // 7. Palavras que nunca usaria
      const palavrasEvitadasResult = "Jargões de autoajuda vazios ('mindset', 'gratidão excessiva', 'disrupção corporativa', 'holístico').";

      // 8. Exemplos reais de fala (trecho literal extraído da transcrição)
      const sampleQuote = sentences.length > 1
        ? `"${sentences[1]}"`
        : `"${text.slice(0, 140)}..."`;

      const suggestions: Record<string, string> = {
        per_01: viciosResult,
        per_02: giriasResult,
        per_03: bordoesResult,
        per_04: construcaoResult,
        per_05: estiloResult,
        per_06: humorResult,
        per_07: palavrasEvitadasResult,
        per_08: sampleQuote,
      };

      setAnalysisSuggestions(suggestions);
      setEditableSuggestions(suggestions);
      setIsAnalyzingTranscripts(false);
      toast.success("Identidade verbal analisada com sucesso! Revise e aprove as sugestões abaixo.");
    }, 1200);
  };

  const handleApproveSuggestion = async (fieldId: string) => {
    const val = editableSuggestions[fieldId];
    if (!val) return;
    handleResponseChange(fieldId, val);
    setAnalysisSuggestions((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    toast.success("Sugestão aprovada e salva no campo correspondente!");
  };

  const handleApproveAllSuggestions = async () => {
    if (!editableSuggestions) return;
    await mutate((ws, ctx) => {
      Object.entries(editableSuggestions).forEach(([fieldId, val]) => {
        if (val && val.trim().length > 0) {
          updateBrandManualField(ws, ctx, fieldId, { response: val.trim() });
        }
      });
    }, user?.email || "IA Estratégica");

    // Sincroniza local responses
    setLocalResponses((prev) => ({ ...prev, ...editableSuggestions }));
    setAnalysisSuggestions(null);
    setIsAnalysisModalOpen(false);
    toast.success("Todas as características de personalidade foram aprovadas e salvas com sucesso!");
  };

  // Gerador das 10 variantes de Copy ADS (Alimentado por Posicionamento + Personalidade Real do Expert - AJ-017)
  const handleGenerateAllCopyAds = async () => {
    setIsGeneratingCopyAds(true);
    toast.info("Gerando 10 variantes modulares integradas à personalidade real do expert...");

    setTimeout(async () => {
      // Coleta dados dos outros módulos, incluindo a Personalidade do Expert (AJ-017)
      const answersMap: Record<string, string> = {};
      brandManual.fields.forEach((f) => {
        if (f.response) answersMap[f.id] = f.response;
      });

      const solucao = answersMap["pos_01"] || "uma esteira comercial inteligente";
      const mecanismo = answersMap["pos_02"] || "o método Playbook 7D";
      const antes = answersMap["pos_03"] || "perder tempo com curiosos";

      // Identidade verbal real do expert (AJ-017)
      const vicios = (answersMap["per_01"] || "").split(",")[0]?.replace(/['"]/g, "").trim();
      const giria = (answersMap["per_02"] || "").split(",")[0]?.replace(/['"]/g, "").trim();
      const bordao = (answersMap["per_03"] || "").split(",")[0]?.replace(/['"]/g, "").trim();
      const humor = (answersMap["per_06"] || "").toLowerCase();

      // Ajustes de tom conforme a identidade
      const touchSlang = giria ? `sem passar perrengue` : `sem perder tempo`;
      const touchIntro = bordao ? `${bordao}: ` : "";

      const updatedVariants: Partial<CopyAdVariant>[] = [
        {
          id: "var_01",
          headline: `${touchIntro}Cansado de ${antes.slice(0, 50)} ${touchSlang}?`,
          subheadline: `Conheça a solução validada que organiza sua comunicação e traz compradores qualificados todo santo dia.`,
        },
        {
          id: "var_02",
          headline: `Como ${mecanismo.slice(0, 50)} elimina o improviso nas suas vendas.`,
          subheadline: `Uma esteira de qualificação que separa os compradores reais dos meros curiosos de forma cirúrgica.`,
        },
        {
          id: "var_03",
          headline: `Por que postar conteúdo o dia inteiro não resolve suas vendas.`,
          subheadline: `Descubra a brecha de mercado que os maiores players usam para fechar contrato direto no WhatsApp.`,
        },
        {
          id: "var_04",
          headline: `De reuniões cansativas para fechamentos rápidos em menos de 15 minutos.`,
          subheadline: `Resultados reais de quem substituiu o amadorismo pela Arquitetura 7D na prática.`,
        },
        {
          id: "var_05",
          headline: `Você sabe exatamente o que seu cliente ideal pensa antes de comprar?`,
          subheadline: `Alinhe sua comunicação com o desejo real de quem tem orçamento disponível agora.`,
        },
        {
          id: "var_06",
          headline: `Antes: agenda cheia de curiosos. Depois: previsibilidade de caixa.`,
          subheadline: `Veja a transformação na rotina ao implementar ${solucao.slice(0, 55)}.`,
        },
        {
          id: "var_07",
          headline: `Chega de perder tempo negociando com quem não tem orçamento.`,
          subheadline: `Filtre automaticamente seus leads e foque sua energia apenas em quem realmente fecha contrato.`,
        },
        {
          id: "var_08",
          headline: `A brecha oculta que qualifica clientes de alto ticket em escala.`,
          subheadline: `Acesse o framework comercial que transforma leads frios em compradores engajados.`,
        },
        {
          id: "var_09",
          headline: `Quanto dinheiro você perde a cada lead que esfria sem resposta rápida?`,
          subheadline: `Recupere o controle da sua esteira e nunca mais deixe uma oportunidade lucrativa na mesa.`,
        },
        {
          id: "var_10",
          headline: `Dê o próximo passo e implemente sua máquina comercial agora.`,
          subheadline: `Clique abaixo para agendar sua sessão estratégica e destravar seu crescimento.`,
        },
      ];

      await mutate((ws, ctx) => {
        updatedVariants.forEach((uv) => {
          if (!uv.id) return;
          const existing = ws.brandManual?.copyAds.find((c) => c.id === uv.id);
          // Não sobrescreve se a variante já estiver aprovada pelo usuário! (Section 8)
          if (existing && existing.status !== "approved") {
            updateCopyAdVariant(ws, ctx, uv.id, {
              headline: uv.headline,
              subheadline: uv.subheadline,
            });
          }
        });
      }, user?.email || "IA Estratégica");

      setIsGeneratingCopyAds(false);
      toast.success("10 Variantes geradas com a personalidade do expert! As variantes já aprovadas foram preservadas.");
    }, 1200);
  };

  // Regenerar variante individual
  const handleRegenerateSingleVariant = async (variant: CopyAdVariant) => {
    toast.info(`Regenerando variante ${variant.variantNumber}...`);
    setTimeout(async () => {
      const newHeadlines = [
        `O segredo para transformar sua comunicação em uma máquina de vendas.`,
        `Como fechar contratos de alto ticket sem parecer insistente.`,
        `A virada de chave que especialistas utilizam para escalar no X1.`,
        `Pare de improvisar nas negociações: use um script que converte.`,
      ];
      const randomHeadline = newHeadlines[Math.floor(Math.random() * newHeadlines.length)];

      await mutate((ws, ctx) => {
        updateCopyAdVariant(ws, ctx, variant.id, {
          headline: randomHeadline,
          subheadline: `Nova variação estratégica focada no ângulo: ${variant.angle}.`,
        });
      }, user?.email || "IA Estratégica");

      toast.success(`Variante ${variant.variantNumber} regenerada (versão atualizada)!`);
    }, 600);
  };

  // Copiar anúncio para a área de transferência
  const handleCopyAdText = (variant: CopyAdVariant) => {
    const fullText = `*${variant.headline}*\n\n${variant.subheadline}`;
    navigator.clipboard.writeText(fullText);
    toast.success(`Variante ${variant.variantNumber} copiada para o clipboard!`);
  };

  // Copiar Master Prompt Consolidado
  const getCompiledMasterPromptText = () => {
    const answersMap: Record<string, string> = {};
    brandManual.fields.forEach((f) => {
      if (f.response) answersMap[f.id] = f.response;
    });

    const lines: string[] = [
      `# MASTER PROMPT CONSOLIDADO — MANUAL DE MARCA 7D`,
      `**Projeto:** ${workspace.project.name}`,
      `**Data de Compilação:** ${new Date().toLocaleDateString("pt-BR")}`,
      `**Responsável:** ${user?.email || "Estrategista"}`,
      `\n---\n`,
      `## 1. POSICIONAMENTO E MECANISMO`,
      `- **O que vende / Solução:** ${answersMap["pos_01"] || "Não preenchido"}`,
      `- **Mecanismo / Diferencial:** ${answersMap["pos_02"] || "Não preenchido"}`,
      `- **Transformação Prática:** ${answersMap["pos_03"] || "Não preenchido"}`,
      `- **Crença Central / Contradição:** ${answersMap["pos_04"] || "Não preenchido"}`,
      `\n---\n`,
      `## 2. ALMA DA COPY`,
      `- **Origem da Solução (Dor-Mãe):** ${answersMap["alm_01"] || "Não preenchido"}`,
      `- **Mudança de Comportamento:** ${answersMap["alm_02"] || "Não preenchido"}`,
      `- **Consequência Real (Desejo-Mãe):** ${answersMap["alm_03"] || "Não preenchido"}`,
      `\n---\n`,
      `## 3. RAIO X DO ICP`,
      `- **Situação Real do Problema:** ${answersMap["icp_01"] || "Não preenchido"}`,
      `- **Antes e Depois Concreto:** ${answersMap["icp_02"] || "Não preenchido"}`,
      `- **Pensamento e Frase Real do Cliente:** ${answersMap["icp_03"] || "Não preenchido"}`,
      `\n---\n`,
      `## 4. PERSONALIDADE DO EXPERT`,
      `- **Vícios de linguagem:** ${answersMap["per_01"] || "Não preenchido"}`,
      `- **Gírias e dialetos:** ${answersMap["per_02"] || "Não preenchido"}`,
      `- **Frases e expressões próprias:** ${answersMap["per_03"] || "Não preenchido"}`,
      `- **Frases quebradas e construção verbal:** ${answersMap["per_04"] || "Não preenchido"}`,
      `- **Maneira de explicar:** ${answersMap["per_05"] || "Não preenchido"}`,
      `- **Humor e intensidade:** ${answersMap["per_06"] || "Não preenchido"}`,
      `- **Palavras que nunca usaria:** ${answersMap["per_07"] || "Não preenchido"}`,
      `- **Exemplos reais de fala:** ${answersMap["per_08"] || "Não preenchido"}`,
      `\n---\n`,
      `## 5. COPY ADS — 10 VARIANTES HOMOLOGADAS`,
    ];

    brandManual.copyAds.forEach((c) => {
      lines.push(`### Variante ${c.variantNumber} [${c.angle}] (${c.status.toUpperCase()})`);
      lines.push(`**Headline:** ${c.headline}`);
      lines.push(`**Subheadline:** ${c.subheadline}\n`);
    });

    return lines.join("\n");
  };

  const handleCopyMasterPrompt = () => {
    const text = getCompiledMasterPromptText();
    navigator.clipboard.writeText(text);
    toast.success("Master Prompt Consolidado copiado para o clipboard!");
  };

  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ==========================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. CABEÇALHO COMPACTO E INTELIGENTE (Seção 13) */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black tracking-tight text-foreground">
                Manual de Marca 7D
              </h1>
              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${overallStatusBadge.color}`}>
                {overallStatusBadge.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-muted text-muted-foreground border-none">
                {completedFieldsCount} de {allActiveFields.length} respondidos ({progressPercent}%)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Briefing inteligente, modular e editável baseado no produto e transformação real.
            </p>
          </div>
        </div>

        {/* Lado Direito: Barra de Progresso + Toggle de Papel + Ações Globais */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mini Barra de Progresso */}
          <div className="w-28 hidden lg:block mr-2">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-1">
              <span>Conclusão</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-muted" />
          </div>

          {/* Botão Link Público de Coleta do Cliente */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBrandManualShareModalOpen(true)}
            className="h-8 px-2.5 text-xs rounded-xl flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-bold"
            title="Configurar e copiar o link público para o cliente preencher o briefing uma única vez"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Link Público</span>
            {brandManual.publicShareConfig?.status === "completed" && (
              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Concluído pelo cliente" />
            )}
          </Button>

          {/* Botão Master Prompt Consolidado */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMasterPromptOpen(true)}
            className="h-8 px-2.5 text-xs rounded-xl flex items-center gap-1.5 border-border"
            title="Visualizar e copiar o Master Prompt Consolidado com todas as respostas e inteligência gerada"
          >
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Master Prompt</span>
          </Button>

          {/* Botão Exportar Manual da Marca em Markdown (.md) */}
          <Button
            size="sm"
            variant="outline"
            disabled={completedFieldsCount === 0}
            onClick={() =>
              downloadBrandManualMarkdown(
                workspace.project.name || "manual-da-marca",
                brandManual,
                user?.email || "Estrategista"
              )
            }
            className={cn(
              "h-8 px-2.5 text-xs rounded-xl flex items-center gap-1.5 transition-all font-semibold cursor-pointer",
              completedFieldsCount > 0
                ? progressPercent === 100
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-2xs font-bold"
                  : "border-primary/40 text-primary hover:bg-primary/10"
                : "opacity-40 cursor-not-allowed"
            )}
            title={
              completedFieldsCount > 0
                ? `Exportar o Manual da Marca em arquivo Markdown (.md) com todas as ${completedFieldsCount} respostas`
                : "Preencha as perguntas do manual para habilitar a exportação em .md"
            }
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar .md</span>
            {progressPercent === 100 && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </Button>

          {/* Botão Arquivados (Acesso discreto) */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsArchivedSheetOpen(true)}
            className="h-8 px-2 text-xs rounded-xl text-muted-foreground hover:text-foreground relative"
            title="Ver campos arquivados"
          >
            <FolderArchive className="h-3.5 w-3.5" />
            {archivedFields.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {archivedFields.length}
              </span>
            )}
          </Button>

          {/* Adicionar Pergunta */}
          <Button
            size="sm"
            onClick={() => handleOpenCreateField(activeModuleId)}
            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Pergunta</span>
          </Button>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO ENTRE OS 4 MÓDULOS OBRIGATÓRIOS (Seção 13) */}
      {!hideTopTabs && (
        <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-hide">
        {brandManual.modules.map((m) => {
          const isActive = m.id === activeModuleId;
          const moduleFields = brandManual.fields.filter((f) => f.moduleId === m.id && !f.archived && !f.removed);
          const answeredModuleCount = moduleFields.filter((f) => (f.response || "").trim().length > 15).length;

          return (
            <button
              key={m.id}
              onClick={() => setActiveModuleId(m.id)}
              className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <span>{m.title}</span>
              {m.id !== "copy_ads" ? (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                  }`}
                >
                  {answeredModuleCount}/{moduleFields.length}
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                  }`}
                >
                  10 variantes
                </span>
              )}
            </button>
          );
        })}
        </div>
      )}

      {/* 3. CONTEÚDO DO MÓDULO SELECIONADO */}
      <div className="space-y-5">
        {/* Banner do Módulo com Descrição e Ação de IA */}
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              {activeModule.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeModule.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {activeModuleId !== "copy_ads" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenCreateField(activeModuleId)}
                className="h-8 text-xs font-bold flex items-center gap-1.5 rounded-xl border-border hover:bg-card"
                title="Adicionar nova pergunta a este módulo"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nova Pergunta</span>
              </Button>
            )}

            {activeModuleId === "personalidade" ? (
              <Button
                size="sm"
                onClick={() => setIsAnalysisModalOpen(true)}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Brain className="h-3.5 w-3.5" />
                <span>Analisar comunicação com IA</span>
              </Button>
            ) : activeModuleId !== "copy_ads" ? (
              <Button
                size="sm"
                onClick={() => handleGenerateAnalysis(activeModuleId)}
                disabled={isGeneratingAnalysis}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isGeneratingAnalysis ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                <span>
                  {activeModuleId === "posicionamento"
                    ? "Gerar Análise de Posicionamento"
                    : activeModuleId === "alma_copy"
                    ? "Extrair Alma da Copy"
                    : "Gerar Raio X do ICP (22 Saídas)"}
                </span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleGenerateAllCopyAds}
                disabled={isGeneratingCopyAds}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isGeneratingCopyAds ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                <span>Gerar 10 Variantes (IA)</span>
              </Button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* MÓDULOS 01 A 04: PADRONIZADOS (POSICIONAMENTO, ALMA DA COPY, RAIO X DO ICP, PERSONALIDADE) */}
        {/* ---------------------------------------------------- */}
        {(activeModuleId === "posicionamento" || activeModuleId === "alma_copy" || activeModuleId === "raio_x_icp" || activeModuleId === "personalidade") && (
          <div className="space-y-4">
            {activeFields.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
                <p className="text-xs text-muted-foreground">Nenhuma pergunta ativa neste módulo.</p>
                <Button
                  size="sm"
                  onClick={() => handleOpenCreateField(activeModuleId)}
                  className="mt-3 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Primeira Pergunta
                </Button>
              </div>
            ) : (
              activeFields.map((field, index) => {
                const responseValue = localResponses[field.id] ?? field.response ?? "";
                const isRecording = recordingFieldId === field.id;
                const isSaved = savingStatus[field.id] === "saved";
                const isSaving = savingStatus[field.id] === "saving";
                const isPresetExpanded = !!expandedPresets[field.id];

                return (
                  <div
                    key={field.id}
                    draggable={true}
                    onDragStart={() => setDraggedFieldId(field.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFieldId(field.id);
                    }}
                    onDrop={async () => {
                      if (!draggedFieldId || draggedFieldId === field.id) return;
                      const list = [...activeFields];
                      const fromIdx = list.findIndex((f) => f.id === draggedFieldId);
                      const toIdx = list.findIndex((f) => f.id === field.id);
                      if (fromIdx !== -1 && toIdx !== -1) {
                        const [moved] = list.splice(fromIdx, 1);
                        list.splice(toIdx, 0, moved);
                        const orderedIds = list.map((f) => f.id);
                        await mutate((ws, ctx) => {
                          reorderBrandManualFields(ws, ctx, activeModuleId, orderedIds);
                        }, user?.email || "Estrategista");
                      }
                      setDraggedFieldId(null);
                      setDragOverFieldId(null);
                    }}
                    id={`brand-field-${field.id}`}
                    className={`bg-card border rounded-2xl p-5 shadow-xs transition-all ${
                      dragOverFieldId === field.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                    } hover:border-border/80`}
                  >
                    {/* Linha Superior do Card: Numeração, Título, Drag Handle e Menu de Ações */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span
                          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground mt-1 shrink-0"
                          title="Arraste para reordenar"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              Pergunta {index + 1}
                            </span>
                            {field.required && (
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                *Obrigatório
                              </span>
                            )}
                            {/* Mapeamentos Semânticos */}
                            {field.strategicMapping && field.strategicMapping.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {field.strategicMapping.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 1. TÍTULO / PERGUNTA */}
                          <h3 className="text-sm font-bold text-foreground leading-snug">
                            {field.title}
                          </h3>

                          {/* 2. CONTEXTO EXPLICATIVO */}
                          {field.context && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {field.context}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botões Rápidos e Menu de Três Pontos */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditField(field)}
                          className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground rounded-xl"
                          title="Editar pergunta"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-primary" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setFieldToDelete(field)}
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 rounded-xl"
                          title="Excluir pergunta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl shrink-0"
                              title="Mais opções"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl shadow-xl">
                            <DropdownMenuItem
                              onClick={() => handleOpenEditField(field)}
                              className="cursor-pointer text-xs"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Editar Pergunta
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateField(field.id)}
                              className="cursor-pointer text-xs"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Duplicar Pergunta
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                mutate((ws) => {
                                  const req = createAudioRequest(ws, {
                                    code: `AUD-BM-${field.id.slice(0, 4).toUpperCase()}`,
                                    title: `Gravação: ${field.title || "Pergunta do Manual de Marca"}`,
                                    target: field.title,
                                    context: `Pergunta do Manual de Marca (${activeModule?.title || "Manual de Marca"}). ${field.context || ""}`,
                                    outline: `Responda detalhadamente à pergunta:\n"${field.title}"\nUse exemplos reais e linguagem natural do expert.`,
                                    responsible: "Expert PVD",
                                    category: "brand_manual",
                                    originTab: "brand_manual",
                                    originId: field.id,
                                    durationExpectedSec: 90,
                                    preset: field.preset || "Resumo Estratégico",
                                  });
                                  toast.success(`🎙️ Solicitação criada (${req.code}). Redirecionando...`);
                                });
                                setActiveTab("scripts_and_audios");
                              }}
                              className="cursor-pointer text-xs text-primary font-medium"
                            >
                              <Mic className="h-3.5 w-3.5 mr-2" />
                              Solicitar por Áudio
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleMoveField(field.id, "up")}
                              disabled={index === 0}
                              className="cursor-pointer text-xs"
                            >
                              <ChevronUp className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Mover para Cima
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMoveField(field.id, "down")}
                              disabled={index === activeFields.length - 1}
                              className="cursor-pointer text-xs"
                            >
                              <ChevronDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Mover para Baixo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleArchiveField(field.id)}
                              className="cursor-pointer text-xs text-amber-600 dark:text-amber-400"
                            >
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Arquivar Pergunta
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setFieldToDelete(field)}
                              className="cursor-pointer text-xs text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Remover Pergunta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* 3. CAMPO DE RESPOSTA + BOTÃO DE MICROFONE */}
                    <div className="mt-3.5 relative">
                      <Textarea
                        value={responseValue}
                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                        placeholder="Digite sua resposta aqui ou use o microfone para responder por voz..."
                        rows={3}
                        className="text-xs bg-background/80 border-input text-foreground rounded-xl resize-y min-h-[90px] pr-28 pb-7 focus-visible:ring-1 focus-visible:ring-primary"
                      />

                      {/* Botão de Microfone & Gravador de Voz Embutido */}
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
                          className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                            isRecording ? "animate-pulse" : ""
                          }`}
                          title={isRecording ? "Clique para finalizar a gravação" : "Gravar resposta por voz (transcrição automática)"}
                        >
                          {isRecording ? (
                            <>
                              <MicOff className="h-3.5 w-3.5" />
                              <span>Parar</span>
                            </>
                          ) : (
                            <>
                              <Mic className="h-3.5 w-3.5 text-primary" />
                              <span className="hidden sm:inline">Gravar Voz</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 5. PRESET / EXEMPLO RECOLHÍVEL */}
                    {field.preset && (
                      <div className="mt-3">
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
                          <span>{isPresetExpanded ? "Ocultar exemplo de preenchimento" : "💡 Ver exemplo de preenchimento (Preset)"}</span>
                          {isPresetExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {isPresetExpanded && (
                          <div className="mt-2 p-3 bg-muted/60 border border-border/80 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-muted-foreground animate-in fade-in duration-200">
                            <p className="italic leading-relaxed flex-1">
                              "{field.preset}"
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleResponseChange(field.id, field.preset || "");
                                toast.success("Exemplo inserido na caixa de resposta para você personalizar!");
                              }}
                              className="h-6 text-[10px] px-2 rounded-lg shrink-0 border-border"
                            >
                              Usar como base
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Visualização da Análise Estratégica do Módulo 03: RAIO X DO ICP (22 Saídas Analíticas) */}
            {activeModuleId === "raio_x_icp" && activeModule.generatedAnalysis?.outputs && (
              <div className="mt-8 bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      22
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">
                        Raio X do ICP — 22 Saídas Analíticas Homologadas
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Geradas automaticamente a partir das respostas do Expert sem exigência de preenchimento manual massivo.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const text = Object.entries(activeModule.generatedAnalysis.outputs)
                        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                        .join("\n\n");
                      navigator.clipboard.writeText(text);
                      toast.success("22 Saídas analíticas copiadas!");
                    }}
                    className="h-8 text-xs rounded-xl"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    Copiar 22 Saídas
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ICP_22_OUTPUT_KEYS.map((item) => {
                    const outputValue = activeModule.generatedAnalysis.outputs[item.key] || "Em processamento...";
                    return (
                      <div key={item.key} className="p-3.5 bg-muted/30 border border-border/80 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-foreground">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {item.desc}
                        </p>
                        <p className="text-xs text-foreground/90 font-medium pt-1 leading-relaxed">
                          {outputValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visualização da Análise Estratégica Sintetizada para Posicionamento, Alma da Copy ou Personalidade */}
            {activeModuleId !== "raio_x_icp" && activeModule.generatedAnalysis && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Inteligência Estratégica Sintetizada ({activeModule.title})</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                    Aprovado para Copy
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {Object.entries(activeModule.generatedAnalysis).map(([k, val]: [string, any]) => {
                    if (typeof val === "object" && !Array.isArray(val)) return null;
                    return (
                      <div key={k} className="p-3 bg-card border border-border rounded-xl">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-0.5">
                          {k.replace(/([A-Z])/g, " $1")}
                        </span>
                        <div className="font-medium text-foreground leading-relaxed">
                          {Array.isArray(val) ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {val.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            val
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MÓDULO 04: COPY ADS (10 Variantes Modulares)          */}
        {/* ---------------------------------------------------- */}
        {activeModuleId === "copy_ads" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brandManual.copyAds.map((variant) => {
                const isApproved = variant.status === "approved";

                return (
                  <div
                    key={variant.id}
                    className={`bg-card border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isApproved ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Topo do Card: Número da Variante, Ângulo Estratégico e Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-muted text-foreground">
                            VARIANTE {String(variant.variantNumber).padStart(2, "0")}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/20 bg-primary/5">
                            {variant.angle}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            v{variant.version.toFixed(1)}
                          </span>
                        </div>

                        {/* Status da Variante */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const newStatus = isApproved ? "draft" : "approved";
                              await mutate((ws, ctx) => {
                                updateCopyAdVariant(ws, ctx, variant.id, { status: newStatus });
                              }, user?.email || "Estrategista");
                              toast.success(newStatus === "approved" ? "Variante aprovada!" : "Variante marcada como rascunho");
                            }}
                            className={`h-6 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                              isApproved
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>{isApproved ? "Aprovado" : "Aprovar"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Headline (Editável inline) */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground/70 font-bold block mb-1">
                          Headline:
                        </span>
                        <Input
                          value={variant.headline}
                          onChange={(e) => {
                            const val = e.target.value;
                            mutate((ws, ctx) => {
                              updateCopyAdVariant(ws, ctx, variant.id, { headline: val });
                            }, user?.email || "Estrategista");
                          }}
                          className="h-8 text-xs font-bold bg-background text-foreground border-input rounded-lg"
                        />
                      </div>

                      {/* Subheadline (Editável inline) */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground/70 font-bold block mb-1">
                          Subheadline:
                        </span>
                        <Textarea
                          value={variant.subheadline}
                          onChange={(e) => {
                            const val = e.target.value;
                            mutate((ws, ctx) => {
                              updateCopyAdVariant(ws, ctx, variant.id, { subheadline: val });
                            }, user?.email || "Estrategista");
                          }}
                          rows={2}
                          className="text-xs bg-background text-foreground border-input rounded-lg resize-none"
                        />
                      </div>
                    </div>

                    {/* Ações da Variante: Regenerar Individualmente e Copiar */}
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRegenerateSingleVariant(variant)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1"
                        title="Regenerar somente esta variante sem alterar as demais"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Regenerar Ângulo</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyAdText(variant)}
                        className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1 border-border"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copiar Anúncio</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL: CRIAR OU EDITAR PERGUNTA (Modo Estrategista)   */}
      {/* ==================================================== */}
      <Dialog open={isFieldModalOpen} onOpenChange={setIsFieldModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingField ? "Editar Pergunta Modular" : "Adicionar Nova Pergunta"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a pergunta, contexto, presets e mapeamento estratégico sem alterar o código-fonte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Título da Pergunta / Campo *
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: O que você faz de diferente para produzir esse resultado?"
                className="text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Contexto Explicativo (Instrução para o Expert)
              </label>
              <Textarea
                value={formContext}
                onChange={(e) => setFormContext(e.target.value)}
                placeholder="Explique com clareza o que o cliente enfrenta hoje, sem termos técnicos..."
                rows={2}
                className="text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Preset de Preenchimento (Exemplo Modelo)
              </label>
              <Textarea
                value={formPreset}
                onChange={(e) => setFormPreset(e.target.value)}
                placeholder="Ex: Meu produto é [solução]. Ele atende [público] que enfrenta [situação]..."
                rows={2}
                className="text-xs bg-background border-input text-foreground rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Módulo de Destino
                </label>
                <select
                  value={formTargetModuleId}
                  onChange={(e) => setFormTargetModuleId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="posicionamento">1. Posicionamento</option>
                  <option value="alma_copy">2. Alma da Copy</option>
                  <option value="raio_x_icp">3. Raio X do ICP</option>
                  <option value="personalidade">4. Personalidade</option>
                  <option value="copy_ads">5. Copy ADS</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Tipo de Entrada
                </label>
                <select
                  value={formInputType}
                  onChange={(e) => setFormInputType(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="textarea">Texto Longo (Padrão)</option>
                  <option value="text">Texto Curto</option>
                  <option value="audio">Áudio Obrigatório</option>
                  <option value="number">Número</option>
                  <option value="url">Link / URL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Mapeamento Semântico para IA (Tags separadas por vírgula)
              </label>
              <Input
                value={formMapping}
                onChange={(e) => setFormMapping(e.target.value)}
                placeholder="Ex: produto, mecanismo, dor-mãe, transformacao"
                className="text-xs bg-background border-input text-foreground rounded-xl font-mono text-[11px]"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Permite que os motores de IA interpretem a resposta mesmo se você renomear a pergunta.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFieldModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveFieldForm}
              className="text-xs bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO SEGURA                */}
      {/* ==================================================== */}
      <Dialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
              Remover Pergunta da Estrutura
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você tem certeza que deseja remover "{fieldToDelete?.title}"? Para não perder histórico, recomendamos arquivar o campo ao invés de remover.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFieldToDelete(null)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmDeleteField}
              className="text-xs rounded-xl font-bold"
            >
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* SHEET: CAMPOS ARQUIVADOS (Acesso Discreto)           */}
      {/* ==================================================== */}
      <Sheet open={isArchivedSheetOpen} onOpenChange={setIsArchivedSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border p-6 text-card-foreground">
          <SheetHeader>
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-primary" />
              Perguntas Arquivadas ({archivedFields.length})
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Campos arquivados não aparecem para o Expert no preenchimento ativo, mas seus dados e históricos continuam preservados.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-3 overflow-y-auto max-h-[78vh]">
            {archivedFields.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Nenhum campo arquivado até o momento.
              </div>
            ) : (
              archivedFields.map((f) => (
                <div key={f.id} className="p-3.5 bg-muted/40 border border-border rounded-2xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        Módulo: {f.moduleId}
                      </span>
                      <h4 className="text-xs font-bold text-foreground mt-1">{f.title}</h4>
                    </div>
                  </div>
                  {f.response && (
                    <p className="text-[11px] text-muted-foreground italic truncate">
                      Resposta salva: "{f.response.slice(0, 70)}..."
                    </p>
                  )}
                  <div className="flex items-center justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreField(f.id)}
                      className="h-7 text-xs rounded-xl flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restaurar Campo</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ==================================================== */}
      {/* MODAL: MASTER PROMPT CONSOLIDADO (Compilação Final)  */}
      {/* ==================================================== */}
      <Dialog open={isMasterPromptOpen} onOpenChange={setIsMasterPromptOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] rounded-3xl bg-card border border-border text-card-foreground flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Master Prompt Consolidado — Manual de Marca 7D
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Estrutura consolidada pronta para ser copiada e utilizada em qualquer modelo de IA (Gemini, Claude, GPT).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-2">
            <pre className="p-4 bg-muted/50 border border-border/80 rounded-2xl text-[11px] font-mono leading-relaxed text-foreground whitespace-pre-wrap select-all">
              {getCompiledMasterPromptText()}
            </pre>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2 border-t border-border flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMasterPromptOpen(false)}
              className="text-xs rounded-xl"
            >
              Fechar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadBrandManualMarkdown(
                  workspace.project.name || "manual-da-marca",
                  brandManual,
                  user?.email || "Estrategista"
                )
              }
              className="text-xs rounded-xl flex items-center gap-1.5 border-border hover:bg-muted font-medium"
              title="Baixar arquivo Markdown completo"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Baixar Arquivo .md</span>
            </Button>
            <Button
              size="sm"
              onClick={handleCopyMasterPrompt}
              className="text-xs bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar Master Prompt</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL: ANALISAR COMUNICAÇÃO COM IA (AJ-017)          */}
      {/* ==================================================== */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] rounded-3xl bg-card border border-border text-card-foreground flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Analisar Comunicação com IA — Identidade Verbal Real do Expert
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cole transcrições de vídeos, áudios, lives, reuniões ou textos escritos pelo expert. A IA identificará vícios, gírias, frases típicas e nível de intensidade para preencher a personalidade com sugestões editáveis.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Campo de Entrada de Transcrição */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Amostras Reais de Comunicação (Transcrições, Áudios ou Textos) *
              </label>
              <Textarea
                value={rawTranscriptsInput}
                onChange={(e) => setRawTranscriptsInput(e.target.value)}
                placeholder="Cole aqui a transcrição de um vídeo, áudio de WhatsApp, live ou reunião do expert (mínimo de 50 caracteres)..."
                rows={4}
                className="text-xs bg-background border-input text-foreground rounded-2xl resize-y min-h-[110px]"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 flex-wrap gap-2">
                <span>{rawTranscriptsInput.length} caracteres inseridos</span>
                <Button
                  size="sm"
                  onClick={handleAnalyzeTranscripts}
                  disabled={isAnalyzingTranscripts || rawTranscriptsInput.trim().length < 20}
                  className="h-7 text-xs bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-1.5"
                >
                  {isAnalyzingTranscripts ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  <span>Identificar Padrões Verbais com IA</span>
                </Button>
              </div>
            </div>

            {/* Sugestões Geradas para Revisão */}
            {analysisSuggestions && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Sugestões Extraídas para os 8 Campos (Revise e aprove individualmente)
                  </span>
                  <Button
                    size="sm"
                    onClick={handleApproveAllSuggestions}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Check className="h-3 w-3" />
                    <span>Aprovar Todos os Campos</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {[
                    { id: "per_01", label: "1. Vícios de linguagem" },
                    { id: "per_02", label: "2. Gírias e dialetos" },
                    { id: "per_03", label: "3. Frases e expressões próprias" },
                    { id: "per_04", label: "4. Frases quebradas e construção" },
                    { id: "per_05", label: "5. Maneira de explicar" },
                    { id: "per_06", label: "6. Humor e intensidade" },
                    { id: "per_07", label: "7. Palavras que nunca usaria" },
                    { id: "per_08", label: "8. Exemplos reais de fala" },
                  ].map((fieldMeta) => {
                    const suggestionVal = editableSuggestions[fieldMeta.id] ?? analysisSuggestions[fieldMeta.id] ?? "";
                    const isPending = !!analysisSuggestions[fieldMeta.id];

                    return (
                      <div key={fieldMeta.id} className="p-3 bg-muted/40 border border-border/80 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-foreground">
                            {fieldMeta.label}
                          </span>
                          {isPending ? (
                            <span className="text-[9px] font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              Sugestão IA
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Aprovado
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={suggestionVal}
                          onChange={(e) =>
                            setEditableSuggestions((prev) => ({
                              ...prev,
                              [fieldMeta.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="text-xs bg-background border-input text-foreground rounded-xl resize-none"
                        />

                        {isPending && (
                          <div className="flex justify-end pt-1 gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAnalysisSuggestions((prev) => {
                                  if (!prev) return null;
                                  const next = { ...prev };
                                  delete next[fieldMeta.id];
                                  return next;
                                });
                              }}
                              className="h-6 text-[10px] px-2 rounded-lg text-muted-foreground hover:text-foreground"
                            >
                              Rejeitar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveSuggestion(fieldMeta.id)}
                              className="h-6 text-[10px] px-2.5 bg-primary text-primary-foreground rounded-lg font-bold"
                            >
                              Aprovar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAnalysisModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandManualView;
