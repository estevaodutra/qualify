import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { UserCircle, Settings, Users, Radio, Wallet, CreditCard, FileText, Sliders, Tag, ChevronDown } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useCompany();

  const settingsGroups = [
    {
      title: "CONTA",
      items: [
        { title: "Meu Perfil", url: "/settings/profile", icon: UserCircle },
        { title: "Conta", url: "/settings/account", icon: Settings },
        ...(isAdmin ? [{ title: "Membros", url: "/settings/members", icon: Users }] : []),
      ],
    },
    {
      title: "CRM",
      items: [
        { title: "Campos Adicionais", url: "/settings/custom-fields", icon: Sliders },
        { title: "Tags", url: "/settings/tags", icon: Tag },
      ],
    },
    {
      title: "INTEGRAÇÕES",
      items: [
        { title: "Connections", url: "/settings/connections", icon: Radio },
      ],
    },
    {
      title: "FINANCEIRO",
      items: [
        { title: "Carteira", url: "/carteira", icon: Wallet },
        { title: "Billing", url: "/billing", icon: CreditCard },
      ],
    },
    {
      title: "SISTEMA",
      items: [
        { title: "Logs", url: "/settings/logs", icon: FileText },
      ],
    },
  ];

  const allItems = settingsGroups.flatMap(g => g.items);
  const activeItem = allItems.find(item => 
    location.pathname === item.url ||
    (item.url === "/settings/profile" && location.pathname === "/settings") ||
    (item.url === "/settings/custom-fields" && location.pathname === "/settings/fields")
  ) || allItems[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[80vh] pb-10">
      {/* Mobile Navigation Dropdown & Horizontal Tabs */}
      <div className="lg:hidden w-full space-y-3 bg-card/30 backdrop-blur-xl p-4 rounded-2xl border border-border/40">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Configurações
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">
            {activeItem.title}
          </span>
        </div>

        {/* Horizontal Scroll Pill Menu */}
        <div className="flex overflow-x-auto gap-2 py-1 scrollbar-hide flex-nowrap">
          {allItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              (item.url === "/settings/profile" && location.pathname === "/settings") ||
              (item.url === "/settings/custom-fields" && location.pathname === "/settings/fields");

            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Desktop Secondary Settings Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 space-y-6 bg-card/30 backdrop-blur-xl p-5 rounded-2xl border border-border/40 self-start">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Configurações
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie sua conta, equipe e infraestrutura.
          </p>
        </div>

        <nav className="space-y-6">
          {settingsGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-3">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.url ||
                    (item.url === "/settings/profile" && location.pathname === "/settings") ||
                    (item.url === "/settings/custom-fields" && location.pathname === "/settings/fields");
                  return (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      <span>{item.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Settings Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
