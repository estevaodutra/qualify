import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, CheckSquare, Clock } from "lucide-react";
import { useQuizSubmissions } from "@/hooks/useQuizSubmissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  funnelId: string;
  totalSteps: number;
}

export function ResponsesTable({ funnelId, totalSteps }: Props) {
  const { data: submissions = [], isLoading } = useQuizSubmissions(funnelId);

  const completed = submissions.filter((s) => s.status === "completed").length;
  const completionRate = submissions.length > 0 ? Math.round((completed / submissions.length) * 100) : 0;

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando respostas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{submissions.length}</p>
              <p className="text-xs text-muted-foreground">Total de sessões</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {submissions.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma resposta ainda. Publique o funil e compartilhe o link.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(s.startedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">{s.leadName || "—"}</TableCell>
                  <TableCell className="text-sm">{s.leadEmail || "—"}</TableCell>
                  <TableCell className="text-sm">{s.leadPhone || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {s.stepsCompleted}/{totalSteps}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "completed" ? "default" : "secondary"}>
                      {s.status === "completed" ? "Concluído" : "Iniciado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
