import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const defaultGlobalTemplates = [
  {
    id: "tpl-1",
    title: "Boas-vindas & Onboarding Inicial",
    category: "Atendimento",
    channel: "WhatsApp",
    content: "Olá {{nome}}, seja muito bem-vindo(a) à nossa plataforma! Como posso te ajudar hoje?",
    created_at: "2026-01-15",
  },
  {
    id: "tpl-2",
    title: "Confirmação de Agendamento",
    category: "Comercial",
    channel: "WhatsApp",
    content: "Olá {{nome}}, confirmamos sua reunião para {{data}} às {{horario}}. Digite 1 para confirmar ou 2 para reagendar.",
    created_at: "2026-02-10",
  },
  {
    id: "tpl-3",
    title: "Briefing Estratégico de Conteúdo",
    category: "Criafy IA",
    channel: "Instagram / IA",
    content: "Gere 3 ideias de Reels com gancho forte, retenção no meio e CTA para o nicho de {{nicho}} com tom {{tom}}.",
    created_at: "2026-03-05",
  },
];

export default function AdminGlobalTemplates() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = defaultGlobalTemplates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Template copiado para a área de transferência.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Templates Globais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modelos de mensagens e prompts oficiais da plataforma disponibilizados para todos os clientes.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar templates por título ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold leading-tight">{tpl.title}</CardTitle>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {tpl.channel}
                </Badge>
              </div>
              <CardDescription className="text-xs">{tpl.category}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="p-2.5 rounded bg-muted/50 border text-xs font-mono text-muted-foreground line-clamp-3">
                {tpl.content}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground">ID: {tpl.id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleCopy(tpl.id, tpl.content)}
                >
                  {copiedId === tpl.id ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" /> Copiar Texto
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
