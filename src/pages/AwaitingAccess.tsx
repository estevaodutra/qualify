import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, RefreshCw, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export default function AwaitingAccess() {
  const { user, signOut } = useAuth();
  const { refetch, companies, isLoading } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleRecheck = async () => {
    setIsChecking(true);
    await refetch();
    setIsChecking(false);
    // If companies arrived, ProtectedRoute will allow navigation
    if (companies.length > 0) {
      navigate("/", { replace: true });
    } else {
      toast({
        title: "Ainda sem acesso",
        description: "Nenhuma empresa vinculada à sua conta foi encontrada.",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // If already has company while on this page, bounce to dashboard
  if (!isLoading && companies.length > 0) {
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 bg-background">
      {/* Decorative Background Blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/10 blur-[140px] rounded-full" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full animate-float" />
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="premium-card">
          <div className="h-1.5 w-full gradient-primary" />
          
          <div className="p-10 text-center">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 animate-bounce-soft">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            
            <h1 className="text-3xl font-black gradient-text mb-4">Aguardando Acesso</h1>
            <p className="text-sm font-medium text-muted-foreground/60 leading-relaxed mb-10 px-4">
              Sua conta foi criada com sucesso no ecossistema Qualify. Aguarde a liberação por um administrador.
            </p>

            <div className="space-y-6">
              {user?.email && (
                <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-left">
                  <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Autenticado como</p>
                    <p className="text-sm font-bold truncate text-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={handleRecheck} 
                  disabled={isChecking} 
                  className="h-12 rounded-2xl text-xs font-black uppercase tracking-widest gradient-primary shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", isChecking ? "animate-spin" : "")} />
                  Verificar Liberação
                </Button>
                <Button 
                  onClick={handleSignOut} 
                  variant="ghost" 
                  className="h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair da Conta
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">
          Suporte prioritário: <span className="text-primary/40 underline cursor-pointer">help@qualify.ia</span>
        </p>
      </div>
    </div>
  );
}
