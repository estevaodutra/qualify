import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/dispatch";
import { ApiSidebar, CategorySection, WebhookConfigSection } from "@/components/api-docs";
import { apiEndpoints, eventTypes } from "@/data/api-endpoints";
import { useLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  Check, 
  Key, 
  Shield, 
  Zap,
  BookOpen,
  AlertTriangle,
  Info
} from "lucide-react";

const ApiDocs = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("introduction");
  const [activeCategory, setActiveCategory] = useState(apiEndpoints[0]?.id || "messages");
  const [copied, setCopied] = useState<string | null>(null);
  const endpointsSectionRef = useRef<HTMLDivElement>(null);

  const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setActiveSection(categoryId);
  };

  const handleSidebarCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setActiveSection(categoryId);
    endpointsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let currentSection = "introduction";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const errorCodes = [
    { code: "INVALID_PHONE", description: "O número de telefone fornecido é inválido ou não está registrado no WhatsApp." },
    { code: "UNAUTHORIZED", description: "Token de autenticação inválido ou expirado." },
    { code: "INSTANCE_NOT_CONNECTED", description: "A instância não está conectada ao WhatsApp." },
    { code: "RATE_LIMIT_EXCEEDED", description: "Limite de requisições excedido. Aguarde antes de tentar novamente." },
    { code: "INVALID_PAYLOAD", description: "O corpo da requisição contém dados inválidos ou incompletos." },
    { code: "MEDIA_NOT_FOUND", description: "A URL da mídia não é acessível ou o arquivo não existe." },
    { code: "MESSAGE_TOO_LONG", description: "A mensagem excede o limite máximo de caracteres." },
    { code: "INTERNAL_ERROR", description: "Erro interno do servidor. Tente novamente mais tarde." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="API Reference"
        description="Documentação completa da API dispatchOne"
      />

      <div className="flex gap-8 px-6 py-8 max-w-[1400px] mx-auto">
        <ApiSidebar 
          activeSection={activeSection} 
          activeCategory={activeCategory}
          onSectionClick={setActiveSection}
          onCategoryClick={handleSidebarCategoryClick}
        />

        <main className="flex-1 min-w-0 space-y-12">
          {/* Introduction */}
          <section id="introduction" className="scroll-mt-20">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Introdução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Bem-vindo à documentação da API <strong className="text-foreground">dispatchOne</strong>. 
                  Esta API permite integrar funcionalidades de WhatsApp diretamente em suas aplicações.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Rápido</h4>
                      <p className="text-xs text-muted-foreground">Latência média &lt; 100ms</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Seguro</h4>
                      <p className="text-xs text-muted-foreground">HTTPS + autenticação por token</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">RESTful</h4>
                      <p className="text-xs text-muted-foreground">JSON request/response</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Base URL</h4>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <code className="font-mono text-sm flex-1 text-primary">{baseUrl}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(baseUrl, "baseUrl")}>
                      {copied === "baseUrl" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Authentication */}
          <section id="authentication" className="scroll-mt-20">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Autenticação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Todas as requisições à API devem incluir o seguinte header de autenticação:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Header</th>
                        <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-muted/30">
                        <td className="py-3 px-4"><code className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-primary">Authorization</code></td>
                        <td className="py-3 px-4 text-muted-foreground">Token de autenticação no formato <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Bearer {'{token}'}</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm text-amber-600 dark:text-amber-400">Importante</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Nunca exponha seu token em código client-side.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Webhook Configuration */}
          <section id="webhook-config" className="scroll-mt-20">
            <WebhookConfigSection />
          </section>

          {/* Endpoints por categoria com Tabs */}
          <div ref={endpointsSectionRef} id="endpoints" className="scroll-mt-20">
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
              <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
                  {apiEndpoints.map((category) => (
                    <TabsContent key={category.id} value={category.id} className="mt-0">
                      <CategorySection 
                        category={category} 
                        endpointsPerPage={3}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          <section id="errors" className="scroll-mt-20">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Códigos de Erro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Código</th>
                        <th className="text-left py-3 px-4 font-semibold">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorCodes.map((error, index) => (
                        <tr key={error.code} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="py-3 px-4">
                            <code className="font-mono text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">{error.code}</code>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{error.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Event Types */}
          <section id="event-types" className="scroll-mt-20">
            <Card className="border-border">
              <CardHeader><CardTitle>Tipos de Eventos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {eventTypes.map((event) => (
                    <div key={event.id} className="p-3 border border-border rounded-lg bg-muted/30">
                      <code className="font-mono text-sm text-primary">{event.name}</code>
                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ApiDocs;
