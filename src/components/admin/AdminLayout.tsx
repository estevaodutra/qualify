import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Tag,
  Phone,
  FileBarChart,
  Settings,
  Shield,
  ArrowLeft,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Empresas", url: "/admin/empresas", icon: Building2 },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
];

const financialItems = [
  { title: "Transações", url: "/admin/financeiro/transacoes" },
  { title: "Recargas", url: "/admin/financeiro/recargas" },
  { title: "Consumo", url: "/admin/financeiro/consumo" },
];

const otherItems = [
  { title: "Preços", url: "/admin/precos", icon: Tag },
  { title: "Provedores", url: "/admin/provedores", icon: Phone },
  { title: "Relatórios", url: "/admin/relatorios", icon: FileBarChart },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [finOpen, setFinOpen] = useState(pathname.startsWith("/admin/financeiro"));

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;

  return (
    <div className="min-h-screen flex bg-background w-full">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="h-14 border-b flex items-center gap-2 px-4">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="font-semibold tracking-tight">DispatchOne Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {mainItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}

          <Collapsible open={finOpen} onOpenChange={setFinOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={linkClass(pathname.startsWith("/admin/financeiro")) + " w-full justify-between"}
              >
                <span className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${finOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1 space-y-1">
              {financialItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`
                  }
                >
                  {item.title}
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {otherItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao app
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 sticky top-0 z-40 border-b bg-background/95 backdrop-blur flex items-center justify-between px-6">
          <Badge variant="destructive" className="gap-1.5">
            <Shield className="h-3 w-3" />
            Modo Superadmin
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
