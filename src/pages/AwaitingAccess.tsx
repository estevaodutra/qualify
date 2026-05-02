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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Aguardando acesso</CardTitle>
            <CardDescription className="mt-2">
              Sua conta foi criada com sucesso! Aguarde um administrador adicionar você a uma empresa.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {user?.email && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Conectado como</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Entre em contato com o administrador da sua empresa para solicitar acesso.
          </p>

          <div className="flex flex-col gap-2">
            <Button onClick={handleRecheck} disabled={isChecking} className="w-full">
              <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
              Verificar novamente
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
