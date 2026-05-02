import { useState } from "react";
import { CallCampaign } from "@/hooks/useCallCampaigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, FileText, Zap, UserCheck, History } from "lucide-react";
import { ConfigTab } from "./tabs/ConfigTab";
import { ScriptTab } from "./tabs/ScriptTab";
import { ActionsTab } from "./tabs/ActionsTab";
import { LeadsTab } from "./tabs/LeadsTab";
import { HistoryTab } from "./tabs/HistoryTab";

interface CallCampaignDetailsProps {
  campaign: CallCampaign;
  onBack: () => void;
  onUpdate: (params: { id: string; updates: Partial<CallCampaign> }) => Promise<CallCampaign>;
}

export function CallCampaignDetails({
  campaign,
  onBack,
  onUpdate,
}: CallCampaignDetailsProps) {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="script" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Roteiro</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Ações</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <ConfigTab campaign={campaign} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="script" className="mt-6">
          <ScriptTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="actions" className="mt-6">
          <ActionsTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <LeadsTab
            campaignId={campaign.id}
            queueExecutionEnabled={campaign.queueExecutionEnabled}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab campaignId={campaign.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
