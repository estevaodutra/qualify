import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if session exists or when auth state updates
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || null);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (session?.user) {
          setUserEmail(session.user.email || null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Senha definida com sucesso!",
        description: "Você será redirecionado para a plataforma.",
      });

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar nova senha. O link pode ter expirado.");
      toast({
        title: "Erro ao definir senha",
        description: err.message || "Tente novamente ou solicite um novo link.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-['Inter']">
      <div className="w-full max-w-[420px]">
        <div className="bg-card border border-border rounded-xl shadow-[0_1px_2px_hsl(220_15%_10%/0.05)] overflow-hidden">
          <div className="p-8 sm:p-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white rounded-xl flex items-center justify-center font-['Sora'] font-bold text-[18px] mb-5 shadow-lg">
                Qualify
              </div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {isSuccess ? "Senha Definida!" : "Criar sua Senha"}
              </h1>
              <p className="text-[13px] text-muted-foreground text-center mt-1">
                {isSuccess
                  ? "Sua conta está pronta. Redirecionando..."
                  : "Defina sua nova senha de acesso à plataforma Qualify."}
              </p>
              {userEmail && (
                <div className="mt-2 px-3 py-1 bg-muted/60 rounded-full text-xs font-medium text-muted-foreground">
                  {userEmail}
                </div>
              )}
            </div>

            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-in zoom-in-75 duration-300" />
                <p className="text-sm text-foreground font-medium">Tudo pronto!</p>
                <p className="text-xs text-muted-foreground">Entrando na plataforma...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                {errorMsg && (
                  <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-[12px] font-medium text-foreground">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      minLength={6}
                      className="h-10 pr-10 rounded-lg bg-background border-border text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-[12px] font-medium text-foreground">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    minLength={6}
                    className="h-10 rounded-lg bg-background border-border text-[13px]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground mt-2 hover:bg-primary/90 transition-all shadow-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando senha...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Definir Senha e Acessar
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voltar para o login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
