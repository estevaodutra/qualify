import React from "react";
import { cn } from "@/lib/utils";

/**
 * Ícone oficial da Criafy para sidebars e menus compactos
 * Fonte: brand/criafy-sidebar-icon.ico (com fallback para .png)
 */
export function CriafySidebarIcon({ className }: { className?: string }) {
  return (
    <img
      src="/criafy-sidebar-icon.ico"
      alt="Criafy"
      className={cn("h-4 w-4 object-contain shrink-0 rounded-xs", className)}
      onError={(e) => {
        e.currentTarget.src = "/criafy-sidebar-icon.png";
      }}
    />
  );
}

/**
 * Logo oficial da Criafy em alta definição
 * Fonte: brand/criafy_icon.png
 */
export function CriafyLogo({
  className,
  alt = "Criafy",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/criafy_icon.png"
      alt={alt}
      className={cn("object-contain shrink-0 select-none", className)}
    />
  );
}
