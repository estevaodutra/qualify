import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Search, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function AdminSystemErrors() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const { data: errors = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "system-errors"],
    queryFn: async () => {
      const sb = supabase as any;
      const errorList: any[] = [];

      // 1. Falhas em execuções de IA
      const { data: aiErrors } = await sb
        .from("ai_executions")
        .select("id, action, skill_name, error_message, created_at, company_id")
        .eq("status", "FAILED")
        .order("created_at", { ascending: false })
        .limit(30)
        .catch(() => ({ data: [] }));

      (aiErrors || []).forEach((e: any) => {
        errorList.push({
          id: `ai-${e.id}`,
          module: "Inteligência Artificial (OpenAI)",
          message: e.error_message || "Falha na chamada de API / Token limite",
          target: e.skill_name || e.action,
          companyId: e.company_id,
          date: e.created_at,
          status: "investigando",
        });
      });

      // 2. Instâncias de WhatsApp com erro
      const { data: instErrors } = await sb
        .from("instances")
        .select("id, name, phone, status, company_id, last_message_at")
        .in("status", ["error", "disconnected"])
        .order("created_at", { ascending: false })
        .limit(20)
        .catch(() => ({ data: [] }));

      (instErrors || []).forEach((i: any) => {
        errorList.push({
          id: `inst-${i.id}`,
          module: "WhatsApp Gateway",
          message: `Instância ${i.status === "disconnected" ? "desconectada pelo aparelho" : "com erro crítico no provedor"}`,
          target: `${i.name} (${i.phone})`,
          companyId: i.company_id,
          date: i.last_message_at || new Date().toISOString(),
          status: "crítico",
        });
      });

      return errorList;
    },
  });

  const filtered = errors.filter((e) => {
    if (search && !e.message.toLowerCase().includes(search.toLowerCase()) && !e.target.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (moduleFilter !== "all" && !e.module.toLowerCase().includes(moduleFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Diagnóstico &amp; Central de Erros</h1>
            <Badge variant="outline" className="text-xs">
              {filtered.length} {filtered.length === 1 ? "incidente" : "incidentes"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rastreamento de exceções, falhas de conectividade e execuções interrompidas em tempo real.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="h-8 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar erro por mensagem ou alvo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Módulos</SelectItem>
              <SelectItem value="Inteligência">IA &amp; Skills</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-xs text-muted-foreground text-center">Diagnosticando incidentes...</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-foreground text-sm">Nenhum erro ativo no momento</p>
              <p className="text-xs mt-1">Todos os gateways e serviços estão operando sem falhas reportadas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/40">
                    <TableHead className="font-semibold">Módulo</TableHead>
                    <TableHead className="font-semibold">Erro / Falha</TableHead>
                    <TableHead className="font-semibold">Alvo / Recurso</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Ocorrência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filtered.map((err) => (
                    <TableRow key={err.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium text-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {err.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-destructive max-w-md truncate">
                        {err.message}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {err.target}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={err.status === "crítico" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {err.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(new Date(err.date), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
