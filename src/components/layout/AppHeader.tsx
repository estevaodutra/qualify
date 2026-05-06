import { Bell, Search, LogOut, Settings, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();

    if (error) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível encerrar a sessão. Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Até logo!",
        description: "Você foi desconectado com sucesso.",
      });
    }

    navigate("/auth");
  };

  const userEmail = user?.email || "Usuário";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0];
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-[60px] items-center justify-between px-6 gap-4">

        {/* Left */}
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />

          <div className="relative group hidden md:flex items-center w-72">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-200 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="h-9 w-full rounded-xl border border-border/60 bg-muted/40
                         pl-10 pr-4 text-[13px] font-medium text-foreground
                         placeholder:text-muted-foreground/40
                         focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                         outline-none transition-all duration-200"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black tracking-[0.15em] uppercase">Sistemas OK</span>
          </div>

          {/* Notifications */}
          <button className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border transition-all duration-200">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary border-2 border-background" />
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 rounded-xl px-2 gap-2.5 hover:bg-accent transition-all active:scale-95 group"
              >
                <Avatar className="h-7 w-7 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
                  <AvatarFallback className="rounded-lg gradient-primary text-white text-[10px] font-bold uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start leading-none">
                  <span className="text-[13px] font-semibold text-foreground">{userName}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">Admin</span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 rounded-2xl shadow-elevation-lg border-border/50 bg-background/95 backdrop-blur-xl p-2">
              <DropdownMenuLabel className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-xl shadow-sm">
                    <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
                    <AvatarFallback className="rounded-xl gradient-primary text-white text-xs font-bold uppercase">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{userEmail}</p>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border/50 my-1" />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl gap-3 px-3 py-2.5 text-[13px] font-bold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t("header.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
