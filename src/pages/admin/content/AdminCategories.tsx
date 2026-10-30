import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Tag } from "lucide-react";

const platformCategories = [
  { id: "saude", name: "Saúde & Clínicas", description: "Médicos, odontologia, fisioterapia e bem-estar", skillsCount: 4 },
  { id: "imob", name: "Mercado Imobiliário", description: "Corretores, construtoras e imobiliárias", skillsCount: 3 },
  { id: "infoprod", name: "Infoprodutos & Educação", description: "Cursos online, mentorias e comunidades", skillsCount: 5 },
  { id: "servicos", name: "Serviços B2B", description: "Agências, consultorias e empresas de tecnologia", skillsCount: 6 },
  { id: "varejo", name: "Comércio & E-commerce", description: "Lojas físicas, varejo e atacado", skillsCount: 3 },
  { id: "estetica", name: "Beleza & Estética", description: "Salões, barbearias e estética avançada", skillsCount: 2 },
];

export default function AdminCategories() {
  const [search, setSearch] = useState("");

  const filtered = platformCategories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categorias da Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Segmentação taxonômica utilizada para parametrização de campanhas e Skills da Criafy.
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar categorias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cat) => (
          <Card key={cat.id} className="hover:border-primary/40 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  {cat.name}
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {cat.skillsCount} skills
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">{cat.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <span className="text-[10px] text-muted-foreground font-mono">Slug: {cat.id}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
