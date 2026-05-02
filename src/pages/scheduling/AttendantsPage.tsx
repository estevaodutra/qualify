import { useState } from "react";
import { useAttendants } from "@/hooks/useAttendants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function AttendantsPage() {
  const { attendants, isLoading, create, update, remove, uploadPhoto } = useAttendants(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", bio: "", photoUrl: "" });

  const reset = () => { setEditing(null); setForm({ name: "", email: "", bio: "", photoUrl: "" }); };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (a: any) => {
    setEditing(a.id);
    setForm({ name: a.name, email: a.email || "", bio: a.bio || "", photoUrl: a.photoUrl || "" });
    setOpen(true);
  };

  const save = async () => {
    if (editing) await update.mutateAsync({ id: editing, ...form });
    else await create.mutateAsync(form);
    setOpen(false); reset();
  };

  const onFile = async (f: File) => {
    const url = await uploadPhoto.mutateAsync(f);
    setForm((s) => ({ ...s, photoUrl: url }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atendentes</h1>
          <p className="text-sm text-muted-foreground">Gerencie quem pode receber agendamentos</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Adicionar Atendente</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : attendants.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum atendente ainda.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {attendants.map((a) => (
            <div key={a.id} className="bg-card border rounded-lg p-4 flex gap-3">
              {a.photoUrl ? <img src={a.photoUrl} className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-muted" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.name}</div>
                {a.email && <div className="text-xs text-muted-foreground truncate">{a.email}</div>}
                {a.bio && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.bio}</div>}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Excluir atendente?")) remove.mutate(a.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Adicionar"} Atendente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                {form.photoUrl && <img src={form.photoUrl} className="w-12 h-12 rounded-full object-cover" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </div>
            </div>
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={!form.name}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
