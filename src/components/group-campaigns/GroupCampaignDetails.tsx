import { useState } from "react";
import { GroupCampaign } from "@/hooks/useGroupCampaigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Shield, BarChart3, List, Workflow, ClipboardList } from "lucide-react";
import { ConfigTab } from "./tabs/ConfigTab";
import { MembersTab } from "./tabs/MembersTab";
import { ModerationTab } from "./tabs/ModerationTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { GroupsListTab } from "./tabs/GroupsListTab";
import { SequencesTab } from "./tabs/SequencesTab";
import { ExecutionListTab } from "./tabs/ExecutionListTab";

interface GroupCampaignDetailsProps {
  campaign: GroupCampaign;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<GroupCampaign>) => Promise<void>;
}

export function GroupCampaignDetails({
  campaign,
  onBack,
  onUpdate,
}: GroupCampaignDetailsProps) {
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
          {campaign.groupName && (
            <p className="text-muted-foreground">{campaign.groupName}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Membros</span>
          </TabsTrigger>
          <TabsTrigger value="sequences" className="gap-2">
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Sequências</span>
          </TabsTrigger>
          <TabsTrigger value="execution-list" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Moderação</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <ConfigTab campaign={campaign} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          <GroupsListTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MembersTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <SequencesTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="execution-list" className="mt-6">
          <ExecutionListTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab campaignId={campaign.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
