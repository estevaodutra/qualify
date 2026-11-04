import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Globe,
  Key,
  Webhook,
  FileText,
  Instagram,
  CheckCircle2,
  Info,
  Server,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Save,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
  Users,
  XCircle,
  Calendar,
  Building2,
  HelpCircle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CriafyLogo } from "@/components/criafy/CriafyBrandIcons";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount } from "@/types/criafy";

interface MetaUrlItem {
  id: string;
  field: string;
  category: "Básico" | "OAuth" | "Webhooks" | "Legal";
  url: string;
  description: string;
  metaLocation: string;
  status: "Ativo" | "Configurado" | "Requer Cadastro";
}

const META_URLS: MetaUrlItem[] = [
  {
    id: "site_url",
    category: "Básico",
    field: "URL do Site",
    url: "https://qualifys.app",
    description: "Endereço principal da plataforma Qualify para identificação no portal Meta.",
    metaLocation: "Configurações Básicas > Adicionar Plataforma > Site > URL do Site",
    status: "Ativo",
  },
  {
    id: "app_domain",
    category: "Básico",
    field: "Domínio do Aplicativo",
    url: "qualifys.app",
    description: "Domínio raiz autorizado para comunicações, cookies e redirecionamentos.",
    metaLocation: "Configurações Básicas > Domínios do Aplicativo",
    status: "Ativo",
  },
  {
    id: "privacy_policy",
    category: "Legal",
    field: "Política de Privacidade",
    url: "https://qualifys.app/politica-de-privacidade",
    description: "Documento oficial de conformidade LGPD e Meta com seção de exclusão de dados.",
    metaLocation: "Configurações Básicas > URL da Política de Privacidade",
    status: "Ativo",
  },
  {
    id: "terms_of_service",
    category: "Legal",
    field: "Termos de Uso / Serviço",
    url: "https://qualifys.app/termos-de-uso",
    description: "Termos de serviço e licença de uso do Criafy / Qualify.",
    metaLocation: "Configurações Básicas > URL dos Termos de Serviço",
    status: "Ativo",
  },
  {
    id: "data_deletion",
    category: "Legal",
    field: "Exclusão de Dados (Instruções)",
    url: "https://qualifys.app/politica-de-privacidade#exclusao-dados",
    description: "Instruções passo a passo de como o usuário do Instagram pode solicitar revogação e exclusão.",
    metaLocation: "Configurações Básicas > Exclusão de dados do usuário > URL de instruções",
    status: "Ativo",
  },
  {
    id: "oauth_redirect_prod",
    category: "OAuth",
    field: "Redirecionamento OAuth (Produção)",
    url: "https://qualifys.app/criafy",
    description: "URI autorizada que recebe o código de consentimento OAuth do Instagram Login for Business.",
    metaLocation: "Instagram > Configurações de API > URIs de Redirecionamento OAuth Válidos",
    status: "Ativo",
  },
  {
    id: "oauth_redirect_dev",
    category: "OAuth",
    field: "Redirecionamento OAuth (Dev Local)",
    url: "http://localhost:8080/criafy",
    description: "URI autorizada para testes em ambiente de desenvolvimento local.",
    metaLocation: "Instagram > Configurações de API > URIs de Redirecionamento OAuth Válidos",
    status: "Configurado",
  },
  {
    id: "webhook_callback",
    category: "Webhooks",
    field: "URL de Retorno de Chamada (Webhook)",
    url: "https://qualify-supabase.d2x.site/functions/v1/criafy-meta-webhook",
    description: "Supabase Edge Function que processa o handshake GET hub.challenge e notificações POST.",
    metaLocation: "Webhooks > Selecionar 'Instagram' > Configurar Webhooks > URL de Retorno",
    status: "Ativo",
  },
  {
    id: "webhook_verify_token",
    category: "Webhooks",
    field: "Token de Verificação do Webhook",
    url: "criafy_meta_webhook_2026",
    description: "Segredo compartilhado para validação do handshake (hub.verify_token).",
    metaLocation: "Webhooks > Instagram > Token de Verificação",
    status: "Configurado",
  },
  {
    id: "backend_oauth_exchange",
    category: "OAuth",
    field: "Endpoint Backend de Troca de Token",
    url: "https://qualify-supabase.d2x.site/functions/v1/criafy-instagram-oauth",
    description: "Edge Function que recebe o code temporário e gera o Long-Lived User/Page Access Token.",
    metaLocation: "Backend Supabase (Automático via CriafyHub)",
    status: "Ativo",
  },
];

