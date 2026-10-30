import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LucideIcon, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface SubSidebarItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  description?: string;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  end?: boolean;
}

interface AdminSubSidebarProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  icon?: LucideIcon;
  items: SubSidebarItem[];
  headerActions?: ReactNode;
  footer?: ReactNode;
}

export function AdminSubSidebar({
  title,
  subtitle,
  badge,
  icon: HeaderIcon,
  items,
  headerActions,
  footer,
}: AdminSubSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Item ativo no seletor mobile
  const activeItem = items.find((item) => (item.end ? pathname === item.url : pathname.startsWith(item.url))) || items[0];

  return (
    <>
      {/* Mobile Selector */}
      <div className="md:hidden border-b bg-card p-3 sticky top-14 z-30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <Select
            value={activeItem?.url}
            onValueChange={(val) => navigate(val)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Selecione a seção..." />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.url} value={item.url}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {headerActions}
      </div>

      {/* Desktop Subsidebar Contextual com Header, Body (Scroll) e Footer Fixos */}
      <aside className="hidden md:flex w-64 border-r bg-muted/20 flex-col shrink-0 h-full overflow-hidden select-none">
        {/* Header da Subsidebar */}
        <div className="p-4 border-b shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {HeaderIcon && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <HeaderIcon className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm tracking-tight text-foreground truncate max-w-[130px]">
                    {title}
                  </span>
                  {badge}
                </div>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            {headerActions}
          </div>
        </div>

        {/* Body da Subsidebar (Scroll isolado) */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0 overscroll-contain">
          {items.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon && (
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    )}
                    <div className="text-left min-w-0">
                      <div className="leading-tight truncate">{item.title}</div>
                      {item.description && (
                        <div
                          className={`text-[11px] font-normal mt-0.5 truncate ${
                            isActive
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <Badge
                      variant={item.badgeVariant || (isActive ? "secondary" : "outline")}
                      className={`text-[10px] shrink-0 ml-1.5 ${
                        isActive ? "bg-white/20 text-white border-transparent" : ""
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer da Subsidebar */}
        {footer && <div className="border-t p-3 shrink-0">{footer}</div>}
      </aside>
    </>
  );
}
