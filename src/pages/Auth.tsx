import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

export default function Auth() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: "Email ou senha incorretos.", variant: "destructive" });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = signupSchema.safeParse({ email, password, fullName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada com sucesso!", description: "Você já pode começar a usar a plataforma." });
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSubmitting(false);
      toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-['Inter']">
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-[0_1px_2px_hsl(220_15%_10%/0.05)] overflow-hidden">

          <div className="p-8 sm:p-10">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white rounded-xl flex items-center justify-center font-['Sora'] font-bold text-[18px] mb-5 shadow-lg">
                Qualify
              </div>
              <p className="text-[14px] text-muted-foreground text-center">
                Plataforma de disparo de mensagens
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-8 p-1 bg-secondary rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                  activeTab === "login"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                  activeTab === "signup"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Criar Conta
              </button>
            </div>

            {/* Forms */}
            {activeTab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[12px] font-medium text-foreground">Email</Label>
                  <Input id="login-email" type="email" placeholder="seu@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting}
                    className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary text-[13px] transition-all" />
                  {errors.email && <p className="text-[11px] font-medium text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[12px] font-medium text-foreground">Senha</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting}
                    className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary text-[13px] transition-all" />
                  {errors.password && <p className="text-[11px] font-medium text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full h-10 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground mt-2 hover:bg-primary/90 transition-all shadow-sm"
                  disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aguarde...</> : "Entrar"}
                </Button>
              </form>
            )}

            {activeTab === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-[12px] font-medium text-foreground">Nome</Label>
                  <Input id="signup-name" type="text" placeholder="Seu nome" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} disabled={isSubmitting}
                    className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary text-[13px] transition-all" />
                  {errors.fullName && <p className="text-[11px] font-medium text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[12px] font-medium text-foreground">Email</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting}
                    className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary text-[13px] transition-all" />
                  {errors.email && <p className="text-[11px] font-medium text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-[12px] font-medium text-foreground">Senha</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting}
                    className="h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary text-[13px] transition-all" />
                  {errors.password && <p className="text-[11px] font-medium text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full h-10 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground mt-2 hover:bg-primary/90 transition-all shadow-sm"
                  disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Conta"}
                </Button>
              </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-card">
                  Ou continue com
                </span>
              </div>
            </div>

            <Button variant="outline" onClick={handleGoogleLogin} disabled={isSubmitting}
              className="w-full h-10 rounded-lg border-border bg-background text-foreground text-[13px] font-medium transition-all hover:bg-secondary">
              <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