export default function AdminCriafy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appId, setAppId] = useState("1601939487668355");
  const [appSecret, setAppSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [secretStatus, setSecretStatus] = useState<{ configured: boolean; masked?: string | null; appId?: string }>({
    configured: false,
    appId: "1601939487668355",
  });

  // Estados para Gestão de Contas Vinculadas
  const [accounts, setAccounts] = useState<CriafyInstagramAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [testingTokenId, setTestingTokenId] = useState<string | null>(null);
  const [tokenResults, setTokenResults] = useState<Record<string, { valid: boolean; status: string; error?: string }>>({});
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    loadSecretStatus();
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await criafyService.getAllAccountsSuperadmin();
      setAccounts(data);
    } catch (err: any) {
      console.warn("Falha ao carregar contas do Instagram:", err);
      toast.error(`Erro ao carregar contas vinculadas: ${err.message}`);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleTestToken = async (account: CriafyInstagramAccount) => {
    setTestingTokenId(account.id);
    try {
      const res = await criafyService.checkTokenHealth(account.id);
      setTokenResults((prev) => ({ ...prev, [account.id]: res }));
      if (res.valid) {
        toast.success(`Token de @${account.username} verificado com sucesso na Meta! Conexão ativa.`);
      } else {
        toast.error(`Token de @${account.username} inválido ou expirado: ${res.error || res.status}`);
      }
      await loadAccounts();
    } catch (err: any) {
      toast.error(`Falha ao testar token: ${err.message}`);
    } finally {
      setTestingTokenId(null);
    }
  };

  const handleSyncAccount = async (account: CriafyInstagramAccount) => {
    setSyncingAccountId(account.id);
    try {
      await criafyService.syncAccountProfile(account.id);
      toast.success(`Perfil de @${account.username} sincronizado com a Meta com sucesso!`);
      await loadAccounts();
    } catch (err: any) {
      toast.error(`Falha ao sincronizar perfil: ${err.message}`);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDisconnect = async (account: CriafyInstagramAccount) => {
    if (!window.confirm(`Deseja realmente desconectar o token da conta @${account.username}? As publicações e métricas ficarão pausadas até a reconexão.`)) {
      return;
    }

    setDisconnectingId(account.id);
    try {
      await criafyService.disconnectAccount(account.id);
      toast.success(`Conta @${account.username} desconectada com sucesso.`);
      await loadAccounts();
    } catch (err: any) {
      toast.error(`Falha ao desconectar conta: ${err.message}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (!searchAccountQuery.trim()) return true;
    const q = searchAccountQuery.toLowerCase();
    const username = (acc.username || "").toLowerCase();
    const name = (acc.name || "").toLowerCase();
    const igId = (acc.instagram_account_id || "").toLowerCase();
    const companyName = ((acc as any).company?.name || "").toLowerCase();
    return username.includes(q) || name.includes(q) || igId.includes(q) || companyName.includes(q);
  });

  const loadSecretStatus = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["meta_app_id", "instagram_app_secret"]);

      let configured = false;
      let masked: string | null = null;
      let currentAppId = "1601939487668355";

      if (data && Array.isArray(data)) {
        for (const item of data) {
          if (item.key === "meta_app_id" && item.value) {
            currentAppId = typeof item.value === "string" ? item.value : String(item.value);
            setAppId(currentAppId);
          }
          if (item.key === "instagram_app_secret" && item.value) {
            const val = typeof item.value === "string" ? item.value : String(item.value);
            if (val && val.length > 4) {
              configured = true;
              masked = "••••••••••••" + val.slice(-4);
            }
          }
        }
      }

      setSecretStatus({ configured, masked, appId: currentAppId });
    } catch (_) {
      setSecretStatus({ configured: false, appId: "1601939487668355" });
    }
  };

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId.trim() || appId.trim().length < 5) {
      toast.error("Informe um Meta App ID válido.");
      return;
    }

    setIsSavingSecret(true);
    try {
      // 1. Salvar App ID
      await supabase.from("platform_settings").upsert(
        {
          key: "meta_app_id",
          value: appId.trim(),
          description: "Meta App ID Principal da Criafy",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      // 2. Salvar App Secret se informado
      if (appSecret.trim()) {
        if (appSecret.trim().length < 8) {
          toast.error("O App Secret deve ter no mínimo 8 caracteres.");
          setIsSavingSecret(false);
          return;
        }

        await supabase.from("platform_settings").upsert(
          {
            key: "instagram_app_secret",
            value: appSecret.trim(),
            description: "Meta App Secret para Criafy OAuth",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }

      toast.success("Credenciais da Meta salvas com sucesso!");
      setAppSecret("");
      await loadSecretStatus();
    } catch (err: any) {
      toast.error(`Erro ao salvar credenciais: ${err.message}`);
    } finally {
      setIsSavingSecret(false);
    }
  };

  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-sm flex items-center justify-center p-1 bg-card border border-border/70 shrink-0">
              <CriafyLogo className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Criafy — Painel de URLs & Meta Developers</h1>
              <p className="text-sm text-muted-foreground">
                Central oficial de parâmetros, endpoints e URLs homologadas para configuração no Meta for Developers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs bg-muted/60 border-primary/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
            Meta Graph API v22.0
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs bg-muted/60">
            Instagram Login for Business
          </Badge>
          <Button
            size="sm"
            variant="default"
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
            asChild
          >
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir Meta Developers
            </a>
          </Button>
        </div>
      </div>

      {/* Identificadores do App */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground flex items-center justify-between">
              Nome do Aplicativo
              <Instagram className="h-4 w-4 text-pink-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold">Criafy</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            App independente dedicado na Meta Developers.
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground flex items-center justify-between">
              Meta App ID (Principal)
              <Key className="h-4 w-4 text-indigo-500" />
            </CardDescription>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-lg font-mono font-bold">{secretStatus.appId || "1601939487668355"}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(secretStatus.appId || "1601939487668355", "app_id", "Meta App ID")}
              >
                {copiedId === "app_id" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            App ID oficial da Criafy (D2X Negócios Digitais).
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground flex items-center justify-between">
              Contas no Aplicativo
              <Users className="h-4 w-4 text-pink-500" />
            </CardDescription>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-lg font-bold">
                {loadingAccounts ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  `${accounts.length} ${accounts.length === 1 ? "Conta" : "Contas"}`
                )}
              </CardTitle>
              <Badge
                variant="secondary"
                className={
                  accounts.some((a) => a.connection_status === "CONNECTED")
                    ? "text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "text-[10px] bg-muted text-muted-foreground"
                }
              >
                {accounts.filter((a) => a.connection_status === "CONNECTED").length} Ativa(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
            <span className="truncate max-w-[170px] font-mono font-medium">
              {accounts.length > 0 ? `@${accounts[0].username}` : "Nenhuma conta"}
            </span>
            {accounts.length > 1 && (
              <span className="text-[10px] font-mono text-muted-foreground">+{accounts.length - 1} mais</span>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground flex items-center justify-between">
              Status dos Webhooks
              <Webhook className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-lg font-bold">criafy-meta-webhook</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Handshake GET e ingestão POST com HTTP 200 prontos.
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          LISTAGEM COMPLETA DE CONTAS VINCULADAS AO APLICATIVO META
          ======================================================== */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                  <Instagram className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Contas do Instagram Vinculadas ao Aplicativo
                    <Badge variant="outline" className="font-mono text-[10px] bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30">
                      {accounts.length} {accounts.length === 1 ? "Conta" : "Contas"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Todas as contas profissionais do Instagram conectadas via Meta Graph API em todas as empresas do sistema.
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por @handle, marca ou empresa..."
                  value={searchAccountQuery}
                  onChange={(e) => setSearchAccountQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAccounts}
                disabled={loadingAccounts}
                className="h-8 text-xs gap-1.5 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAccounts ? "animate-spin text-pink-500" : ""}`} />
                Recarregar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingAccounts ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
              <p className="text-xs">Carregando contas conectadas ao Meta App...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Instagram className="w-6 h-6 opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {accounts.length === 0
                    ? "Nenhuma conta do Instagram vinculada ainda no sistema."
                    : "Nenhuma conta corresponde à busca."}
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {accounts.length === 0
                    ? "Quando uma empresa vincular uma conta através do botão 'Conectar Conta' no Criafy, ela será listada automaticamente aqui com detalhes de token, empresa e status."
                    : "Tente buscar por outro termo ou limpe o campo de busca."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px] uppercase">
                  <TableRow>
                    <TableHead className="w-[260px]">Conta & Perfil</TableHead>
                    <TableHead>Instagram ID (Meta)</TableHead>
                    <TableHead>Empresa (Qualify)</TableHead>
                    <TableHead>Página do Facebook</TableHead>
                    <TableHead>Status da Conexão</TableHead>
                    <TableHead>Audiência & Posts</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredAccounts.map((account) => {
                    const isTesting = testingTokenId === account.id;
                    const isSyncing = syncingAccountId === account.id;
                    const isDisconnecting = disconnectingId === account.id;
                    const tokenResult = tokenResults[account.id];
                    const followersCount = (account.metadata as any)?.followers_count ?? "—";
                    const mediaCount = (account.metadata as any)?.media_count ?? "—";
                    const pageName = (account.metadata as any)?.page_name || "—";
                    const pageId = (account.metadata as any)?.facebook_page_id;
                    const companyName = (account as any).company?.name || "Qualify";

                    return (
                      <TableRow key={account.id} className="hover:bg-muted/30 transition-colors">
                        {/* Perfil & Identificação */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border/80 shadow-2xs shrink-0">
                              <AvatarImage src={account.profile_picture_url || undefined} alt={account.username} />
                              <AvatarFallback className="bg-gradient-to-tr from-pink-500 to-amber-400 text-white font-bold text-xs">
                                {(account.username || "IG").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`https://instagram.com/${account.username}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-foreground hover:text-pink-600 transition-colors flex items-center gap-1 truncate"
                                >
                                  @{account.username}
                                  <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                                </a>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[190px]">
                                {account.name || "Conta Instagram"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Instagram Account ID (Meta) */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-[11px] bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                              {account.instagram_account_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => copyToClipboard(account.instagram_account_id, account.id, "Instagram ID")}
                              title="Copiar Instagram ID"
                            >
                              {copiedId === account.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>

                        {/* Empresa no Qualify */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[140px]">{companyName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground block truncate max-w-[140px]">
                              {account.company_id}
                            </span>
                          </div>
                        </TableCell>

                        {/* Página do Facebook Vinculada */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground truncate max-w-[150px]">
                              {pageName}
                            </p>
                            {pageId && (
                              <span className="text-[10px] font-mono text-muted-foreground block truncate max-w-[150px]">
                                ID: {pageId}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Status da Conexão & Token */}
                        <TableCell>
                          <div className="space-y-1">
                            {account.connection_status === "CONNECTED" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-semibold gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                Conectada / Ativa
                              </Badge>
                            ) : account.connection_status === "EXPIRED" ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px] font-semibold gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Token Expirado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                Desconectada
                              </Badge>
                            )}

                            {tokenResult && (
                              <p className={`text-[10px] font-semibold ${tokenResult.valid ? "text-emerald-600" : "text-rose-600"}`}>
                                {tokenResult.valid ? "✓ Testado: Token Válido" : `✗ Erro: ${tokenResult.error || "Inválido"}`}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Audiência & Posts */}
                        <TableCell>
                          <div className="space-y-0.5 text-[11px]">
                            <p className="font-semibold text-foreground">
                              {typeof followersCount === "number" ? followersCount.toLocaleString("pt-BR") : followersCount} seg.
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {typeof mediaCount === "number" ? mediaCount.toLocaleString("pt-BR") : mediaCount} posts
                            </p>
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestToken(account)}
                              disabled={isTesting}
                              className="h-7 px-2 text-[11px] gap-1 hover:border-emerald-500/50 hover:text-emerald-600"
                              title="Testa a validade do Token na Meta Graph API"
                            >
                              {isTesting ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                              ) : (
                                <Activity className="h-3 w-3 text-emerald-500" />
                              )}
                              Testar Token
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSyncAccount(account)}
                              disabled={isSyncing}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Sincronizar dados do perfil com a Meta"
                            >
                              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-pink-500" : ""}`} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDisconnect(account)}
                              disabled={isDisconnecting}
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Desconectar token da conta"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Guia Diagnóstico: Por que uma nova conta pode não vincular? */}
        <div className="p-4 bg-muted/30 border-t border-border/60 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            Diagnóstico de Vinculação: Por que a autorização pediu tudo e a conta não vinculou?
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] text-muted-foreground">
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">1</span>
                Modo de Desenvolvimento
              </p>
              <p className="leading-tight">
                Se o App no <strong>Meta Developers</strong> estiver em modo <span className="font-mono text-foreground font-semibold">Desenvolvimento</span>, apenas usuários adicionados em <em>Funções do Aplicativo &gt; Funções &gt; Testadores</em> conseguem vincular contas.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">2</span>
                Conta Profissional Obrigatória
              </p>
              <p className="leading-tight">
                A conta do Instagram <strong>não pode ser perfil pessoal</strong>. Ela deve ser alterada para <em>Criador de Conteúdo</em> ou <em>Comercial</em> nas configurações do aplicativo do Instagram.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">3</span>
                Página do Facebook Vinculada
              </p>
              <p className="leading-tight">
                No <em>Meta Business Suite</em>, a conta do Instagram deve estar conectada a uma Página do Facebook. Na tela de consentimento da Meta, selecione <strong>tanto a Página quanto a Conta do Instagram</strong>.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Card de Configuração de Credenciais Meta */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base font-semibold">
                  Credenciais do Aplicativo Meta (App ID & App Secret)
                </CardTitle>
                {secretStatus.configured ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ativo: {secretStatus.masked}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Pendente de Configuração
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Utilizado na autorização com a Meta via Facebook Login for Business (seleção de BM, Páginas e Instagram).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSaveSecret} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="meta_app_id" className="text-xs font-medium">
                  Meta App ID (Identificação do Aplicativo):
                </Label>
                <Input
                  id="meta_app_id"
                  type="text"
                  placeholder="Ex: 1601939487668355"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta_app_secret" className="text-xs font-medium">
                  Chave Secreta do Aplicativo (App Secret):
                </Label>
                <div className="relative">
                  <Input
                    id="meta_app_secret"
                    type={showSecret ? "text" : "password"}
                    placeholder={secretStatus.configured ? "Substituir segredo atual..." : "Cole aqui o App Secret"}
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    className="font-mono text-xs pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                Localização na Meta: <strong>developers.facebook.com</strong> &gt; <strong>Criafy</strong> &gt; <strong>Configurações do aplicativo</strong> &gt; <strong>Básico</strong>.
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingSecret || !appId.trim()}
                className="gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                {isSavingSecret ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salvar Credenciais</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de URLs da Meta */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                URLs Oficiais para Cadastro no Meta Developers
              </CardTitle>
              <CardDescription>
                Copie e cole cada endereço exatamente nos campos indicados dentro do painel de desenvolvedores do Facebook / Meta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Campo na Meta</TableHead>
                <TableHead className="w-[110px]">Categoria</TableHead>
                <TableHead>URL / Valor Homologado</TableHead>
                <TableHead className="w-[300px]">Onde Configurar na Meta</TableHead>
                <TableHead className="text-right w-[100px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {META_URLS.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground text-sm">{item.field}</span>
                      <span className="text-[11px] text-muted-foreground">{item.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        item.category === "Básico"
                          ? "bg-blue-50/50 text-blue-700 dark:text-blue-400 border-blue-200"
                          : item.category === "Legal"
                          ? "bg-emerald-50/50 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                          : item.category === "OAuth"
                          ? "bg-purple-50/50 text-purple-700 dark:text-purple-400 border-purple-200"
                          : "bg-amber-50/50 text-amber-700 dark:text-amber-400 border-amber-200"
                      }`}
                    >
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted/80 px-2 py-1 rounded border max-w-[380px] truncate select-all">
                        {item.url}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">
                      {item.metaLocation}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={copiedId === item.id ? "default" : "outline"}
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-medium"
                      onClick={() => copyToClipboard(item.url, item.id, item.field)}
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-white" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Guia de Configuração no Meta Developers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              Checklist de Configuração no Painel Meta
            </CardTitle>
            <CardDescription>
              Execute estes 5 passos no Meta for Developers para liberar a integração 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Configurações Básicas do App</p>
                <p className="text-xs text-muted-foreground">
                  Insira o Domínio (<code className="font-mono">qualifys.app</code>), URL de Privacidade, Termos de Uso e Exclusão de Dados. Em "Adicionar Plataforma", selecione <strong>Site</strong> e adicione <code className="font-mono">https://qualifys.app</code>.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Instagram Login for Business</p>
                <p className="text-xs text-muted-foreground">
                  No produto <strong>Instagram</strong> &gt; <strong>Configurações de API</strong>, cadastre o URI de Redirecionamento OAuth: <code className="font-mono">https://qualifys.app/criafy</code>.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Webhooks da Meta</p>
                <p className="text-xs text-muted-foreground">
                  No produto <strong>Webhooks</strong>, selecione <strong>Instagram</strong>. Em URL de retorno, insira a Edge Function do Supabase e o token <code className="font-mono">criafy_meta_webhook_2026</code>. Em seguida, assine os campos desejados (ex: <code className="font-mono">feed, comments, messages</code>).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Permissões e Usuários de Teste</p>
                <p className="text-xs text-muted-foreground">
                  Enquanto o App estiver em modo de Desenvolvimento, certifique-se de que a conta <strong className="font-mono text-pink-600">@fornecedor.dutra</strong> esteja listada em <strong>Funções &gt; Funções &gt; Testadores do Instagram</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                5
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Publicação e Live Mode</p>
                <p className="text-xs text-muted-foreground">
                  Para permitir que qualquer cliente da Qualify conecte sua conta do Instagram, envie o app para Análise da Meta (App Review) com as permissões <code className="font-mono">instagram_basic, instagram_content_publish</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              Variáveis de Ambiente Recomendadas (Backend)
            </CardTitle>
            <CardDescription>
              Certifique-se de que o Supabase Edge Functions possua estes secrets configurados:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
              <div className="flex items-center justify-between text-foreground font-semibold">
                <span>INSTAGRAM_APP_ID</span>
                <Badge variant="outline" className="text-[10px]">Público/Configurado</Badge>
              </div>
              <p className="text-muted-foreground text-[11px] font-sans">
                Valor: <code className="font-mono text-foreground font-bold">1214753054314021</code>
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
              <div className="flex items-center justify-between text-foreground font-semibold">
                <span>INSTAGRAM_APP_SECRET</span>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">Segredo</Badge>
              </div>
              <p className="text-muted-foreground text-[11px] font-sans">
                Obtido em Meta Developers &gt; Configurações Básicas &gt; Chave Secreta do Aplicativo.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
              <div className="flex items-center justify-between text-foreground font-semibold">
                <span>META_WEBHOOK_VERIFY_TOKEN</span>
                <Badge variant="outline" className="text-[10px]">Segredo</Badge>
              </div>
              <p className="text-muted-foreground text-[11px] font-sans">
                Valor padrão: <code className="font-mono text-foreground font-bold">criafy_meta_webhook_2026</code>
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 font-sans text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <Info className="h-4 w-4" />
                Segurança Multiempresa
              </div>
              <p className="text-[11px] text-blue-700/90 dark:text-blue-300/90">
                Os Access Tokens do Instagram gerados no fluxo de autorização são armazenados criptografados e associados exclusivamente ao <code className="font-mono">company_id</code> autenticado, garantindo isolamento total entre clientes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
