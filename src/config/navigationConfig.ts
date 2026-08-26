import {
  LayoutDashboard,
  Kanban,
  PhoneCall,
  Users,
  UsersRound,
  MessageSquare,
  GitBranch,
  Grid,
  Layers,
  Search,
  CalendarDays,
  Bell,
  HelpCircle,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const TOP_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { id: "pipelines", title: "Pipelines", url: "/pipelines", icon: Kanban },
  { id: "call-panel", title: "Call Panel", url: "/painel-ligacoes", icon: PhoneCall },
  { id: "leads", title: "Leads", url: "/leads", icon: Users },
  { id: "groups", title: "Groups", url: "/groups", icon: UsersRound },
  { id: "chat", title: "Chat", url: "/chat", icon: MessageSquare },
  { id: "workflows", title: "Workflows", url: "/workflows", icon: GitBranch },
];

export const APP_SUB_ITEMS: NavItem[] = [
  { id: "quiz", title: "Quiz", url: "/quiz", icon: Layers },
  { id: "prospeccao", title: "Prospecção", url: "/prospeccao", icon: Search },
  { id: "agendamentos", title: "Agendamentos", url: "/agendamentos/calendarios", icon: CalendarDays },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: "alerts", title: "Notificações", url: "/alerts", icon: Bell },
  { id: "help", title: "Ajuda", url: "#help", icon: HelpCircle },
  { id: "settings", title: "Configurações", url: "/settings", icon: Settings },
];
