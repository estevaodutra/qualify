import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PhoneCall,
  Phone,
  PhoneOff,
  Radio,
  Key,
  Webhook,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Play,
  Volume2,
  Loader2,
  Clock,
  Activity,
  Layers,
  FileAudio,
  Building2,
  Settings,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Api4comOperator {
  id: string;
  operator_name: string;
  extension: string | null;
  sip_domain: string | null;
  sip_password?: string | null;
  api4com_token?: string | null;
  sip_integration_id?: number | null;
  status: string;
  is_active: boolean;
  company_id: string | null;
  company_name?: string;
  total_calls?: number;
  total_calls_answered?: number;
  last_call_ended_at?: string | null;
  created_at: string;
}

interface Api4comCallLog {
  id: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  call_status: string;
  hangup_cause: string | null;
  audio_url: string | null;
  external_call_id: string | null;
  operator_name?: string;
  operator_extension?: string;
  lead_name?: string;
  lead_phone?: string;
  company_name?: string;
}

export default function AdminApi4comIntegration() {
  const [activeTab, setActiveTab] = useState<"operators" | "calls" | "config" | "diagnostics">("operators");
  const [operators, setOperators] = useState<Api4comOperator[]>([]);
  const [callLogs, setCallLogs] = useState<Api4comCallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal para sincronizar / alterar token de um operador
  const [selectedOperator, setSelectedOperator] = useState<Api4comOperator | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Testador de discagem direta
  const [testOperatorId, setTestOperatorId] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [isTestingCall, setIsTestingCall] = useState(false);

  // Áudio player modal
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  // Usuários da plataforma e Master Token
  const [platformUsersCount, setPlatformUsersCount] = useState(0);
  const [platformConfiguredCount, setPlatformConfiguredCount] = useState(0);
  const [masterToken, setMasterToken] = useState("");
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  // Carregar dados de operadores e chamadas
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Operadores
      const { data: opData, error: opError } = await (supabase as any)
        .from("call_operators")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });

      if (opError) throw opError;

      const formattedOps: Api4comOperator[] = (opData || []).map((op: any) => ({
        id: op.id,
        operator_name: op.operator_name,
        extension: op.extension,
        sip_domain: op.sip_domain,
        sip_password: op.sip_password,
        api4com_token: op.api4com_token,
        sip_integration_id: op.sip_integration_id,
        status: op.status || "offline",
        is_active: op.is_active ?? true,
        company_id: op.company_id,
        company_name: op.companies?.name || "Empresa Geral",
        total_calls: op.total_calls || 0,
        total_calls_answered: op.total_calls_answered || 0,
        last_call_ended_at: op.last_call_ended_at,
        created_at: op.created_at,
      }));

      setOperators(formattedOps);
      if (formattedOps.length > 0 && !testOperatorId) {
        const withConfig = formattedOps.find((o) => o.api4com_token && o.extension);
        if (withConfig) setTestOperatorId(withConfig.id);
      }

      // 2. Chamadas recentes
      const { data: callsData, error: callsError } = await (supabase as any)
        .from("call_logs")
        .select("*, call_operators(operator_name, extension), call_leads(name, phone), companies(name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!callsError && callsData) {
        const formattedCalls: Api4comCallLog[] = callsData.map((c: any) => ({
          id: c.id,
          created_at: c.created_at,
          started_at: c.started_at,
          ended_at: c.ended_at,
          duration_seconds: c.duration_seconds,
          call_status: c.call_status,
          hangup_cause: c.hangup_cause,
          audio_url: c.audio_url,
          external_call_id: c.external_call_id,
          operator_name: c.call_operators?.operator_name,
          operator_extension: c.call_operators?.extension,
          lead_name: c.call_leads?.name,
          lead_phone: c.call_leads?.phone,
          company_name: c.companies?.name,
        }));
        setCallLogs(formattedCalls);
      }

      // 3. Usuários da plataforma
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, api4com_token");
      if (profData) {
        setPlatformUsersCount(profData.length);
        setPlatformConfiguredCount(profData.filter((p: any) => p.api4com_token).length);
      }
    } catch (err: any) {
      console.error("[AdminApi4comIntegration] Erro ao carregar dados:", err);
      toast.error("Erro ao carregar dados da API4COM: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMasterConfig = async () => {
    setIsLoadingMaster(true);
    try {
      const { data } = await supabase.functions.invoke("api4com-manage-user", {
        body: { action: "get-master-config" },
      });
      if (data?.config?.admin_token) {
        setMasterToken(data.config.admin_token);
      }
    } catch (e) {
      console.warn("Aviso ao carregar config master:", e);
    } finally {
      setIsLoadingMaster(false);
    }
  };

  const handleSaveMaster = async () => {
    setIsSavingMaster(true);
    try {
      const { data, error } = await supabase.functions.invoke("api4com-manage-user", {
        body: {
          action: "save-master-config",
          admin_token: masterToken.trim(),
        },
      });
      if (error || !data?.success) throw new Error(data?.error || "Falha ao salvar");
      toast.success("Token Mestre da API4COM salvo com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar token mestre");
    } finally {
      setIsSavingMaster(false);
    }
  };

  useEffect(() => {
    loadData();
    loadMasterConfig();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sincronizar operador com a API4COM
  const handleSyncOperator = async () => {
    if (!selectedOperator || !tokenInput.trim()) {
      toast.error("Informe o token da API4COM");
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("api4com-sync-operator", {
        body: {
          operator_id: selectedOperator.id,
          api4com_token: tokenInput.trim(),
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Falha na sincronização");
      }

      toast.success(
        `Ramal ${data.sip?.extension} (${data.sip?.domain}) sincronizado com sucesso para ${selectedOperator.operator_name}!`
      );
      setSelectedOperator(null);
      setTokenInput("");
      await loadData();
    } catch (err: any) {
      console.error("Erro ao sincronizar:", err);
      toast.error(err.message || "Erro ao conectar com API4COM");
    } finally {
      setIsSyncing(false);
    }
  };

  // Testar discagem direta via Superadmin
  const handleTestCall = async () => {
    if (!testOperatorId || !testPhone.trim()) {
      toast.error("Selecione um operador e insira o telefone com DDD");
      return;
    }

    setIsTestingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke("api4com-call-dial", {
        body: {
          operator_id: testOperatorId,
          phone: testPhone.trim(),
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Falha no disparo da chamada");
      }

      toast.success(`Chamada de teste enviada! ID API4COM: ${data.externalCallId}. O ramal do operador deve tocar.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao disparar chamada de teste");
    } finally {
      setIsTestingCall(false);
    }
  };

  // Filtros
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const q = searchTerm.toLowerCase();
      return (
        op.operator_name.toLowerCase().includes(q) ||
        (op.extension && op.extension.toLowerCase().includes(q)) ||
        (op.sip_domain && op.sip_domain.toLowerCase().includes(q)) ||
        (op.company_name && op.company_name.toLowerCase().includes(q))
      );
    });
  }, [operators, searchTerm]);

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const totalOps = operators.length;
    const configuredOps = operators.filter((o) => o.api4com_token && o.extension).length;
    const onlineOps = operators.filter((o) => o.status === "available" || o.status === "on_call").length;
    const totalCalls = callLogs.length;
    const answeredCalls = callLogs.filter((c) => c.call_status === "completed" || c.call_status === "in_progress").length;
    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

    return { totalOps, configuredOps, onlineOps, totalCalls, answeredCalls, answerRate };
  }, [operators, callLogs]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qualify-supabase.d2x.site";
  const webhookUrl = `${supabaseUrl}/functions/v1/api4com-webhook`;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                API4COM — Central de Telefonia & Webphone
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Webphone Próprio SIP
                </Badge>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Centralize e gerencie ramais SIP, credenciais, chamadas em tempo real e webhooks da API4COM em todas as empresas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => window.open("https://app.api4com.com", "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Portal API4COM
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Ramais Vinculados</span>
              <p className="text-2xl font-bold font-mono">
                {stats.configuredOps}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ {stats.totalOps}</span>
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Operadores Online</span>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.onlineOps}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Radio className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Chamadas Registradas</span>
              <p className="text-2xl font-bold font-mono">{stats.totalCalls}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Taxa de Atendimento</span>
              <p className="text-2xl font-bold font-mono text-foreground">{stats.answerRate}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="operators" className="gap-2 text-xs">
            <Users className="h-4 w-4" />
            <span>Visão Geral & Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-2 text-xs">
            <Activity className="h-4 w-4" />
            <span>Histórico de Chamadas ({callLogs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2 text-xs">
            <Globe className="h-4 w-4" />
            <span>Endpoints & Webhooks Oficiais</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2 text-xs">
            <HelpCircle className="h-4 w-4" />
            <span>Diagnóstico & Arquitetura</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Visão Geral & Usuários */}
        <TabsContent value="operators" className="space-y-4 mt-6">
          {/* Banner Redirecionamento para Usuários */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Gerenciamento Centralizado de Usuários & Tokens API4COM
              </h3>
              <p className="text-xs text-muted-foreground max-w-2xl">
                O gerenciamento de usuários, atribuição de ramais SIP e geração de Tokens API4COM agora são centralizados diretamente na página de <strong>Usuários da Plataforma</strong>. Ao cadastrar um novo usuário ou acessar o menu de ações de qualquer usuário, você pode gerar ou configurar o token com um clique.
              </p>
            </div>
            <Link to="/admin/usuarios">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5 shrink-0">
                <Users className="h-3.5 w-3.5" />
                Ir para Usuários da Plataforma
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Configuração Mestra da API4COM */}
          <Card className="border-border/60">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-600" />
                Credencial Mestra API4COM (Provisionamento Automático)
              </CardTitle>
              <CardDescription className="text-xs">
                Informe o Token de Administrador da sua conta API4COM. Com este token configurado, a criação de novos usuários no Qualify criará e vinculará as contas na API4COM automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-1 w-full">
                  <Label htmlFor="master-token" className="text-xs font-medium">
                    Token Mestre / Admin da API4COM
                  </Label>
                  <Input
                    id="master-token"
                    type="password"
                    placeholder="Token mestre com privilégios de criar usuários na API4COM"
                    value={masterToken}
                    onChange={(e) => setMasterToken(e.target.value)}
                    className="font-mono text-xs h-9"
                    disabled={isSavingMaster}
                  />
                </div>
                <Button
                  onClick={handleSaveMaster}
                  disabled={isSavingMaster || !masterToken.trim()}
                  className="h-9 text-xs gap-1.5 bg-primary shrink-0"
                >
                  {isSavingMaster ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Salvar Token Mestre
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Localização na API4COM: <strong>Portal API4COM &gt; Minha Conta &gt; Configurações da Conta &gt; Tokens de Acesso</strong>.
              </p>
            </CardContent>
          </Card>
        {/* Testador Rápido de Discagem */}
          <Card className="border-border/60 bg-muted/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Testador de Conectividade & Discagem Rápida (SuperAdmin)
              </CardTitle>
              <CardDescription className="text-xs">
                Realize um disparo de teste ponta a ponta: a API4COM ligará para o ramal do operador selecionado e, após o auto-atendimento, para o número de destino.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-col md:flex-row items-end gap-3">
                <div className="w-full md:w-64 space-y-1">
                  <Label className="text-xs">Operador Remetente</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                    value={testOperatorId}
                    onChange={(e) => setTestOperatorId(e.target.value)}
                  >
                    <option value="">Selecione um operador...</option>
                    {operators
                      .filter((o) => o.api4com_token && o.extension)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.operator_name} (Ramal: {o.extension}) - {o.company_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="w-full md:w-64 space-y-1">
                  <Label className="text-xs">Telefone de Destino (com DDD)</Label>
                  <Input
                    placeholder="Ex: 11987654321"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <Button
                  onClick={handleTestCall}
                  disabled={!testOperatorId || !testPhone.trim() || isTestingCall}
                  className="h-9 text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isTestingCall ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                  {isTestingCall ? "Discando..." : "Disparar Chamada de Teste"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Histórico de Chamadas */}
        <TabsContent value="calls" className="space-y-4 mt-6">
          <Card className="border-border/60">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-600" />
                Logs Recentes da API4COM (Telefonia / Webphone)
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhe o tráfego de voz, status de desligamento (hangupCause) e gravações MP3 retornadas pelos webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data / Hora</TableHead>
                    <TableHead className="text-xs">Operador & Ramal</TableHead>
                    <TableHead className="text-xs">Lead / Destino</TableHead>
                    <TableHead className="text-xs">Duração</TableHead>
                    <TableHead className="text-xs">Status / Causa</TableHead>
                    <TableHead className="text-xs">ID Externo</TableHead>
                    <TableHead className="text-xs text-right">Áudio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum registro de chamada recente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    callLogs.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {new Date(call.created_at).toLocaleString("pt-BR")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{call.operator_name || "Operador"}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Ramal {call.operator_extension || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{call.lead_name || "Lead"}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">{call.lead_phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono font-medium">
                            {call.duration_seconds !== null && call.duration_seconds !== undefined
                              ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={
                                call.call_status === "completed"
                                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]"
                                  : call.call_status === "in_progress"
                                  ? "border-blue-500/40 text-blue-600 bg-blue-500/10 text-[10px]"
                                  : call.call_status === "no_answer"
                                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10 text-[10px]"
                                  : "border-destructive/40 text-destructive bg-destructive/10 text-[10px]"
                              }
                            >
                              {call.call_status}
                            </Badge>
                            {call.hangup_cause && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({call.hangup_cause})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.external_call_id ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[100px]">
                                {call.external_call_id}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(call.external_call_id!, call.id)}
                              >
                                {copiedId === call.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {call.audio_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
                              onClick={() => setPlayingAudioUrl(call.audio_url)}
                            >
                              <FileAudio className="h-3.5 w-3.5" />
                              Ouvir
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Sem gravação</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Endpoints & Webhooks Oficiais */}
        <TabsContent value="config" className="space-y-4 mt-6">
          <Card className="border-border/60">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                Endpoints Homologados e Parâmetros Técnicos da API4COM
              </CardTitle>
              <CardDescription className="text-xs">
                Utilize estes parâmetros para verificação de conformidade de rede e chamadas via API.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="rounded-lg border bg-muted/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Parâmetro / Recurso</TableHead>
                      <TableHead className="text-xs">Valor Homologado</TableHead>
                      <TableHead className="text-xs">Finalidade</TableHead>
                      <TableHead className="text-xs text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-xs">URL do Webhook Oficial</TableCell>
                      <TableCell className="font-mono text-xs text-purple-600 dark:text-purple-400">
                        {webhookUrl}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Recebe eventos de atendimento (channel-answer) e desligamento (channel-hangup)
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyToClipboard(webhookUrl, "wh_url")}
                        >
                          {copiedId === "wh_url" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-xs">Porta & Protocolo SIP</TableCell>
                      <TableCell className="font-mono text-xs">wss://{`{empresa}`}.api4com.com:6443</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        WebSocket seguro (WSS) obrigatório para WebRTC do Webphone próprio
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                          Porta :6443
                        </Badge>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-xs">Gateway Identificador</TableCell>
                      <TableCell className="font-mono text-xs">qualify-crm</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Chave gravada em webhookConstraint para rotear apenas chamadas do CRM
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyToClipboard("qualify-crm", "gw_id")}
                        >
                          {copiedId === "gw_id" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-xs">Header de Auto-Atendimento</TableCell>
                      <TableCell className="font-mono text-xs">X-Api4comintegratedcall: true</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Cabeçalho SIP enviado na chamada da API para o Webphone atender sozinho
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px]">
                          Automático
                        </Badge>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-semibold text-xs">Endpoint de Chamadas (POST)</TableCell>
                      <TableCell className="font-mono text-xs">https://api.api4com.com/api/v1/calls</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Inicia ligações com timeout configurado de 90 segundos
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px]">
                          Timeout 90s
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Diagnóstico & Boas Práticas */}
        <TabsContent value="diagnostics" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <span className="flex h-5 w-5 rounded-full bg-amber-500 text-white items-center justify-center text-xs">
                    1
                  </span>
                  Regra do Singleton SIP
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                <p>
                  A API4COM permite <strong>apenas uma sessão SIP ativa por ramal</strong>. Se um operador abrir duas abas no CRM com o mesmo ramal, o servidor SIP desconecta a anterior.
                </p>
                <p className="font-medium text-foreground">
                  Solução implementada: O Qualify utiliza <code>BroadcastChannel</code> para avisar o usuário e manter apenas uma aba primária.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <span className="flex h-5 w-5 rounded-full bg-blue-500 text-white items-center justify-center text-xs">
                    2
                  </span>
                  Fluxo do Auto-Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                <p>
                  Ao chamar <code>POST /calls</code>, a API4COM liga primeiro para o ramal do operador com o header <code>X-Api4comintegratedcall: true</code>.
                </p>
                <p className="font-medium text-foreground">
                  Solução implementada: Nosso Webphone intercepta esse header e executa <code>call.answer()</code> em menos de 1 segundo de forma totalmente transparente.
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <span className="flex h-5 w-5 rounded-full bg-emerald-500 text-white items-center justify-center text-xs">
                    3
                  </span>
                  Permissão de Áudio & Microfone
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                <p>
                  Navegadores modernos exigem HTTPS e interação explícita do usuário para inicializar o <code>AudioContext</code> e o microfone.
                </p>
                <p className="font-medium text-foreground">
                  Solução implementada: O operador clica no botão "Ficar Online" no dock para autorizar a mídia antes de realizar a primeira chamada.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Sincronização / Atualização de Token */}
      <Dialog open={Boolean(selectedOperator)} onOpenChange={(open) => !open && setSelectedOperator(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Token API4COM ao Operador</DialogTitle>
            <DialogDescription>
              Operador: <strong>{selectedOperator?.operator_name}</strong> ({selectedOperator?.company_name})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Token de Acesso (API4COM)</Label>
              <Input
                type="password"
                placeholder="Cole o token do operador gerado na API4COM..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                O token é vitalício (<code>ttl: -1</code>) e permite consultar o ramal, senha SIP e registrar os webhooks.
              </p>
            </div>

            {selectedOperator?.extension && (
              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1">
                <p>
                  <strong>Ramal atual:</strong> {selectedOperator.extension}
                </p>
                <p>
                  <strong>Domínio SIP:</strong> {selectedOperator.sip_domain || "Não vinculado"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedOperator(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSyncOperator} disabled={!tokenInput.trim() || isSyncing} className="gap-2">
              {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSyncing ? "Sincronizando..." : "Sincronizar com API4COM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Player de Áudio de Gravação */}
      <Dialog open={Boolean(playingAudioUrl)} onOpenChange={(open) => !open && setPlayingAudioUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-purple-600" />
              Gravação de Áudio da Chamada
            </DialogTitle>
            <DialogDescription>Reprodução do arquivo MP3 homologado pela API4COM.</DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center gap-3">
            {playingAudioUrl && (
              <audio controls autoPlay className="w-full">
                <source src={playingAudioUrl} type="audio/mpeg" />
                Seu navegador não suporta reprodução de áudio.
              </audio>
            )}
            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-full">
              {playingAudioUrl}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPlayingAudioUrl(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
