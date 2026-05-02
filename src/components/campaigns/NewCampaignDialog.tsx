import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SendHorizontal,
  Users,
  Skull,
  Bot,
  PhoneCall,
  MessageSquare,
  Phone,
} from "lucide-react";

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const campaignTypes = {
  whatsapp: [
    {
      id: "despacho",
      title: "Disparos",
      description: "Disparo de mensagens em massa para lista de contatos",
      icon: SendHorizontal,
      href: "/campaigns/whatsapp/despacho",
      colorClass: "bg-blue-500",
      enabled: true,
    },
    {
      id: "grupos",
      title: "Grupos",
      description: "Gestão de grupos com sequências e automações",
      icon: Users,
      href: "/campaigns/whatsapp/grupos",
      colorClass: "bg-green-500",
      enabled: true,
    },
    {
      id: "pirata",
      title: "Pirata",
      description: "Campanha especial",
      icon: Skull,
      href: "/campaigns/whatsapp/pirata",
      colorClass: "bg-purple-500",
      enabled: true,
    },
  ],
  telefonia: [
    {
      id: "ura",
      title: "URA",
      description: "Fluxo de áudio interativo com DTMF",
      icon: Bot,
      href: "/campaigns/telefonia/ura",
      colorClass: "bg-orange-500",
      enabled: false,
    },
    {
      id: "ligacao",
      title: "Ligação",
      description: "Chamadas de voz automáticas",
      icon: PhoneCall,
      href: "/campaigns/telefonia/ligacao",
      colorClass: "bg-red-500",
      enabled: true,
    },
  ],
};

export function NewCampaignDialog({ open, onOpenChange }: NewCampaignDialogProps) {
  const navigate = useNavigate();

  const handleSelect = (href: string, enabled: boolean) => {
    if (!enabled) return;
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
          <DialogDescription>
            Selecione o tipo de campanha que deseja criar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* WhatsApp */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </div>
            <div className="space-y-2">
              {campaignTypes.whatsapp.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelect(type.href, type.enabled)}
                  disabled={!type.enabled}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                    type.enabled
                      ? "hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      type.colorClass
                    )}
                  >
                    <type.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{type.title}</span>
                      {!type.enabled && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          Em breve
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Telefonia */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Telefonia
            </div>
            <div className="space-y-2">
              {campaignTypes.telefonia.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelect(type.href, type.enabled)}
                  disabled={!type.enabled}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                    type.enabled
                      ? "hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      type.colorClass
                    )}
                  >
                    <type.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{type.title}</span>
                      {!type.enabled && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          Em breve
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
