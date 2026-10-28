import React, { useState, useEffect, useRef } from "react";
import * as RouterDom from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Instagram,
  Sparkles,
  Plus,
  BookOpen,
  Film,
  Send,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  CalendarDays,
  LayoutDashboard,
  Brain,
  TrendingUp,
  ListTodo,
  Layers,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Palette,
  Mic,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount } from "@/types/criafy";
import { useSprintOSStore } from "@/features/sprint-os/state/sprintOsStore";

// Sub-views
import { CriafyOverviewView } from "@/components/criafy/CriafyOverviewView";
import { CriafyDemandsView } from "@/components/criafy/CriafyDemandsView";
import { CriafyPlannerView } from "@/components/criafy/CriafyPlannerView";
import { CriafyStrategistView } from "@/components/criafy/CriafyStrategistView";
import { CriafyInsightsView } from "@/components/criafy/CriafyInsightsView";
import { MediaLibraryView } from "@/components/criafy/MediaLibraryView";
import { PublicationsView } from "@/components/criafy/PublicationsView";
import { QueueRulesView } from "@/components/criafy/QueueRulesView";
import { CriafyCalendarView } from "@/components/criafy/CriafyCalendarView";
import { CriafyBrandManualView } from "@/components/criafy/CriafyBrandManualView";
import { AddAccountModal } from "@/components/criafy/AddAccountModal";
import { AccountBriefingModal } from "@/components/criafy/AccountBriefingModal";
import { InstagramFeedModal } from "@/components/criafy/InstagramFeedModal";
import { AccountCompactCard } from "@/components/criafy/AccountCompactCard";
import { AccountInsightsModal } from "@/components/criafy/AccountInsightsModal";
import { useCriafyAutoScheduler } from "@/hooks/useCriafyAutoScheduler";
import { CriafySidebarIcon, CriafyLogo } from "@/components/criafy/CriafyBrandIcons";

type CriafyTabId =
  | "visao-geral"
  | "demandas"
  | "planner"
  | "calendario"
  | "conteudos"
  | "publicacoes"
  | "estrategista"
  | "manual-marca"
  | "insights"
  | "contas"
  | "fila";

