import { Wallet as WalletIcon, Menu, PanelLeft } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";

function SystemClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center justify-center h-9 px-3 rounded-xl border border-border/50 bg-muted/30 text-[13px] font-medium text-muted-foreground tracking-widest tabular-nums">
      {time.toLocaleTimeString("pt-BR")}
    </div>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const { data: wallet } = useWallet();

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-[60px] items-center justify-between px-6 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 flex-1">
          <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <div className="flex items-center gap-2 md:hidden">
            <img src="/logo-sidebar-light.png" alt="Qualify Logo" className="h-6 w-auto" />
            <span className="font-extrabold text-sm tracking-widest text-foreground uppercase">QUALIFY</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black tracking-[0.15em] uppercase">Sistemas OK</span>
          </div>

          <SystemClock />

          {/* Wallet Balance Pill */}
          {wallet !== undefined && (
            <button
              type="button"
              onClick={() => navigate("/carteira/configuracoes")}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border/50 bg-muted/30 text-[13px] font-bold text-foreground hover:bg-accent hover:text-foreground hover:border-border transition-all duration-200 cursor-pointer"
            >
              <WalletIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {wallet !== null
                  ? wallet.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "R$ 0,00"}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
