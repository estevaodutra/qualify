import CustomDomainCard from "@/components/scheduling/settings/CustomDomainCard";
import DefaultTimezoneCard from "@/components/scheduling/settings/DefaultTimezoneCard";
import GlobalIntegrationsCard from "@/components/scheduling/settings/GlobalIntegrationsCard";
import BrandingCard from "@/components/scheduling/settings/BrandingCard";
import GlobalWebhookCard from "@/components/scheduling/settings/GlobalWebhookCard";
import NotificationDefaultsCard from "@/components/scheduling/settings/NotificationDefaultsCard";

export default function SchedulingSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <CustomDomainCard />
      <DefaultTimezoneCard />
      <GlobalIntegrationsCard />
      <BrandingCard />
      <GlobalWebhookCard />
      <NotificationDefaultsCard />
    </div>
  );
}
