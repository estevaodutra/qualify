import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CriafySubsidebarItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  badge?: string;
  badgeColor?: string;
  description?: string;
}

export interface CriafySubsidebarGroup {
  title?: string;
  items: CriafySubsidebarItem[];
}

interface CriafySubsidebarProps {
  groups: CriafySubsidebarGroup[];
  activeId: string;
  onChange: (id: string) => void;
  title?: string;
  className?: string;
  extraHeaderAction?: React.ReactNode;
  extraFooter?: React.ReactNode;
}

export const CriafySubsidebar: React.FC<CriafySubsidebarProps> = ({
  groups,
  activeId,
  onChange,
  title,
  className,
  extraHeaderAction,
  extraFooter,
}) => {
  const allItems = groups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.id === activeId) || allItems[0];
  const ActiveIcon = activeItem?.icon;

  return (
    <>
      {/* ========================================================
          VERSÃO MOBILE (< lg): SELETOR CONTEXTUAL SUSPENSO / PILL
         ======================================================== */}
      <div className="lg:hidden w-full mb-3 flex items-center justify-between gap-2 p-1.5 bg-muted/60 border border-border/80 rounded-2xl">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-between text-xs font-semibold h-9 px-3 rounded-xl bg-background border border-border/60 shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                {ActiveIcon && <ActiveIcon className="w-4 h-4 text-primary shrink-0" />}
                <span className="truncate">{activeItem?.label || "Selecione uma opção"}</span>
                {activeItem?.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                    {activeItem.count}
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-2 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-2xl shadow-xl border-border bg-card">
            {groups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-0.5">
                {group.title && (
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </div>
                )}
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = item.id === activeId;
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => onChange(item.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer font-medium",
                        isItemActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {ItemIcon && <ItemIcon className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.count !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold text-muted-foreground">
                          {item.count}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {extraHeaderAction}
      </div>

      {/* ========================================================
          VERSÃO DESKTOP (>= lg): COLUNA LATERAL DISCRETA (SUBSIDEBAR)
         ======================================================== */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-52 xl:w-56 shrink-0 rounded-2xl bg-card/60 dark:bg-card/40 border border-border/70 p-2.5 space-y-4 shadow-2xs self-start sticky top-2",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {title}
            </span>
            {extraHeaderAction}
          </div>
        )}

        <div className="space-y-4 flex-1">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.title && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 pb-0.5">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChange(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer",
                        isItemActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {ItemIcon && (
                          <ItemIcon
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              isItemActive ? "text-primary-foreground" : "text-muted-foreground"
                            )}
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.count !== undefined && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0",
                            isItemActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.count}
                        </span>
                      )}

                      {item.badge && (
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full shrink-0",
                            item.badgeColor || (isItemActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary")
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {extraFooter && <div className="pt-2 border-t border-border/60">{extraFooter}</div>}
      </aside>
    </>
  );
};
