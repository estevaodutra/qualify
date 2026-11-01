import {
  Database,
  ShieldCheck,
  Building,
  User,
  Instagram,
  FileText,
  Clock,
  Target,
  Users,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContextProviderRegistry } from "@/ai";

const PROVIDER_ICONS: Record<string, any> = {
  company: Building,
  brand_manual: FileText,
  instagram_account: Instagram,
  account_strategy: Target,
  content_history: Clock,
  campaign: Target,
  crm_lead: Users,
  sales_history: DollarSign,
  user: User,
};

export default function AdminAiContextProviders() {
  const providers = Object.values(ContextProviderRegistry);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Provedores de Contexto (Context Engine)</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {providers.length} Providers
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Resolução de contexto isolada por empresa e conta. Cada Agente ou Workflow recebe apenas as fatias necessárias.
          </p>
        </div>
      </div>

      {/* Grid de Context Providers */}
      {providers.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhum provedor de contexto registrado</h3>
            <p className="text-sm text-muted-foreground text-center">
              Os provedores de contexto foram reinicializados e serão vinculados conforme a demanda de cada agente.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => {
            const Icon = PROVIDER_ICONS[p.slug] || Database;
            return (
              <Card key={p.slug} className="flex flex-col justify-between hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <p className="text-xs font-mono text-muted-foreground">{p.slug}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Ativo
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-2 line-clamp-2">
                    {p.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/50 border flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Isolamento
                    </span>
                    <span className="font-medium text-foreground">Strict Tenant (company_id)</span>
                  </div>

                  <div className="flex items-center justify-between py-1 text-muted-foreground text-[11px]">
                    <span>Cache TTL</span>
                    <span className="font-mono">300 segundos</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
