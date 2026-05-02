import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInstances } from "@/hooks/useInstances";
import { AlertTriangle, X, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InstanceStatusBanner() {
  const { instances, isLoading } = useInstances();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("instance-banner-dismissed") === "true"
  );

  if (isLoading || dismissed || instances.length === 0) return null;

  const allDown = instances.every(
    (i) => i.status !== "connected" || i.paymentStatus === "EXPIRED"
  );

  if (!allDown) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("instance-banner-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="mx-6 mt-4">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-4",
          "bg-warning/10 border-warning/30"
        )}
      >
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
        <div className="flex-1 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            Nenhuma instância conectada
          </p>
          <p className="text-sm text-muted-foreground">
            Conecte uma instância para enviar mensagens e utilizar as campanhas.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 flex-shrink-0"
          onClick={() => navigate("/instances")}
        >
          <Wifi className="h-4 w-4" />
          Conectar Instância
        </Button>
        <button
          onClick={handleDismiss}
          className="rounded-md p-1 hover:bg-foreground/10 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
