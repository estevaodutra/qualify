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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus tipos de agendamento</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> Criar Calendário
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : calendars.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <CalIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium">Nenhum calendário ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Crie seu primeiro tipo de agendamento</p>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" /> Criar Calendário
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {calendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendar={cal}
              onEdit={() => handleEdit(cal)}
              onToggleStatus={() => handleToggle(cal)}
              onDelete={() => setToDelete(cal)}
            />
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
