import { useState } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, UserCheck, Zap, History } from "lucide-react";
import { URAConfigTab } from "./tabs/URAConfigTab";
import { URALeadsTab } from "./tabs/URALeadsTab";
import { DTMFActionsTab } from "./tabs/DTMFActionsTab";
import { URAHistoryTab } from "./tabs/URAHistoryTab";

interface URACampaignDetailsProps {
  campaign: URACampaign;
  onBack: () => void;
  onUpdate: (params: { id: string; updates: Partial<URACampaign> }) => Promise<URACampaign>;
}

export function URACampaignDetails({
  campaign,
  onBack,
  onUpdate,
}: URACampaignDetailsProps) {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="config" className="gap-2 rounded-lg py-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2 rounded-lg py-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Leads & Destinos</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2 rounded-lg py-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Ações DTMF</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 rounded-lg py-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Logs & Gráficos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="focus-visible:ring-0">
          <URAConfigTab campaign={campaign} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="leads" className="focus-visible:ring-0">
          <URALeadsTab campaign={campaign} />
        </TabsContent>

        <TabsContent value="actions" className="focus-visible:ring-0">
          <DTMFActionsTab campaign={campaign} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="history" className="focus-visible:ring-0">
          <URAHistoryTab campaign={campaign} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
