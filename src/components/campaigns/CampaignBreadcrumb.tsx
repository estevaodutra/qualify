import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface CampaignBreadcrumbProps {
  channel: "whatsapp" | "telefonia";
  type: string;
}

const channelLabels = {
  whatsapp: "WhatsApp",
  telefonia: "Telefonia",
};

export function CampaignBreadcrumb({ channel, type }: CampaignBreadcrumbProps) {
  return (
    <Breadcrumb className="animate-fade-in stagger-1">
      <BreadcrumbList className="flex items-center gap-1">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/campaigns" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors">
              Hub de Campanhas
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        <BreadcrumbSeparator className="opacity-20">
          <ChevronRight className="h-3 w-3" />
        </BreadcrumbSeparator>

        <BreadcrumbItem>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            {channelLabels[channel]}
          </span>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="opacity-20">
          <ChevronRight className="h-3 w-3" />
        </BreadcrumbSeparator>

        <BreadcrumbItem>
          <BreadcrumbPage className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
            {type}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
