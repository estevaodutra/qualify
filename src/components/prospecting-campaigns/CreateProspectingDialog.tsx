import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateProspectingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { 
    name: string; 
    searchTerms: string;
    quantity: number;
    category?: string;
    exactNames?: boolean;
    places?: string;
    postActionId?: string;
  }) => Promise<void>;
  isCreating: boolean;
}

export function CreateProspectingDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateProspectingDialogProps) {
  const [name, setName] = useState("");
  const [searchTerms, setSearchTerms] = useState("");
  const [quantity, setQuantity] = useState("50");
  const [category, setCategory] = useState("");
  const [exactNames, setExactNames] = useState(false);
  const [places, setPlaces] = useState("");
  const [postActionId, setPostActionId] = useState("none");

  const { campaigns: callCampaigns } = useCallCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();

  const allCampaigns = [
    ...callCampaigns.map((c) => ({ id: c.id, name: c.name, type: "ligacao" })),
    ...dispatchCampaigns.map((c) => ({ id: c.id, name: c.name, type: "despacho" })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !searchTerms.trim()) return;
    
    await onCreate({
      name: name.trim(),
      searchTerms: searchTerms.trim(),
      quantity: parseInt(quantity, 10) || 50,
      category: category.trim() || undefined,
      exactNames,
      places: places.trim() || undefined,
      postActionId: postActionId !== "none" ? postActionId : undefined,
    });
    
    setName("");
    setSearchTerms("");
    setCategory("");
    setPlaces("");
    setExactNames(false);
    setPostActionId("none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Busca no Google Maps</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground/70">
              Configure os parâmetros para extrair contatos qualificados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nome da Campanha
              </Label>
              <Input
                placeholder="Ex: Corretores em SP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-xl bg-background/50 border-border/40"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                O que você procura?
              </Label>
              <Input
                placeholder="Ex: Clínicas odontológicas"
                value={searchTerms}
                onChange={(e) => setSearchTerms(e.target.value)}
                required
                className="h-11 rounded-xl bg-background/50 border-border/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Onde? (Localização)
                </Label>
                <Input
                  placeholder="Ex: São Paulo, SP"
                  value={places}
                  onChange={(e) => setPlaces(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-border/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantidade
                </Label>
                <Input
                  type="number"
                  placeholder="50"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-background/50 border-border/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Filtro de Categoria (Opcional)
              </Label>
              <Input
                placeholder="Ex: Dentista"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 rounded-xl bg-background/50 border-border/40"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="exactNames" 
                checked={exactNames} 
                onCheckedChange={(c) => setExactNames(c as boolean)} 
              />
              <Label htmlFor="exactNames" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Buscar por nomes exatos (Strict match)
              </Label>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ação pós-prospecção (Automação)
              </Label>
              <Select value={postActionId} onValueChange={setPostActionId}>
                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40">
                  <SelectValue placeholder="Selecione uma campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Apenas salvar leads</SelectItem>
                  {allCampaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      Adicionar a: {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !name.trim() || !searchTerms.trim()}
              className="rounded-xl gradient-primary glow-primary font-bold shadow-lg min-w-[120px]"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Iniciar Busca
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
