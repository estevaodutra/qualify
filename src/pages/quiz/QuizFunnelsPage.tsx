import { useState } from "react";
import { Plus, Layers } from "lucide-react";
import { useQuizFunnels } from "@/hooks/useQuizFunnels";
import { QuizFunnelCard } from "@/components/quiz/QuizFunnelCard";
import { CreateFunnelDialog } from "@/components/quiz/CreateFunnelDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function QuizFunnelsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { funnels, isLoading, createFunnel, deleteFunnel, publishFunnel, isCreating } = useQuizFunnels();

  const filtered = funnels.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (name: string, slug: string) => {
    await createFunnel({ name, slug });
    setShowCreate(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funil? Esta ação não pode ser desfeita.")) return;
    await deleteFunnel(id);
  };

  const handlePublish = async (id: string, publish: boolean) => {
    await publishFunnel({ id, publish });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Meus Funis</h1>
            <p className="text-sm text-muted-foreground">Crie e gerencie seus funis de quiz</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Criar Funil
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar funil..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Loading */}
      {isLoading && (
        <div className="text-sm text-muted-foreground">Carregando funis...</div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium">
              {search ? "Nenhum funil encontrado" : "Você ainda não tem funis"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Tente uma busca diferente." : "Crie seu primeiro funil de quiz para começar."}
            </p>
          </div>
          {!search && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeiro funil
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((funnel) => (
            <QuizFunnelCard
              key={funnel.id}
              funnel={funnel}
              onDelete={handleDelete}
              onPublish={handlePublish}
            />
          ))}
        </div>
      )}

      <CreateFunnelDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        isLoading={isCreating}
      />
    </div>
  );
}
