import { Wallet as WalletIcon, BellRing, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
  const { isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-[60px] min-w-0 items-center justify-between px-4 md:px-6 gap-3 md:gap-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3 flex-1">
          <div className="flex min-w-0 items-center md:hidden">
            <img src="/logo-sidebar-light.png" alt="Qualify" className="h-7 w-auto max-w-full object-contain" />
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {/* Status pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black tracking-[0.15em] uppercase">Sistemas OK</span>
          </div>

          <SystemClock />

          <button
            type="button"
            onClick={() => void (isSubscribed ? unsubscribe() : subscribe())}
            disabled={isLoading}
            aria-label={isSubscribed ? "Desativar notificações push" : "Ativar notificações push"}
            title={isSubscribed ? "Desativar notificações push" : "Ativar notificações push"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground hover:text-[#5856D6] disabled:opacity-50"
          >
            {isSubscribed ? <BellRing className="h-4 w-4 text-[#5856D6]" /> : <BellOff className="h-4 w-4" />}
          </button>
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
