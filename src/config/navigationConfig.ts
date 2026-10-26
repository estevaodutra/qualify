import React from "react";
import {
  Home,
  Phone,
  Users,
  UserSearch,
  MessageSquare,
  Share2,
  Box,
  Zap,
  Calendar,
  Image as ImageIcon,
  SquareDot,
  Target,
  Bell,
  HelpCircle,
  Settings,
  LucideIcon,
} from "lucide-react";

export function PipelinesIcon(props: React.SVGProps<SVGSVGElement>) {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    React.createElement("line", { x1: 5, y1: 5, x2: 5, y2: 19 }),
    React.createElement("line", { x1: 19, y1: 5, x2: 19, y2: 19 }),
    React.createElement("line", { x1: 12, y1: 8, x2: 12, y2: 16 }),
    React.createElement("line", { x1: 8, y1: 12, x2: 16, y2: 12 })
  );
}

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export const TOP_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/", icon: Home, exact: true },
  { id: "pipelines", title: "Pipelines", url: "/pipelines", icon: PipelinesIcon },
  { id: "call-panel", title: "Call Panel", url: "/painel-ligacoes", icon: Phone },
  { id: "leads", title: "Leads", url: "/leads", icon: Users },
  { id: "groups", title: "Groups", url: "/groups", icon: UserSearch },
  { id: "chat", title: "Chat", url: "/chat", icon: MessageSquare },
  { id: "workflows", title: "Workflows", url: "/workflows", icon: Share2 },
];

export const APP_SUB_ITEMS: NavItem[] = [
  { id: "sprint", title: "Sprint", url: "/sprint", icon: Zap },
  { id: "cronogramas", title: "Cronogramas", url: "/sprint-os", icon: Calendar },
  { id: "criafy", title: "Criafy", url: "/criafy", icon: ImageIcon },
  { id: "quiz", title: "Quiz", url: "/quiz", icon: SquareDot },
  { id: "prospeccao", title: "Prospecção", url: "/prospeccao", icon: Target },
  { id: "agendamentos", title: "Agendamentos", url: "/agendamentos/calendarios", icon: Calendar },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: "alerts", title: "Notificações", url: "/alerts", icon: Bell },
  { id: "help", title: "Ajuda", url: "#help", icon: HelpCircle },
  { id: "settings", title: "Configurações", url: "/settings", icon: Settings },
];
