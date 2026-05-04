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
        "group relative overflow-hidden transition-all duration-300",
        "border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl",
        "hover:shadow-xl hover:border-[#8A3CFF]/40 hover:shadow-[0_0_0_1px_rgba(138,60,255,0.2)] hover:-translate-y-1 active:scale-[0.98]",
        comingSoon && "opacity-60 cursor-not-allowed hover:translate-y-0"
      )}
    >
      <CardContent className="p-8">
        <div className="flex flex-col items-start gap-6">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
              "bg-gradient-to-br from-[#8A3CFF]/15 to-[#2E39D9]/10"
            )}
          >
            <Icon className="h-7 w-7 text-[#8A3CFF] drop-shadow-md" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
              {comingSoon && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full border border-border/20">
                  Em breve
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground/70 leading-relaxed min-h-[40px]">
              {description}
            </p>
          </div>

          <div className="w-full pt-4 border-t border-border/10 flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
              {activeCount} {activeCount === 1 ? "Campanha ativa" : "Campanhas ativas"}
            </p>
            <div className={cn(
              "h-2 w-2 rounded-full",
              activeCount > 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted"
            )} />
          </div>
        </div>
      </CardContent>
      
      {/* Decorative background element */}
      <div className={cn(
        "absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150",
        colorClass
      )} />
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
