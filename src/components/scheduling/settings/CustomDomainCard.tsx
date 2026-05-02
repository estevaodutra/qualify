import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchedulingSettings } from "@/hooks/useSchedulingSettings";
import { toast } from "@/hooks/use-toast";

export default function CustomDomainCard() {
  const { data, upsert } = useSchedulingSettings();
  const [domain, setDomain] = useState(data?.custom_domain || "");
  const [verifying, setVerifying] = useState(false);

  const status = data?.custom_domain_status || "pending";
  const badge = {
    verified: <Badge className="bg-emerald-500 hover:bg-emerald-500">🟢 Verificado</Badge>,
    pending: <Badge variant="secondary">🟡 Aguardando configuração</Badge>,
    error: <Badge variant="destructive">🔴 Erro</Badge>,
  }[status];

  const save = () => upsert.mutate({ custom_domain: domain || null, custom_domain_status: "pending" });

  const verify = async () => {
    if (!domain) return;
    setVerifying(true);
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`);
      const json = await res.json();
      const ok = Array.isArray(json.Answer) && json.Answer.some((a: any) => String(a.data || "").includes("custom.dispatchone.com"));
      await upsert.mutateAsync({
        custom_domain: domain,
        custom_domain_status: ok ? "verified" : "error",
        custom_domain_verified_at: ok ? new Date().toISOString() : null,
      });
      toast({ title: ok ? "DNS verificado" : "Não foi possível verificar", description: ok ? "Domínio pronto para uso" : "Confirme o CNAME no seu provedor", variant: ok ? undefined : "destructive" });
    } catch (e: any) {
      toast({ title: "Erro na verificação", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Domínio personalizado</CardTitle>
        <CardDescription>Use seu próprio domínio para as páginas de agendamento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Domínio atual: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">dispatchone.lovable.app/agendar/...</code>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Domínio personalizado</Label>
            {badge}
          </div>
          <Input placeholder="agenda.minhaempresa.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 space-y-1">
          <div className="font-medium text-foreground">Configuração DNS</div>
          <div>Tipo: <code>CNAME</code></div>
          <div>Nome: o subdomínio escolhido (ex: <code>agenda</code>)</div>
          <div>Valor: <code>custom.dispatchone.com</code></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={verify} disabled={!domain || verifying}>{verifying ? "Verificando…" : "Verificar DNS"}</Button>
          <Button onClick={save} disabled={upsert.isPending}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
