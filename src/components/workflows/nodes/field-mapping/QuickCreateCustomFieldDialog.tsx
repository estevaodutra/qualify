import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface QuickCreateCustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory: "lead" | "deal" | "company";
  onSuccess: () => void;
}

export function QuickCreateCustomFieldDialog({ open, onOpenChange, defaultCategory, onSuccess }: QuickCreateCustomFieldDialogProps) {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<"text" | "number" | "date" | "boolean" | "select">("text");
  const [category, setCategory] = useState<"lead" | "deal" | "company">(defaultCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setKey("");
      setType("text");
      setCategory(defaultCategory);
    }
  }, [open, defaultCategory]);

  useEffect(() => {
    if (name) {
      const generatedKey = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/(^_|_$)/g, "");
      setKey(generatedKey);
    }
  }, [name]);

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    if (!name.trim() || !key.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome e Chave são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const fieldData = {
        company_id: activeCompany.id,
        name: name.trim(),
        key: key.trim(),
        description: null,
        type,
        category,
        group_name: "Geral",
        is_visible: true,
        is_private: false
      };

      const { error } = await supabase.from("custom_fields_metadata").insert([fieldData]);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error("Já existe um campo com esta chave.");
        }
        throw error;
      }
      
      toast({ title: "Campo criado com sucesso!" });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Campo</DialogTitle>
          <DialogDescription>
            Crie um campo personalizado para armazenar a sua informação mapeada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Entidade Destino</Label>
            <Select value={category} onValueChange={(val: any) => setCategory(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead / Contato</SelectItem>
                <SelectItem value="deal">Negócio / Oportunidade</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Campo</Label>
            <Input 
              id="name" 
              placeholder="Ex: CPF, CNPJ, Observações" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="key">Chave do Campo (Automática)</Label>
            <Input 
              id="key" 
              value={key} 
              onChange={(e) => setKey(e.target.value)} 
              className="font-mono text-xs" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Dado</Label>
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto / Curto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="boolean">Verdadeiro / Falso (Sim/Não)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="bg-[#8A3CFF] hover:bg-[#8A3CFF]/90 text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Campo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
