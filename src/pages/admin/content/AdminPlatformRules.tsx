import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

const rules = [
  {
    title: "Intervalo Mínimo de Disparos de WhatsApp",
    threshold: "12 a 25 segundos aleatórios",
    description: "Anti-bloqueio obrigatório. Disparos simultâneos sem delay são pausados pelo gatekeeper.",
    level: "Crítico",
  },
  {
    title: "Limite de Chamadas Simultâneas por URA",
    threshold: "Máximo 10 chamadas ativas por empresa",
    description: "Evita sobrecarga nos troncos SIP e mantém a taxa de completamento acima de 85%.",
    level: "Atenção",
  },
  {
    title: "Compliance de Conteúdo OpenAI & Meta",
    threshold: "Filtro automático de moderação ativo",
    description: "Bloqueio estrito de conteúdos que firam os termos de uso (spam, conteúdo não consentido).",
    level: "Obrigatório",
  },
];

export default function AdminPlatformRules() {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Regras da Plataforma &amp; Compliance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Diretrizes técnicas de cadência de disparos, limites anti-bloqueio e políticas operacionais.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <Card key={idx}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  {rule.title}
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {rule.level}
                </Badge>
              </div>
              <CardDescription className="text-xs">{rule.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="p-2 bg-muted/30 rounded border text-xs">
                <span className="text-muted-foreground">Parâmetro de proteção:</span>{" "}
                <span className="font-semibold text-foreground">{rule.threshold}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
