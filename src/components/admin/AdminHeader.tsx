import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield,
  Search,
  Bell,
  LogOut,
  User,
  ArrowLeft,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGlobalSearchModal } from "./AdminGlobalSearchModal";
import { useAdminDashboard } from "@/hooks/useAdmin";

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
}

export function AdminHeader({ onToggleMobileMenu }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: dashboardData } = useAdminDashboard();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isProduction = import.meta.env.PROD;
  const lowBalanceCount = dashboardData?.alerts?.lowBalanceCount ?? 0;
  const awaitingCount = dashboardData?.alerts?.awaitingAccessCount ?? 0;
  const totalAlerts = lowBalanceCount + awaitingCount;

  return (
    <>
      <header className="h-14 sticky top-0 z-40 border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 sm:px-6 gap-3">
        {/* Lado Esquerdo: Mobile Trigger + Título / Ambiente */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-muted-foreground"
            onClick={onToggleMobileMenu}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Badge
              variant="destructive"
              className="gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider shadow-sm"
            >
              <Shield className="h-3.5 w-3.5" />
              Super Admin
            </Badge>

            <Badge
              variant="outline"
              className={`hidden sm:inline-flex text-[10px] font-mono uppercase px-1.5 py-0 ${
                isProduction
                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-600 bg-amber-500/10"
              }`}
            >
              {isProduction ? "Produção" : "Ambiente Dev"}
            </Badge>
          </div>
        </div>

        {/* Centro: Barra de Busca Global */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full h-9 flex items-center justify-between px-3 text-sm rounded-lg border bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-4 w-4 shrink-0" />
              <span>Buscar empresas, usuários, IA, logs...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Lado Direito: Busca Mobile + Notificações + Usuário */}
        <div className="flex items-center gap-2">
          {/* Botão de Busca Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden h-9 w-9"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notificações Reais */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                {totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-lg">
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <span className="font-semibold text-sm">Notificações Operacionais</span>
                <Badge variant={totalAlerts > 0 ? "destructive" : "secondary"} className="text-[10px]">
                  {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"}
                </Badge>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y text-sm">
                {totalAlerts === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-medium text-foreground text-sm">Tudo operando normalmente</p>
                    <p className="text-xs mt-1">Nenhum incidente ou alerta crítico aberto.</p>
                  </div>
                ) : (
                  <>
                    {lowBalanceCount > 0 && (
                      <Link
                        to="/admin/empresas?balance=low"
                        className="p-3 flex items-start gap-3 hover:bg-muted/50 transition block"
                      >
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-xs leading-none">Saldo baixo em empresas</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {lowBalanceCount} {lowBalanceCount === 1 ? "empresa está" : "empresas estão"} com saldo abaixo de R$ 50.
                          </p>
                        </div>
                      </Link>
                    )}

                    {awaitingCount > 0 && (
                      <Link
                        to="/admin/usuarios"
                        className="p-3 flex items-start gap-3 hover:bg-muted/50 transition block"
                      >
                        <User className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-xs leading-none">Usuários aguardando acesso</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {awaitingCount} {awaitingCount === 1 ? "novo usuário cadastrado" : "novos usuários cadastrados"}.
                          </p>
                        </div>
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className="p-2 border-t bg-muted/10 text-center">
                <Link
                  to="/admin/sistema/erros"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Ver diagnóstico completo do sistema →
                </Link>
              </div>
            </PopoverContent>
          </Popover>

          {/* Menu do Super Admin */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2 h-9">
                <div className="h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xs">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </div>
                <span className="hidden md:inline-block max-w-[140px] truncate text-xs font-medium">
                  {user?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "Super Admin"}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao App Qualify
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/sistema/configuracoes")}>
                <Shield className="mr-2 h-4 w-4" />
                Configurações da Plataforma
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Encerrar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal de Busca Global */}
      <AdminGlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
