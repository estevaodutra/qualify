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
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [appId, setAppId] = useState("160193948766835");
  const [appSecret, setAppSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [secretStatus, setSecretStatus] = useState<{ configured: boolean; masked?: string | null; appId?: string }>({
    configured: false,
    appId: "160193948766835",
  });

  useEffect(() => {
    loadSecretStatus();
  }, []);

  const loadSecretStatus = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["meta_app_id", "instagram_app_secret"]);

      let configured = false;
      let masked: string | null = null;
      let currentAppId = "160193948766835";

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
      setSecretStatus({ configured: false, appId: "160193948766835" });
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
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white shadow-sm">
              <Sparkles className="h-6 w-6" />
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
              <CardTitle className="text-lg font-mono font-bold">{secretStatus.appId || "160193948766835"}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(secretStatus.appId || "160193948766835", "app_id", "Meta App ID")}
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
              Conta de Teste Autorizada
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-lg font-mono font-bold text-pink-600">@fornecedor.dutra</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
            <span>ID: <code className="font-mono">17841440622064746</code></span>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">Ativa</Badge>
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
                  placeholder="Ex: 160193948766835"
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
