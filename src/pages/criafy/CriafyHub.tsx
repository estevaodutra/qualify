import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
  BarChart3,
  CheckCircle2,
  RefreshCw,
  CalendarDays,
  Users,
  ExternalLink,
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount } from "@/types/criafy";

// Sub-views
import { MediaLibraryView } from "@/components/criafy/MediaLibraryView";
import { PublicationsView } from "@/components/criafy/PublicationsView";
import { QueueRulesView } from "@/components/criafy/QueueRulesView";
import { CriafyCalendarView } from "@/components/criafy/CriafyCalendarView";
import { AddAccountModal } from "@/components/criafy/AddAccountModal";
import { AccountBriefingModal } from "@/components/criafy/AccountBriefingModal";
import { InstagramFeedModal } from "@/components/criafy/InstagramFeedModal";
import { AccountCompactCard } from "@/components/criafy/AccountCompactCard";
import { AccountInsightsModal } from "@/components/criafy/AccountInsightsModal";

import { useSearchParams } from "react-router-dom";

export default function CriafyHub() {
  const { activeCompany, activeCompanyId } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
      const padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
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
        if (event.data.accounts && Array.isArray(event.data.accounts) && event.data.accounts.length > 0) {
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
    const oauthError = searchParams.get("error_description") || searchParams.get("error");

    const targetCompanyId = activeCompanyId || extractCompanyIdFromState(rawState);
    if (!targetCompanyId && !oauthError) {
      if (!activeCompanyId) setLoading(false);
      return;
    }

    const clearOAuthParams = () => {
      const nextParams = new URLSearchParams(searchParams);
      ["code", "state", "error", "error_reason", "error_description"].forEach((key) => {
        nextParams.delete(key);
      });
      setSearchParams(nextParams, { replace: true });
      window.history.replaceState(null, "", window.location.pathname);
    };

    if (oauthError) {
      toast.error(`Autorização do Instagram cancelada ou recusada: ${oauthError}`, { duration: 8000 });
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
      const cleanState = rawState ? rawState.replace(/#_.*$/, "").replace(/#.*$/, "").trim() : "";

      // Se estiver rodando dentro de uma janela popup, repassa code/state para o opener e fecha imediatamente
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

      toast.loading("Processando autorização da Meta e conectando conta...", { id: "oauth-process" });
      try {
        if (!cleanState) {
          throw new Error("Retorno OAuth sem state de segurança. Por favor, tente conectar novamente.");
        }
        const redirectUri = `${window.location.origin}/criafy`;
        const res = await criafyService.exchangeOAuthCode(targetCompanyId, cleanCode, redirectUri, cleanState);

        const count = res.count || (res.accounts ? res.accounts.length : 1);
        toast.success(`Sucesso! ${count} conta(s) do Instagram conectada(s).`, {
          id: "oauth-process",
        });

        // Atualização de estado imediata na interface
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
      if (data.length > 0 && selectedAccountId === "all") {
        // Keep selectedAccountId as "all" by default or account ID
      }
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
        toast.success("Token ativo e válido com a Meta Graph API!", { id: "health-check" });
      } else {
        toast.error(`Token expirado ou inválido: ${res.error || "Reconecte a conta"}`, { id: "health-check" });
      }
      loadAccounts();
    } catch (err: any) {
      toast.error(`Erro ao verificar token: ${err.message}`, { id: "health-check" });
    }
  };

  const handleDisconnect = async (accountId: string, username: string) => {
    if (!confirm(`Deseja desconectar a conta @${username}? Os dados históricos serão preservados.`)) {
      return;
    }
    try {
      await criafyService.disconnectAccountToken(accountId);
      toast.success(`Conta @${username} desconectada.`);
      loadAccounts();
    } catch (err: any) {
      toast.error(`Erro ao desconectar conta: ${err.message}`);
    }
  };

  const handleSyncProfile = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      toast.loading("Sincronizando dados com o Instagram...", { id: "sync-profile" });
      const updated = await criafyService.syncAccountProfile(accountId);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      toast.success("Perfil sincronizado com a Meta com sucesso!", { id: "sync-profile" });
    } catch (err: any) {
      toast.error(`Erro ao sincronizar perfil: ${err.message}`, { id: "sync-profile" });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const renderConnectionBadge = (account: CriafyInstagramAccount) => {
    if (account.connection_status === "EXPIRED" || account.connection_status === "ERROR") {
      return (
        <Badge
          variant="outline"
          className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] px-1.5 py-0.5 cursor-pointer"
          onClick={() => handleCheckHealth(account.id)}
        >
          <AlertCircle className="w-2.5 h-2.5 mr-1" /> Token Expirado
        </Badge>
      );
    }
    if (account.connection_status === "DISCONNECTED") {
      return (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-muted text-[10px] px-1.5 py-0.5"
        >
          Desconectado
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0.5 cursor-pointer"
        onClick={() => handleCheckHealth(account.id)}
        title="Clique para testar conexão com a Meta"
      >
        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Conectado
      </Badge>
    );
  };

  const openBriefingModal = (account: CriafyInstagramAccount) => {
    navigate(`/criafy/estrategia/${account.id}`);

  };

  const openFeedModal = (account: CriafyInstagramAccount) => {
    setSelectedFeedAccount(account);
    setFeedModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-muted pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Criafy</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                  Qualify App
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Gerenciamento de estoque de conteúdo, briefing com IA e publicação automatizada no Instagram.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAccounts}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>

          <Button
            onClick={() => setAddAccountOpen(true)}
            className="gap-1.5 text-xs h-9 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-all border-0 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Conectar Conta
          </Button>
        </div>
      </div>

      {/* Contas Conectadas na Empresa */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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
              <h3 className="font-semibold text-base mb-1">Nenhuma conta do Instagram associada</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Sua empresa ({activeCompany?.name}) ainda não possui contas do Instagram conectadas ao Criafy.
              </p>
              <Button size="sm" onClick={() => setAddAccountOpen(true)} className="gap-1.5 text-xs">
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
              (acc.metadata?.page_name && acc.metadata.page_name.toLowerCase().includes(q))
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
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
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

      {/* Tabs Navigation for Criafy Modules */}
      <Tabs defaultValue="calendario" className="space-y-4 pt-4">
        <TabsList className="bg-muted/60 p-1 h-10">
          <TabsTrigger value="calendario" className="text-xs gap-1.5 h-8 font-semibold">
            <CalendarDays className="w-3.5 h-3.5 text-pink-500" /> Calendário Editorial
          </TabsTrigger>
          <TabsTrigger value="conteudos" className="text-xs gap-1.5 h-8">
            <Film className="w-3.5 h-3.5" /> Biblioteca de Conteúdos
          </TabsTrigger>
          <TabsTrigger value="publicacoes" className="text-xs gap-1.5 h-8">
            <Send className="w-3.5 h-3.5" /> Publicações & Histórico
          </TabsTrigger>
          <TabsTrigger value="fila" className="text-xs gap-1.5 h-8">
            <Clock className="w-3.5 h-3.5" /> Fila Automática & Cadência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <CriafyCalendarView
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccountFilter={setSelectedAccountId}
          />
        </TabsContent>

        <TabsContent value="conteudos">
          <MediaLibraryView
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccountFilter={setSelectedAccountId}
          />
        </TabsContent>

        <TabsContent value="publicacoes">
          <PublicationsView
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccountFilter={setSelectedAccountId}
          />
        </TabsContent>

        <TabsContent value="fila">
          <QueueRulesView
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccountFilter={setSelectedAccountId}
          />
        </TabsContent>
      </Tabs>

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
