import { useState } from "react";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MessageSquare, Phone, SendHorizontal, Users, Skull, Bot, PhoneCall } from "lucide-react";
import { CampaignTypeCard, NewCampaignDialog } from "@/components/campaigns";
import { useCampaignStats } from "@/hooks/useCampaignStats";

export default function CampaignsHub() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { data: stats, isLoading } = useCampaignStats();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-6 w-24" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-6 w-24" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Campanhas"
          description="Gerencie suas campanhas de envio"
        />
        <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* WhatsApp Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold">WhatsApp</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <CampaignTypeCard
            icon={SendHorizontal}
            title="Disparos"
            description="Disparo de mensagens em massa para lista de contatos"
            activeCount={stats?.despacho.active || 0}
            colorClass="bg-blue-500"
            href="/campaigns/whatsapp/despacho"
          />
          <CampaignTypeCard
            icon={Users}
            title="Grupos"
            description="Gestão de grupos com sequências e automações"
            activeCount={stats?.grupos.active || 0}
            colorClass="bg-green-500"
            href="/campaigns/whatsapp/grupos"
          />
          <CampaignTypeCard
            icon={Skull}
            title="Pirata"
            description="Campanha especial"
            activeCount={stats?.pirata.active || 0}
            colorClass="bg-purple-500"
            href="/campaigns/whatsapp/pirata"
            
          />
        </div>
      </section>

      {/* Telefonia Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Telefonia</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <CampaignTypeCard
            icon={Bot}
            title="URA"
            description="Fluxo de áudio interativo com DTMF"
            activeCount={stats?.ura.active || 0}
            colorClass="bg-orange-500"
            href="/campaigns/telefonia/ura"
            comingSoon
          />
          <CampaignTypeCard
            icon={PhoneCall}
            title="Ligação"
            description="Chamadas de voz automáticas"
            activeCount={stats?.ligacao.active || 0}
            colorClass="bg-red-500"
            href="/campaigns/telefonia/ligacao"
          />
        </div>
      </section>

      <NewCampaignDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
