import { useState } from "react";
import { DispatchCampaign } from "@/hooks/useDispatchCampaigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Workflow, BarChart3 } from "lucide-react";
import { ConfigTab } from "./tabs/ConfigTab";
import { ContactsTab } from "./tabs/ContactsTab";
import { SequencesTab } from "./tabs/SequencesTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";

interface DispatchCampaignDetailsProps {
  campaign: DispatchCampaign;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<DispatchCampaign>) => Promise<void>;
}

export function DispatchCampaignDetails({ campaign, onBack, onUpdate }: DispatchCampaignDetailsProps) {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Contatos</span>
          </TabsTrigger>
          <TabsTrigger value="sequences" className="gap-2">
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Sequências</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <ConfigTab campaign={campaign} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <SequencesTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab campaignId={campaign.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
