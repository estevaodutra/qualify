import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CampaignTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  activeCount: number;
  colorClass: string;
  href: string;
  comingSoon?: boolean;
}

export function CampaignTypeCard({
  icon: Icon,
  title,
  description,
  activeCount,
  colorClass,
  href,
  comingSoon = false,
}: CampaignTypeCardProps) {
  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-elevation-md hover:border-border/80",
        comingSoon && "opacity-60 cursor-not-allowed"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
              colorClass
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {comingSoon && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Em breve
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
            <p className="text-sm font-medium text-muted-foreground mt-3">
              {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
            </p>
          </div>
        </div>
      </CardContent>
      {!comingSoon && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-1 transform scale-x-0 transition-transform duration-200",
            "group-hover:scale-x-100",
            colorClass
          )}
        />
      )}
    </Card>
  );

  if (comingSoon) {
    return content;
  }

  return (
    <Link to={href} className="block">
      {content}
    </Link>
  );
}
