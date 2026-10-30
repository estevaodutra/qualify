import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileCheck2, User, Clock } from "lucide-react";
import { format } from "date-fns";

// Registro de eventos de auditoria operacional
const mockAuditTrail = [
  {
    id: "aud-1",
    author: "estevaodutra.pmss@gmail.com",
    action: "Ativação de Skill de IA",
    target: "Estrategista Digital (v1.0.0)",
    details: "Skill publicada para o catálogo global",
    date: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "aud-2",
    author: "estevaodutra.pmss@gmail.com",
    action: "Ajuste de Parâmetro Global",
    target: "OpenAI Model Profile",
    details: "Modelo padrão definido como gpt-4o-mini",
    date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "aud-3",
    author: "Sistema (Auto-recovery)",
    action: "Validação de Webhook",
    target: "Meta Graph API Callback",
    details: "Revalidação periódica de token com status 200 OK",
    date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
];

export default function AdminSystemAudit() {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Trilha de Auditoria</h1>
            <Badge variant="outline" className="text-xs">
              Segurança &amp; Conformidade
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro imutável de ações executadas por superadministradores e processos automatizados.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/40">
                  <TableHead className="font-semibold">Responsável</TableHead>
                  <TableHead className="font-semibold">Ação</TableHead>
                  <TableHead className="font-semibold">Alvo / Recurso</TableHead>
                  <TableHead className="font-semibold">Detalhes</TableHead>
                  <TableHead className="font-semibold text-right">Data &amp; Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {mockAuditTrail.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate max-w-[180px]">{log.author}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.target}</TableCell>
                    <TableCell className="text-muted-foreground">{log.details}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {format(new Date(log.date), "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
