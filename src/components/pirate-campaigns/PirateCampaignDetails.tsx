import { useState } from "react";
import { PirateCampaign } from "@/hooks/usePirateCampaigns";
import { usePirateGroups } from "@/hooks/usePirateGroups";
import { usePirateLeads } from "@/hooks/usePirateLeads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, BarChart3, Skull, CalendarDays, Settings } from "lucide-react";
import { PirateGroupsTab } from "./tabs/PirateGroupsTab";
import { PirateLeadsTab } from "./tabs/PirateLeadsTab";
import { PirateConfigTab } from "./tabs/PirateConfigTab";

interface PirateCampaignDetailsProps {
  campaign: PirateCampaign;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<PirateCampaign>) => Promise<void>;
}

export function PirateCampaignDetails({ campaign, onBack, onUpdate }: PirateCampaignDetailsProps) {
  const [activeTab, setActiveTab] = useState("config");
  const { groups } = usePirateGroups(campaign.id);
  const { leads } = usePirateLeads(campaign.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const leadsToday = leads.filter((l) => new Date(l.joinedAt) >= today).length;
  const leadsWeek = leads.filter((l) => new Date(l.joinedAt) >= weekAgo).length;

  const metrics = [
    { label: "Total", value: campaign.totalLeadsCaptured, icon: BarChart3 },
    { label: "Hoje", value: leadsToday, icon: CalendarDays },
    { label: "Esta Semana", value: leadsWeek, icon: CalendarDays },
    { label: "Grupos", value: groups.length, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Skull className="h-5 w-5" />
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 text-center">
              <m.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Grupos ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Leads ({campaign.totalLeadsCaptured})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <PirateConfigTab campaign={campaign} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          <PirateGroupsTab campaignId={campaign.id} instanceId={campaign.instanceId} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <PirateLeadsTab campaignId={campaign.id} groups={groups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
