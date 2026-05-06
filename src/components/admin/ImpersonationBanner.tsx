import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { EyeOff } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, activeCompany, impersonateCompany } = useCompany();

  if (!isImpersonating) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-950 animate-pulse" />
        Você está personificando a empresa: <span className="font-bold underline">{activeCompany?.name}</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 text-xs bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 border-amber-950/20"
        onClick={() => {
          impersonateCompany(null);
          window.location.href = "/admin/empresas";
        }}
      >
        <EyeOff className="h-3.5 w-3.5 mr-1.5" />
        Parar de Personificar
      </Button>
    </div>
  );
}
