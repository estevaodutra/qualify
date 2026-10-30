import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListOrdered, RefreshCw, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminSystemJobs() {
  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "system-jobs"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const sb = supabase as any;
      const { data } = await sb
        .from("call_queue")
        .select("id, campaign_id, lead_id, attempt_number, created_at, status")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Filas &amp; Processamento Assíncrono</h1>
            <Badge variant="outline" className="text-xs">
              {jobs.length} na fila
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento de workers, fila de discagem e despachos assíncronos.
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
          Atualizar Fila
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-xs text-muted-foreground text-center">Consultando filas de jobs...</p>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-foreground text-sm">Fila vazia</p>
              <p className="text-xs mt-1">Todos os jobs e despachos foram concluídos com sucesso pelos workers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/40">
                    <TableHead className="font-semibold">ID do Job</TableHead>
                    <TableHead className="font-semibold">Fila / Campanha</TableHead>
                    <TableHead className="font-semibold text-center">Tentativa</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Enfileirado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {jobs.map((job: any) => (
                    <TableRow key={job.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-muted-foreground">
                        {job.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {job.campaign_id ? `Campanha #${job.campaign_id.substring(0, 8)}` : "Geral"}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {job.attempt_number ?? 1}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                        >
                          {job.status || "queued"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {job.created_at ? format(new Date(job.created_at), "dd/MM/yyyy HH:mm:ss") : "—"}
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
