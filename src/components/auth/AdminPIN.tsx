import { useState } from "react";
import { Shield, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface AdminPINProps {
  onSuccess: () => void;
}

export function AdminPIN({ onSuccess }: AdminPINProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Hardcoded master PIN for now
    // In a real scenario, this would be a hash check against the database
    setTimeout(() => {
      if (pin === "2026") {
        toast({
          title: "Acesso Autorizado",
          description: "Bem-vindo ao painel de controle mestre.",
        });
        sessionStorage.setItem("superadmin_verified", "true");
        onSuccess();
      } else {
        toast({
          title: "Acesso Negado",
          description: "O PIN inserido está incorreto.",
          variant: "destructive",
        });
        setPin("");
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] p-4">
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      
      <Card className="w-full max-w-md border-white/10 bg-zinc-900/50 backdrop-blur-xl shadow-2xl animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-elevation-lg glow-primary">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-tight">Zona Restrita</CardTitle>
          <CardDescription className="text-zinc-400 font-medium">
            Insira o PIN de acesso mestre para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
              <Input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-14 pl-12 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] focus:ring-primary/20 focus:border-primary/40 rounded-xl"
                autoFocus
                maxLength={4}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl font-bold gradient-primary shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
              disabled={isLoading || pin.length < 4}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Verificar Identidade
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest font-black">
              Autenticação de Segundo Nível Requerida
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
