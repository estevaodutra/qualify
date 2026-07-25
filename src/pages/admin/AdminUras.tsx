import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PhoneCall, Trash2, Edit2, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UraItem {
  id: string;
  name: string;
  description: string | null;
  mos_campaign_id: string | null;
  audio_value: string | null;
  status: string;
  created_at: string;
}

export default function AdminUras() {
  const [uras, setUras] = useState<UraItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUra, setEditingUra] = useState<UraItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [uraId, setUraId] = useState("");
  const [description, setDescription] = useState("");
  const [audioValue, setAudioValue] = useState("");

  const fetchUras = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ura_campaigns")
        .select("id, name, description, mos_campaign_id, audio_value, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUras(data || []);
    } catch (err: any) {
      toast.error(`Erro ao carregar URAs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUras();
  }, []);

  const handleOpenCreate = () => {
    setEditingUra(null);
    setName("");
    setUraId("");
    setDescription("");
    setAudioValue("");
    setIsOpen(true);
  };

  const handleOpenEdit = (ura: UraItem) => {
    setEditingUra(ura);
    setName(ura.name);
    setUraId(ura.mos_campaign_id || "");
    setDescription(ura.description || "");
    setAudioValue(ura.audio_value || "");
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !uraId.trim()) {
      toast.error("Nome e ID da URA são obrigatórios.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        name,
        mos_campaign_id: uraId,
        description: description || null,
        audio_value: audioValue || null,
        status: "active",
        user_id: user.id
      };

      if (editingUra) {
        const { error } = await supabase
          .from("ura_campaigns")
          .update(payload)
          .eq("id", editingUra.id);

        if (error) throw error;
        toast.success("URA atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("ura_campaigns")
          .insert(payload);

        if (error) throw error;
        toast.success("URA cadastrada com sucesso!");
      }

      setIsOpen(false);
      fetchUras();
    } catch (err: any) {
      toast.error(`Erro ao salvar URA: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase
        .from("ura_campaigns")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;
      toast.success("URA excluída com sucesso!");
      setDeletingId(null);
      setIsDeleting(false);
      fetchUras();
    } catch (err: any) {
      toast.error(`Erro ao excluir URA: ${err.message}`);
    }
  };

  const filtered = uras.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.mos_campaign_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de URAs</h1>
          <p className="text-muted-foreground">Cadastre e gerencie os fluxos de URA vinculados ao n8n/MOS BR</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchUras} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Nova URA
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, ID ou descrição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">Nome da URA</TableHead>
                <TableHead className="font-semibold text-slate-600">ID da URA (MOS BR / n8n)</TableHead>
                <TableHead className="font-semibold text-slate-600">Áudio Padrão</TableHead>
                <TableHead className="font-semibold text-slate-600">Descrição</TableHead>
                <TableHead className="font-semibold text-slate-600">Criado em</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                    Nenhuma URA cadastrada encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-700 flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-purple-500 shrink-0" />
                      {u.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono bg-purple-500/10 text-purple-700 border-none px-2 py-0.5 rounded">
                        {u.mos_campaign_id || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate text-xs">
                      {u.audio_value || "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {u.description || "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {format(new Date(u.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(u)} className="h-8 w-8 hover:bg-slate-100 hover:text-slate-700">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(u.id);
                            setIsDeleting(true);
                          }}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {editingUra ? "Editar Cadastro de URA" : "Cadastrar Nova URA"}
              </DialogTitle>
              <DialogDescription>
                Informe os detalhes do fluxo de URA da MOS BR que será disparado via n8n.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome da URA</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: URA de Confirmação de Lead"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="uraId" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ID da URA na MOS BR</Label>
                <Input
                  id="uraId"
                  value={uraId}
                  onChange={(e) => setUraId(e.target.value)}
                  placeholder="Ex: 53218"
                  className="rounded-xl border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">O código numérico identificador do fluxo ou campanha criado no painel da MOS BR.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="audio" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Áudio Padrão / TTS (Opcional)</Label>
                <Input
                  id="audio"
                  value={audioValue}
                  onChange={(e) => setAudioValue(e.target.value)}
                  placeholder="Nome do áudio ou texto de reprodução"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição / Observações</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da finalidade desta URA"
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                {editingUra ? "Salvar Alterações" : "Cadastrar URA"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta URA? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleting(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