export default function CriafyHub() {
  const { activeCompany, activeCompanyId } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate =
    typeof RouterDom.useNavigate === "function" ? RouterDom.useNavigate() : () => {};

  // Auto-scheduler em segundo plano para publicações que atingiram o horário
  useCriafyAutoScheduler(activeCompanyId);

  const { activeTab: sprintActiveTab, setActiveTab: setSprintActiveTab } =
    useSprintOSStore();

  const currentBrandManualSubTab = (
    ["brand_manual", "creatives", "scripts_and_audios"].includes(sprintActiveTab)
      ? sprintActiveTab
      : "brand_manual"
  ) as "brand_manual" | "creatives" | "scripts_and_audios";

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        return localStorage.getItem("criafy_sidebar_collapsed") === "true";
      }
    } catch {
      // ignore
    }
    return false;
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          localStorage.setItem("criafy_sidebar_collapsed", String(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Active module tab
  const [activeModuleTab, setActiveModuleTab] = useState<CriafyTabId>(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "manual-marca" ||
      tabParam === "manual_marca" ||
      tabParam === "brand_manual" ||
      tabParam === "manual"
    ) {
      return "manual-marca";
    }
    if (tabParam === "fila") {
      return "publicacoes";
    }
    if (
      tabParam &&
      [
        "visao-geral",
        "demandas",
        "planner",
        "calendario",
        "conteudos",
        "publicacoes",
        "estrategista",
        "manual-marca",
        "insights",
        "contas",
      ].includes(tabParam)
    ) {
      return tabParam as CriafyTabId;
    }
    return "visao-geral";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "manual-marca" ||
      tabParam === "manual_marca" ||
      tabParam === "brand_manual" ||
      tabParam === "manual"
    ) {
      setActiveModuleTab("manual-marca");
    } else if (tabParam === "fila") {
      setActiveModuleTab("publicacoes");
    } else if (
      tabParam &&
      [
        "visao-geral",
        "demandas",
        "planner",
        "calendario",
        "conteudos",
        "publicacoes",
        "estrategista",
        "manual-marca",
        "insights",
        "contas",
      ].includes(tabParam)
    ) {
      setActiveModuleTab(tabParam as CriafyTabId);
    }
  }, [searchParams]);

  const handleTabChange = (value: CriafyTabId) => {
    setActiveModuleTab(value);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams, { replace: true });
  };

  const handleBrandManualSubTabChange = (
    subTab: "brand_manual" | "creatives" | "scripts_and_audios"
  ) => {
    setSprintActiveTab(subTab);
    if (activeModuleTab !== "manual-marca") {
      handleTabChange("manual-marca");
    }
  };

  const [accounts, setAccounts] = useState<CriafyInstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const processedOAuthCallbackRef = useRef<string | null>(null);

  // Search and view mode for accounts
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [accountViewMode, setAccountViewMode] = useState<"grid" | "list">("grid");

  // Selected Account Filter for calendar/media
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  // Modals state
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);
  const [selectedBriefingAccount, setSelectedBriefingAccount] =
    useState<CriafyInstagramAccount | null>(null);
  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [selectedFeedAccount, setSelectedFeedAccount] =
    useState<CriafyInstagramAccount | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Insights Modal state
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [selectedInsightsAccount, setSelectedInsightsAccount] =
    useState<CriafyInstagramAccount | null>(null);
  const [insightsInitialTab, setInsightsInitialTab] =
    useState<"OVERVIEW" | "CONTENT" | "AUDIENCE">("OVERVIEW");

  const openInsightsModal = (
    acc: CriafyInstagramAccount,
    tab: "OVERVIEW" | "CONTENT" | "AUDIENCE" = "OVERVIEW"
  ) => {
    setSelectedInsightsAccount(acc);
    setInsightsInitialTab(tab);
    setInsightsModalOpen(true);
  };

  function extractCompanyIdFromState(rawState: string | null): string | null {
    if (!rawState) return null;
    try {
      const cleanState = rawState.replace(/#_.*$/, "").replace(/#.*$/, "").trim();
      const payloadPart = cleanState.split(".")[0];
      if (!payloadPart) return null;
      const padded = payloadPart
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
      const decoded = atob(padded);
      const parsed = JSON.parse(decoded);
      return parsed.companyId || null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CRIAFY_OAUTH_SUCCESS") {
        const count = event.data.count || 1;
        toast.success(`Sucesso! ${count} conta(s) do Instagram conectada(s).`, {
          id: "oauth-process",
        });
        if (
          event.data.accounts &&
          Array.isArray(event.data.accounts) &&
          event.data.accounts.length > 0
        ) {
          setAccounts((prev) => {
            const map = new Map();
            [...event.data.accounts, ...prev].forEach((acc) => map.set(acc.id, acc));
            return Array.from(map.values());
          });
        }
        loadAccounts();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeCompanyId]);

  useEffect(() => {
    const hasOAuthParams = searchParams.has("code") || searchParams.has("error");
    if (activeCompanyId || hasOAuthParams) {
      handleOAuthCallback();
    } else {
      setLoading(false);
    }
  }, [activeCompanyId, searchParams]);

  const handleOAuthCallback = async () => {
    const rawCode = searchParams.get("code");
    const rawState = searchParams.get("state");
    const oauthError =
      searchParams.get("error_description") || searchParams.get("error");

    const targetCompanyId = activeCompanyId || extractCompanyIdFromState(rawState);
    if (!targetCompanyId && !oauthError) {
      if (!activeCompanyId) setLoading(false);
      return;
    }

    const clearOAuthParams = () => {
      const nextParams = new URLSearchParams(searchParams);
      ["code", "state", "error", "error_reason", "error_description"].forEach(
        (key) => {
          nextParams.delete(key);
        }
      );
      setSearchParams(nextParams, { replace: true });
      window.history.replaceState(null, "", window.location.pathname);
    };

    if (oauthError) {
      toast.error(
        `Autorização do Instagram cancelada ou recusada: ${oauthError}`,
        { duration: 8000 }
      );
      clearOAuthParams();
      if (window.opener && window.opener !== window) {
        setTimeout(() => window.close(), 1500);
      } else {
        await loadAccounts();
      }
      return;
    }

    if (rawCode) {
      const cleanCode = rawCode.replace(/#_.*$/, "").replace(/#.*$/, "").trim();
      const cleanState = rawState
        ? rawState.replace(/#_.*$/, "").replace(/#.*$/, "").trim()
        : "";

      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(
            {
              type: "CRIAFY_OAUTH_CALLBACK",
              code: cleanCode,
              state: cleanState,
            },
            "*"
          );
        } catch (e) {
          console.error("Erro ao enviar mensagem via window.opener:", e);
        }
        clearOAuthParams();
        window.close();
        return;
      }

      const callbackKey = `${targetCompanyId}:${cleanCode}`;
      if (processedOAuthCallbackRef.current === callbackKey) return;
      processedOAuthCallbackRef.current = callbackKey;

      toast.loading("Processando autorização da Meta e conectando conta...", {
        id: "oauth-process",
      });
      try {
        if (!cleanState) {
          throw new Error(
            "Retorno OAuth sem state de segurança. Por favor, tente conectar novamente."
          );
        }
        const redirectUri = `${window.location.origin}/criafy`;
        const res = await criafyService.exchangeOAuthCode(
          targetCompanyId,
          cleanCode,
          redirectUri,
          cleanState
        );

        const count = res.count || (res.accounts ? res.accounts.length : 1);
        toast.success(`Sucesso! ${count} conta(s) do Instagram conectada(s).`, {
          id: "oauth-process",
        });

        if (res.accounts && Array.isArray(res.accounts) && res.accounts.length > 0) {
          setAccounts((prev) => {
            const map = new Map();
            [...res.accounts, ...prev].forEach((acc) => map.set(acc.id, acc));
            return Array.from(map.values());
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("[CriafyHub] Erro no OAuth callback:", err);
        toast.error(`Falha ao conectar conta via Meta OAuth: ${message}`, {
          id: "oauth-process",
          duration: 10000,
        });
      } finally {
        clearOAuthParams();
        await loadAccounts();
      }
      return;
    }

    await loadAccounts();
  };

  const loadAccounts = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const data = await criafyService.getAccounts(activeCompanyId);
      setAccounts(data);
    } catch (err: any) {
      toast.error(`Erro ao carregar contas do Criafy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckHealth = async (accountId: string) => {
    toast.loading("Verificando saúde do token Meta API...", { id: "health-check" });
    try {
      const res = await criafyService.checkAccountTokenHealth(accountId);
      if (res.valid) {
        toast.success("Token ativo e válido com a Meta Graph API!", {
          id: "health-check",
        });
      } else {
        toast.error(
          `Token expirado ou inválido: ${res.error || "Reconecte a conta"}`,
          { id: "health-check" }
        );
      }
      loadAccounts();
    } catch (err: any) {
      toast.error(`Erro ao verificar token: ${err.message}`, { id: "health-check" });
    }
  };

  const handleSyncProfile = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      toast.loading("Sincronizando dados com o Instagram...", { id: "sync-profile" });
      const updated = await criafyService.syncAccountProfile(accountId);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      toast.success("Perfil sincronizado com a Meta com sucesso!", {
        id: "sync-profile",
      });
    } catch (err: any) {
      toast.error(`Erro ao sincronizar perfil: ${err.message}`, {
        id: "sync-profile",
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const openBriefingModal = (account: CriafyInstagramAccount) => {
    navigate(`/criafy/estrategia/${account.id}`);
  };

  const openFeedModal = (account: CriafyInstagramAccount) => {
    setSelectedFeedAccount(account);
    setFeedModalOpen(true);
  };

  const sidebarGroups = [
    {
      title: "OPERAÇÃO",
      items: [
        {
          id: "visao-geral" as CriafyTabId,
          label: "Visão Geral",
          icon: LayoutDashboard,
          description:
            "Cockpit operacional: demandas do dia, conteúdos no planner e próximas publicações.",
        },
        {
          id: "demandas" as CriafyTabId,
          label: "Minhas Demandas",
          icon: ListTodo,
          description:
            "Central de demandas e execuções: gravações, aprovações, revisões e Stories Lite.",
        },
        {
          id: "planner" as CriafyTabId,
          label: "Planner",
          icon: Layers,
          description:
            "O que vamos produzir? Planejamento editorial, roteiros e campanhas.",
        },
        {
          id: "calendario" as CriafyTabId,
          label: "Calendário",
          icon: CalendarDays,
          description:
            "Quando vai ao ar? Agenda e horários de publicação.",
        },
        {
          id: "conteudos" as CriafyTabId,
          label: "Conteúdos",
          icon: Film,
          description:
            "Biblioteca e estoque de materiais produzidos: vídeos, carrosséis e fotos.",
        },
        {
          id: "publicacoes" as CriafyTabId,
          label: "Publicações",
          icon: Send,
          description:
            "O que foi ou será publicado: agendadas, histórico, fila automática e cadências.",
        },
      ],
    },
    {
      title: "ESTRATÉGIA & IA",
      items: [
        {
          id: "estrategista" as CriafyTabId,
          label: "Estrategista IA",
          icon: Brain,
          description:
            "Diagnóstico + Decisão + Plano de Ação conectado ao seu Manual da Marca.",
        },
        {
          id: "manual-marca" as CriafyTabId,
          label: "Manual da Marca",
          icon: BookOpen,
          description:
            "Memória estratégica geral: Posicionamento 7D, Alma da Copy, ICP e Personalidade.",
        },
        {
          id: "insights" as CriafyTabId,
          label: "Insights",
          icon: TrendingUp,
          description:
            "Performance e aprendizados acionáveis reais da sua audiência.",
        },
      ],
    },
    {
      title: "CONFIGURAÇÃO",
      items: [
        {
          id: "contas" as CriafyTabId,
          label: "Contas Conectadas",
          icon: Instagram,
          badge: accounts.length > 0 ? String(accounts.length) : undefined,
          description:
            "Gerencie perfis do Instagram conectados e integrações com a Meta.",
        },
      ],
    },
  ];

  const allSidebarItems = sidebarGroups.flatMap((g) => g.items);
  const currentTabInfo =
    allSidebarItems.find((item) => item.id === activeModuleTab) || allSidebarItems[0];

  const primaryAccount = accounts[0] || null;

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      {/* =========================================================
          SIDEBAR DESKTOP (Estilo Limpo c/ Grupos e Indicador Lateral)
         ========================================================= */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 border-r border-slate-200/80 dark:border-border/70 bg-[#FBFBFD] dark:bg-card/40 h-full select-none transition-all duration-200",
          sidebarCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* 1. Topo da Sidebar: Marca Criafy + Botão de Recolher */}
        <div
          className={cn(
            "flex items-center justify-between border-b border-slate-200/70 dark:border-border/60 px-4 py-4 shrink-0",
            sidebarCollapsed && "justify-center px-2"
          )}
        >
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-1 bg-card border border-border/70">
                <CriafyLogo className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-foreground">
                    Criafy
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 font-semibold"
                  >
                    App
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-muted-foreground truncate">
                  Instagram & Marca 7D
                </p>
              </div>
            </div>
          ) : (
            <div
              className="h-10 w-10 rounded-xl cursor-pointer flex items-center justify-center shadow-xs hover:opacity-90 transition-opacity p-1.5 bg-card border border-border/70"
              onClick={toggleSidebarCollapsed}
              title="Expandir menu Criafy"
            >
              <CriafySidebarIcon className="h-6 w-6 object-contain" />
            </div>
          )}

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="h-7 w-7 rounded-lg border border-slate-200/90 dark:border-border bg-white dark:bg-card hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-xs cursor-pointer shrink-0"
              title="Recolher menu do Criafy"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 2. Navegação em Grupos */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="text-[10.5px] font-bold text-slate-400 dark:text-muted-foreground/70 tracking-wider uppercase px-3 py-1">
                  {group.title}
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeModuleTab === item.id;
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleTabChange(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          "relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer text-left",
                          isActive
                            ? "bg-[#EEF0FD] dark:bg-primary/15 text-[#5856d6] dark:text-primary font-semibold"
                            : "text-[#334155] dark:text-muted-foreground hover:bg-slate-100/80 dark:hover:bg-muted/50 hover:text-slate-900 dark:hover:text-foreground",
                          sidebarCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#5856d6] dark:bg-primary rounded-r-full" />
                        )}

                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            isActive
                              ? "text-[#5856d6] dark:text-primary"
                              : "text-[#475569] dark:text-muted-foreground"
                          )}
                        />

                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                  isActive
                                    ? "bg-[#5856d6]/15 text-[#5856d6] dark:bg-primary/20 dark:text-primary"
                                    : "bg-slate-200/70 dark:bg-muted text-slate-600 dark:text-muted-foreground"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>

                      {/* Sub-itens do Manual da Marca quando expandido */}
                      {!sidebarCollapsed &&
                        item.id === "manual-marca" &&
                        isActive && (
                          <div className="relative ml-5 pl-2.5 border-l border-slate-200/80 dark:border-border/70 space-y-0.5 mt-1">
                            {[
                              {
                                id: "brand_manual" as const,
                                label: "Manual de Marca 7D",
                                icon: Sparkles,
                              },
                              {
                                id: "creatives" as const,
                                label: "Criativos",
                                icon: Palette,
                              },
                              {
                                id: "scripts_and_audios" as const,
                                label: "Scripts e Áudios",
                                icon: Mic,
                              },
                            ].map((sub) => {
                              const isSubActive =
                                currentBrandManualSubTab === sub.id;
                              const SubIcon = sub.icon;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() =>
                                    handleBrandManualSubTabChange(sub.id)
                                  }
                                  className={cn(
                                    "relative flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all cursor-pointer text-left",
                                    isSubActive
                                      ? "bg-[#EEF0FD]/70 dark:bg-primary/10 text-[#5856d6] dark:text-primary font-semibold"
                                      : "text-slate-500 dark:text-muted-foreground hover:bg-slate-100/60 dark:hover:bg-muted/40 hover:text-slate-900"
                                  )}
                                >
                                  <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Rodapé da Sidebar: Botão Conectar Conta + Resumo da Conta Ativa */}
        <div className="p-3 border-t border-slate-200/80 dark:border-border/60 space-y-2.5 shrink-0">
          {!sidebarCollapsed ? (
            <>
              <Button
                onClick={() => setAddAccountOpen(true)}
                className="w-full gap-1.5 text-xs h-9 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-all border-0 shadow-xs rounded-xl font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Conectar Conta
              </Button>

              {primaryAccount && (
                <button
                  type="button"
                  onClick={() => handleTabChange("contas")}
                  className="flex items-center gap-2.5 w-full p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-muted/50 transition-colors text-left cursor-pointer border border-transparent hover:border-slate-200/70"
                  title="Ver contas conectadas"
                >
                  <Avatar className="h-8 w-8 border border-slate-200 shrink-0">
                    <AvatarImage
                      src={primaryAccount.profile_picture_url || undefined}
                      alt={primaryAccount.username}
                    />
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-bold">
                      {primaryAccount.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-foreground truncate">
                      @{primaryAccount.username}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {accounts.length > 1
                        ? `${accounts.length} contas conectadas`
                        : "Conta Conectada"}
                    </div>
                  </div>
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="h-8 w-8 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-xs cursor-pointer"
                title="Expandir menu"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <Button
                size="icon"
                onClick={() => setAddAccountOpen(true)}
                className="h-9 w-9 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 border-0 shadow-xs cursor-pointer"
                title="Conectar Conta"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================
          BARRA DE NAVEGAÇÃO MOBILE (< lg)
         ========================================================= */}
      <div className="lg:hidden border-b border-border/70 bg-card/80 backdrop-blur-md px-4 py-3 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center shadow-xs p-0.5 bg-card border border-border/70">
              <CriafyLogo className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-base">Criafy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAccounts}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={() => setAddAccountOpen(true)}
              className="h-8 px-3 text-xs gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
            >
              <Plus className="w-3.5 h-3.5" /> Conectar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {allSidebarItems.map((item) => {
            const isActive = activeModuleTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-[#EEF0FD] text-[#5856d6] font-bold shadow-2xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 rounded-full bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          ÁREA DE CONTEÚDO PRINCIPAL (Direita)
         ========================================================= */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Contextual da Seção Ativa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#EEF0FD] dark:bg-primary/15 text-[#5856d6] dark:text-primary shrink-0">
                <currentTabInfo.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {currentTabInfo.label}
                  </h1>
                  {activeCompany?.name && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-muted/50 text-muted-foreground border-border"
                    >
                      {activeCompany.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentTabInfo.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAccounts}
                className="gap-1.5 text-xs h-9 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </Button>

              <Button
                onClick={() => setAddAccountOpen(true)}
                className="gap-1.5 text-xs h-9 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-all border-0 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Conectar Conta
              </Button>
            </div>
          </div>

          {/* 0. ABA: VISÃO GERAL (COCKPIT OPERACIONAL) */}
          {activeModuleTab === "visao-geral" && (
            <CriafyOverviewView
              accounts={accounts}
              onNavigateTab={(tab) => handleTabChange(tab as CriafyTabId)}
              onOpenAddAccount={() => setAddAccountOpen(true)}
            />
          )}

          {/* 0.1 ABA: MINHAS DEMANDAS */}
          {activeModuleTab === "demandas" && (
            <CriafyDemandsView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onNavigateToPlanner={() => handleTabChange("planner")}
            />
          )}

          {/* 0.2 ABA: PLANNER EDITORIAL */}
          {activeModuleTab === "planner" && (
            <CriafyPlannerView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onNavigateToCalendar={() => handleTabChange("calendario")}
              onNavigateToDemands={() => handleTabChange("demandas")}
            />
          )}

          {/* 1. ABA: CONTAS CONECTADAS */}
          {activeModuleTab === "contas" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Contas Conectadas na Empresa ({accounts.length})
                </h2>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar contas..."
                      value={searchAccountQuery}
                      onChange={(e) => setSearchAccountQuery(e.target.value)}
                      className="pl-8 h-8 text-xs rounded-xl bg-card border-border/70 shadow-none"
                    />
                  </div>

                  <div className="flex items-center border border-border/70 rounded-xl p-0.5 bg-card">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAccountViewMode("grid")}
                      className={`h-7 w-7 rounded-lg ${
                        accountViewMode === "grid"
                          ? "bg-muted text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Visualização em Grade"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAccountViewMode("list")}
                      className={`h-7 w-7 rounded-lg ${
                        accountViewMode === "list"
                          ? "bg-muted text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Visualização em Lista"
                    >
                      <List className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : accounts.length === 0 ? (
                <Card className="border-dashed bg-card/50">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-3 rounded-full bg-pink-500/10 text-pink-500 mb-3">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-base mb-1">
                      Nenhuma conta do Instagram associada
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      Sua empresa ({activeCompany?.name}) ainda não possui contas do
                      Instagram conectadas ao Criafy.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setAddAccountOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="w-4 h-4" /> Conectar Primeira Conta
                    </Button>
                  </CardContent>
                </Card>
              ) : (() => {
                const filtered = accounts.filter((acc) => {
                  if (!searchAccountQuery.trim()) return true;
                  const q = searchAccountQuery.toLowerCase();
                  return (
                    acc.username.toLowerCase().includes(q) ||
                    (acc.name && acc.name.toLowerCase().includes(q)) ||
                    (acc.metadata?.page_name &&
                      acc.metadata.page_name.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card/30">
                      Nenhuma conta encontrada com o termo "{searchAccountQuery}".
                    </div>
                  );
                }

                return (
                  <div
                    className={
                      accountViewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                        : "space-y-3"
                    }
                  >
                    {filtered.map((account) => (
                      <AccountCompactCard
                        key={account.id}
                        account={account}
                        onOpenFeed={openFeedModal}
                        onOpenBriefing={openBriefingModal}
                        onOpenInsights={openInsightsModal}
                        onSyncProfile={handleSyncProfile}
                        onCheckHealth={handleCheckHealth}
                        isSyncing={syncingAccountId === account.id}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 2. ABA: CALENDÁRIO EDITORIAL */}
          {activeModuleTab === "calendario" && (
            <CriafyCalendarView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccountFilter={setSelectedAccountId}
            />
          )}

          {/* 3. ABA: BIBLIOTECA DE CONTEÚDOS */}
          {activeModuleTab === "conteudos" && (
            <MediaLibraryView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccountFilter={setSelectedAccountId}
            />
          )}

          {/* 4. ABA: PUBLICAÇÕES & HISTÓRICO */}
          {(activeModuleTab === "publicacoes" || activeModuleTab === "fila") && (
            <PublicationsView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccountFilter={setSelectedAccountId}
            />
          )}

          {/* 5. ABA: FILA AUTOMÁTICA & CADÊNCIA */}
          {activeModuleTab === "fila" && (
            <QueueRulesView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccountFilter={setSelectedAccountId}
            />
          )}

          {/* 6. ABA: MANUAL DA MARCA */}
          {activeModuleTab === "manual-marca" && <CriafyBrandManualView />}

          {/* 7. ABA: ESTRATEGISTA IA */}
          {activeModuleTab === "estrategista" && (
            <CriafyStrategistView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onNavigateToPlanner={() => handleTabChange("planner")}
              onNavigateToDemands={() => handleTabChange("demandas")}
            />
          )}

          {/* 8. ABA: INSIGHTS & APRENDIZADOS */}
          {activeModuleTab === "insights" && (
            <CriafyInsightsView
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onOpenFeedModal={openFeedModal}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onSuccess={loadAccounts}
      />

      <AccountBriefingModal
        account={selectedBriefingAccount}
        open={briefingModalOpen}
        onOpenChange={setBriefingModalOpen}
      />

      <InstagramFeedModal
        account={selectedFeedAccount}
        open={feedModalOpen}
        onOpenChange={setFeedModalOpen}
      />

      <AccountInsightsModal
        account={selectedInsightsAccount}
        open={insightsModalOpen}
        onOpenChange={setInsightsModalOpen}
        initialTab={insightsInitialTab}
        onOpenFeed={openFeedModal}
        onOpenBriefing={openBriefingModal}
        onSyncProfile={handleSyncProfile}
        onCheckHealth={handleCheckHealth}
        isSyncing={syncingAccountId === selectedInsightsAccount?.id}
      />
    </div>
  );
}
