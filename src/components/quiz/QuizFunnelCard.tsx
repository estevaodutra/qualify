import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Edit, Trash2, Globe, EyeOff, BarChart2, Users, MousePointerClick, CheckSquare, Copy } from "lucide-react";
import { QuizFunnel } from "@/hooks/useQuizFunnels";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  funnel: QuizFunnel;
  onDelete: (id: string) => void;
  onPublish: (id: string, publish: boolean) => void;
  onDuplicate: (id: string) => void;
}

const statusLabel: Record<QuizFunnel["status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const statusVariant: Record<QuizFunnel["status"], "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export function QuizFunnelCard({ funnel, onDelete, onPublish, onDuplicate }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/quiz/${funnel.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{funnel.name}</h3>
              <Badge variant={statusVariant[funnel.status]}>{statusLabel[funnel.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">/q/{funnel.slug}</p>

            <div className="grid grid-cols-4 gap-2">
              <Metric icon={<MousePointerClick className="w-3 h-3" />} value={funnel.visitsCount} label="Visitas" />
              <Metric icon={<BarChart2 className="w-3 h-3" />} value={funnel.responsesCount} label="Respostas" />
              <Metric icon={<Users className="w-3 h-3" />} value={funnel.leadsCount} label="Leads" />
              <Metric icon={<CheckSquare className="w-3 h-3" />} value={funnel.completionsCount} label="Conclusões" />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => navigate(`/quiz/${funnel.id}`)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(funnel.id)}>
                <Copy className="w-4 h-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              {funnel.status === "published" ? (
                <DropdownMenuItem onClick={() => onPublish(funnel.id, false)}>
                  <EyeOff className="w-4 h-4 mr-2" /> Despublicar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onPublish(funnel.id, true)}>
                  <Globe className="w-4 h-4 mr-2" /> Publicar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(funnel.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}</div>
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
