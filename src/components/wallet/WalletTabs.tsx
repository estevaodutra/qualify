import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function WalletTabs() {
  const location = useLocation();
  const tabs = [
    { name: "Saldo", path: "/carteira" },
    { name: "Extrato", path: "/carteira/extrato" },
    { name: "Configurações", path: "/carteira/configuracoes" },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-border mb-6">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || location.pathname === tab.path + '/';
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              "pb-3 text-sm font-medium transition-colors border-b-2 -mb-[1px]",
              isActive 
                ? "text-[#8A3CFF] border-[#8A3CFF]" 
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
