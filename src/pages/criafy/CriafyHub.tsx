import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Instagram,
  Sparkles,
  Plus,
  BookOpen,
  FolderVideo,
  Send,
  Clock,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount } from "@/types/criafy";

// Sub-views
import { MediaLibraryView } from "@/components/criafy/MediaLibraryView";
import { PublicationsView } from "@/components/criafy/PublicationsView";
import { QueueRulesView } from "@/components/criafy/QueueRulesView";
import { AddAccountModal } from "@/components/criafy/AddAccountModal";
import { AccountBriefingModal } from "@/components/criafy/AccountBriefingModal";

import { useSearchParams } from "react-router-dom";

export default function CriafyHub() {
  const { activeCompany, activeCompanyId } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<CriafyInstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Account Filter
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  // Modals state
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);
  const [selectedBriefingAccount, setSelectedBriefingAccount] =
    useState<CriafyInstagramAccount | null>(null);

  useEffect(() => {
    if (activeCompanyId) {
      handleOAuthCallback();
    } else {
      setLoading(false);
    }
  }, [activeCompanyId]);

  const handleOAuthCallback = async () => {
    if (!activeCompanyId) return;

    const code = searchParams.get("code");
    if (code) {
      toast.loading("Processando autorização do Instagram Meta API...", { id: "oauth-process" });
      try {
        const redirectUri = `${window.location.origin}/criafy`;
        const res = await criafyService.exchangeOAuthCode(activeCompanyId, code, redirectUri);
        toast.success(`Sucesso! ${res.count || 1} conta(s) do Instagram conectada(s).`, {
          id: "oauth-process",
        });
        // Clear code from URL
        searchParams.delete("code");
        setSearchParams(searchParams);
      } catch (err: any) {
        toast.error(`Falha ao conectar conta via Meta OAuth: ${err.message}`, {
          id: "oauth-process",
        });
      }
    }

    loadAccounts();
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
    setSelectedBriefingAccount(account);
    setBriefingModalOpen(true);
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
            <Plus className="w-4 h-4" /> Conectar Conta do Instagram
          </Button>
        </div>
      </div>

      {/* Main Account Grid (Home Orientada por Conta) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Contas Conectadas na Empresa ({accounts.length})
        </h2>

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
                <Plus className="w-4 h-4" /> Adicionar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className={`overflow-hidden border transition-all hover:border-pink-500/40 ${
                  selectedAccountId === account.id ? "ring-2 ring-pink-500/30 border-pink-500/50" : ""
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        @{account.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs leading-tight">@{account.username}</h4>
                        <p className="text-[10px] text-muted-foreground">{account.name || "Instagram Account"}</p>
                      </div>
                    </div>

                    {renderConnectionBadge(account)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-muted text-[11px]">
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <span className="text-muted-foreground block text-[10px]">Agendados</span>
                      <span className="font-bold text-xs">0 posts</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <span className="text-muted-foreground block text-[10px]">Publicados Hoje</span>
                      <span className="font-bold text-xs">0 posts</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBriefingModal(account)}
                      className="w-full text-[11px] h-7 gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-amber-500" /> Briefing da Conta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Navigation for Criafy Modules */}
      <Tabs defaultValue="conteudos" className="space-y-4 pt-4">
        <TabsList className="bg-muted/60 p-1 h-10">
          <TabsTrigger value="conteudos" className="text-xs gap-1.5 h-8">
            <FolderVideo className="w-3.5 h-3.5" /> Biblioteca de Conteúdos
          </TabsTrigger>
          <TabsTrigger value="publicacoes" className="text-xs gap-1.5 h-8">
            <Send className="w-3.5 h-3.5" /> Publicações & Agendamento
          </TabsTrigger>
          <TabsTrigger value="fila" className="text-xs gap-1.5 h-8">
            <Clock className="w-3.5 h-3.5" /> Fila Automática & Cadência
          </TabsTrigger>
        </TabsList>

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
    </div>
  );
}
