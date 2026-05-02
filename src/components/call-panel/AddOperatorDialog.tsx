import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Crown, User } from "lucide-react";

interface AddOperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddOperatorDialog({ open, onOpenChange }: AddOperatorDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [extension, setExtension] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeCompanyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!email.trim() || !activeCompanyId) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-add-member", {
        body: {
          email: email.trim().toLowerCase(),
          role,
          extension: extension.trim() || null,
          company_id: activeCompanyId,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({
          title: "Erro",
          description: data.error === "user_not_found"
            ? "Usuário não encontrado. O operador precisa criar uma conta no DispatchOne primeiro."
            : data.error === "already_member"
              ? "Este usuário já faz parte da companhia."
              : data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Operador adicionado",
        description: `${data.member_name || email} foi adicionado à companhia.`,
      });

      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      queryClient.invalidateQueries({ queryKey: ["company_members"] });
      onOpenChange(false);
      setEmail("");
      setRole("operator");
      setExtension("");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Falha ao adicionar operador.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Operador
          </DialogTitle>
          <DialogDescription>
            Busque pelo email do operador. Ele precisa ter uma conta no DispatchOne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="operador@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <RadioGroup value={role} onValueChange={setRole} className="space-y-2">
              <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="operator" id="role-operator" className="mt-0.5" />
                <label htmlFor="role-operator" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Operador</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pode receber e realizar ligações
                  </p>
                </label>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="admin" id="role-admin" className="mt-0.5" />
                <label htmlFor="role-admin" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm">Administrador</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pode gerenciar campanhas, operadores e configurações
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extension">Ramal/Extensão (opcional)</Label>
            <Input
              id="extension"
              placeholder="1003"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pode ser configurado depois pelo operador
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !email.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
