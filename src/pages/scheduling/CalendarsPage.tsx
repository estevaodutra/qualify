import { useState } from "react";
import { Plus, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCalendars, type SchedulingCalendar } from "@/hooks/useCalendars";
import { CalendarCard } from "@/components/scheduling/CalendarCard";
import { CalendarFormDialog } from "@/components/scheduling/CalendarFormDialog";

export default function CalendarsPage() {
  const { calendars, isLoading, update, remove } = useCalendars();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchedulingCalendar | null>(null);
  const [toDelete, setToDelete] = useState<SchedulingCalendar | null>(null);

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (cal: SchedulingCalendar) => {
    setEditing(cal);
    setDialogOpen(true);
  };

  const handleToggle = (cal: SchedulingCalendar) => {
    update.mutate({ id: cal.id, status: cal.status === "active" ? "paused" : "active" });
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Gestão de Agendamentos</h1>
          <p className="text-sm font-medium text-muted-foreground/60 mt-1">Crie e gerencie fluxos de agendamento automatizados e personalizados.</p>
        </div>
        <Button onClick={handleNew} className="h-11 px-6 gap-2.5 rounded-xl gradient-primary glow-primary font-bold shadow-lg transition-all hover:opacity-90 active:scale-95">
          <Plus className="h-5 w-5" /> Criar Calendário
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Carregando calendários...</p>
        </div>
      ) : calendars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card/40 border-2 border-dashed border-white/40 rounded-3xl animate-fade-in">
          <div className="p-5 rounded-2xl bg-muted/10 mb-6">
            <CalIcon className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Nenhum calendário ainda</h3>
          <p className="text-sm font-medium text-muted-foreground/60 mt-2 mb-8 max-w-xs text-center">
            Comece criando seu primeiro tipo de agendamento para disponibilizar para seus clientes.
          </p>
          <Button onClick={handleNew} className="h-11 px-8 gap-2.5 rounded-xl gradient-primary glow-primary font-bold shadow-lg transition-all hover:opacity-90 active:scale-95">
            <Plus className="h-5 w-5" /> Criar Calendário
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {calendars.map((cal, idx) => (
            <div key={cal.id} className={cn("animate-fade-in-up", `stagger-${(idx % 5) + 1}`)}>
              <CalendarCard
                calendar={cal}
                onEdit={() => handleEdit(cal)}
                onToggleStatus={() => handleToggle(cal)}
                onDelete={() => setToDelete(cal)}
              />
            </div>
          ))}
        </div>
      )}

      <CalendarFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir calendário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os dados relacionados ao calendário "{toDelete?.name}" serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
