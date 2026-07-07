import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { History, Save, RotateCcw } from "lucide-react";
import { useSequenceVersions } from "@/hooks/useSequences";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SequenceVersionsDialogProps {
  sequenceId: string;
  onSaveVersion: (name: string) => Promise<void>;
  onRestoreVersion: (nodes: any[], connections: any[]) => void;
  isSaving: boolean;
}

export function SequenceVersionsDialog({
  sequenceId,
  onSaveVersion,
  onRestoreVersion,
  isSaving,
}: SequenceVersionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const { versions, isLoading } = useSequenceVersions(sequenceId);

  const handleSave = async () => {
    if (!newVersionName.trim()) return;
    await onSaveVersion(newVersionName);
    setNewVersionName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Versões
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Histórico de Versões</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da versão (ex: Fluxo Original)"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button onClick={handleSave} disabled={isSaving || !newVersionName.trim()}>
              {isSaving ? "Salvando..." : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
            </Button>
          </div>

          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma versão salva.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {versions.map((version) => (
                  <div key={version.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium leading-none">{version.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(version.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          onRestoreVersion(version.nodes, version.connections);
                          setOpen(false);
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
