import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n";
import { useGroupCampaigns, GroupCampaign } from "@/hooks/useGroupCampaigns";
import { GroupCampaignList, GroupCampaignDetails, CreateGroupDialog } from "@/components/group-campaigns";
import { toast } from "sonner";

export default function GroupCampaigns() {
  const { t } = useLanguage();
  const [selectedCampaign, setSelectedCampaign] = useState<GroupCampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const { 
    campaigns, 
    isLoading, 
    createCampaign,
    updateCampaign, 
    deleteCampaign 
  } = useGroupCampaigns();

  const handleCreate = async (data: {
    name: string;
    instanceId?: string;
    groupName?: string;
    groupDescription?: string;
  }) => {
    try {
      setIsCreating(true);
      await createCampaign({
        name: data.name,
        instanceId: data.instanceId,
        groupName: data.groupName,
        groupDescription: data.groupDescription,
      });
      setShowCreateDialog(false);
      toast.success(t("groupCampaigns.campaignCreated"));
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign({
        id,
        updates: { status },
      });
      toast.success(status === "active" ? t("groupCampaigns.campaignActivated") : t("groupCampaigns.campaignPaused"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      toast.success(t("groupCampaigns.campaignDeleted"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleUpdate = async (id: string, updates: Partial<GroupCampaign>) => {
    try {
      await updateCampaign({ id, updates });
      // Update selectedCampaign with new values
      if (selectedCampaign && selectedCampaign.id === id) {
        setSelectedCampaign({
          ...selectedCampaign,
          ...updates,
        });
      }
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  // Sync selectedCampaign when campaigns list updates
  useEffect(() => {
    if (selectedCampaign && campaigns) {
      const updatedCampaign = campaigns.find(c => c.id === selectedCampaign.id);
      if (updatedCampaign) {
        setSelectedCampaign(updatedCampaign);
      }
    }
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {selectedCampaign ? (
        <GroupCampaignDetails
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaign(null)}
          onUpdate={handleUpdate}
        />
      ) : (
        <GroupCampaignList
          campaigns={campaigns || []}
          isLoading={isLoading}
          onSelect={setSelectedCampaign}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateDialog(true)}
        />
      )}

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
}
