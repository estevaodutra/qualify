import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export interface StepSearchData {
  name: string;
  searchTerms: string;
  places: string;
  quantity: string;
  category: string;
  exactNames: boolean;
}

interface StepSearchProps {
  data: StepSearchData;
  onChange: (patch: Partial<StepSearchData>) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function StepSearch({ data, onChange, onNext, onCancel }: StepSearchProps) {
  const isValid = data.name.trim().length > 0 && data.searchTerms.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nome da prospecção
          </Label>
          <Input
            placeholder="Ex: Imobiliárias — São Paulo"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-11 rounded-xl bg-background/50 border-border/40"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            O que você procura?
          </Label>
          <Input
            placeholder="Ex: Imobiliárias"
            value={data.searchTerms}
            onChange={(e) => onChange({ searchTerms: e.target.value })}
            className="h-11 rounded-xl bg-background/50 border-border/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Onde deseja prospectar?
            </Label>
            <Input
              placeholder="Ex: São Paulo, SP"
              value={data.places}
              onChange={(e) => onChange({ places: e.target.value })}
              className="h-11 rounded-xl bg-background/50 border-border/40"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantidade de empresas
            </Label>
            <Input
              type="number"
              min="1"
              max="1000"
              value={data.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              className="h-11 rounded-xl bg-background/50 border-border/40"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Categoria (opcional)
          </Label>
          <Input
            placeholder="Ex: Agência imobiliária"
            value={data.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="h-11 rounded-xl bg-background/50 border-border/40"
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="exactNames"
            checked={data.exactNames}
            onCheckedChange={(c) => onChange({ exactNames: c as boolean })}
          />
          <Label htmlFor="exactNames" className="text-sm font-medium leading-none">
            Buscar apenas nomes exatos
          </Label>
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-4 shrink-0">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl font-semibold">
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="rounded-xl gradient-primary glow-primary font-bold shadow-lg min-w-[120px]"
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
