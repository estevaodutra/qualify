import {
  Rocket, Plug, Webhook, UserPlus, Kanban,
  Search, Radar, MessageCircle, Hash,
  CalendarClock, ClipboardCheck, CalendarPlus, Zap,
  Users, LogOut,
} from "lucide-react";
import type { TriggerDefinition } from "./types";
import { ScheduledTriggerConfig } from "./configs/ScheduledTriggerConfig";
import { ApiTriggerConfig } from "./configs/ApiTriggerConfig";

const weekdayLabel = (days: any): string => {
  if (!Array.isArray(days) || days.length === 0) return "nenhum dia";
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const validDays = days.filter((d) => typeof d === "number" && d >= 0 && d <= 6);
  if (validDays.length === 5 && [1, 2, 3, 4, 5].every((d) => validDays.includes(d))) return "Segunda a sexta";
  return validDays.map((d) => labels[d] || `Dia ${d}`).join(", ");
};

export const TRIGGER_DEFINITIONS: Record<string, TriggerDefinition> = {
  manual: {
    type: "manual",
    label: "Manual",
    description: "A automação é disparada manualmente pelo administrador.",
    category: "entrada",
    icon: Rocket,
    color: "bg-slate-500",
    status: "available",
    supportedBy: ["dispatch_sequence", "group_sequence"],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Execução manual" }),
    validate: () => [],
  },
  api: {
    type: "api",
    label: "API",
    description: "Dispara via chamada HTTP a um endpoint dedicado.",
    category: "entrada",
    icon: Plug,
    color: "bg-blue-500",
    status: "coming_soon", // trigger-sequence só suporta message_sequences hoje; 404 confirmado para dispatch
    supportedBy: ["dispatch_sequence"],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Via API", subtitle: "Em breve para campanhas de disparo" }),
    validate: () => [],
    configComponent: ApiTriggerConfig,
  },
  webhook: {
    type: "webhook",
    label: "Webhook",
    description: "Dispara via chamada HTTP a um endpoint dedicado.",
    category: "entrada",
    icon: Webhook,
    color: "bg-blue-500",
    status: "available", // trigger-sequence -> execute-message funciona ponta a ponta
    supportedBy: ["group_sequence"],
    defaultConfig: {},
    summaryBuilder: (config) => ({
      title: "Via API",
      subtitle: config.sequenceId ? `POST /trigger-sequence/${config.sequenceId}` : undefined,
    }),
    validate: () => [],
    configComponent: ApiTriggerConfig,
  },
  scheduled: {
    type: "scheduled",
    label: "Agendado",
    description: "Dispara em um horário/data configurado.",
    category: "tempo",
    icon: CalendarClock,
    color: "bg-orange-500",
    status: "available",
    supportedBy: ["dispatch_sequence", "group_sequence"],
    defaultConfig: { scheduledDate: "", scheduledTime: "" },
    summaryBuilder: (config) => {
      if (config && (Array.isArray(config.allowedDays) || Array.isArray(config.times))) {
        return {
          title: weekdayLabel(config.allowedDays),
          subtitle: `${Array.isArray(config.times) && config.times.length > 0 ? config.times[0] : "--:--"} — America/Sao_Paulo`,
        };
      }
      const date = config.scheduledDate as string | undefined;
      const time = config.scheduledTime as string | undefined;
      return { title: "Agendado", subtitle: date && time ? `${date} às ${time}` : "Data/hora não configurada" };
    },
    validate: (config) => {
      const errors: string[] = [];
      if (!config.scheduledDate && !config.allowedDays) errors.push("Configure a data/hora do agendamento.");
      return errors;
    },
    configComponent: ScheduledTriggerConfig,
  },
  member_join: {
    type: "member_join",
    label: "Membro entrar",
    description: "Inicia quando um novo membro entra no grupo.",
    category: "leads_crm",
    icon: Users,
    color: "bg-green-500",
    status: "coming_soon", // sem pipeline de ingestão de eventos de membership do WhatsApp hoje
    supportedBy: ["group_sequence"],
    defaultConfig: { sendPrivate: false },
    summaryBuilder: () => ({ title: "Membro entrar no grupo", subtitle: "Em breve" }),
    validate: () => [],
  },
  member_leave: {
    type: "member_leave",
    label: "Membro sair",
    description: "Inicia quando um membro sai do grupo.",
    category: "leads_crm",
    icon: LogOut,
    color: "bg-red-500",
    status: "coming_soon", // mesmo motivo do member_join
    supportedBy: ["group_sequence"],
    defaultConfig: { sendPrivate: false },
    summaryBuilder: () => ({ title: "Membro sair do grupo", subtitle: "Em breve" }),
    validate: () => [],
  },
  on_add: {
    type: "on_add",
    label: "Lead adicionado",
    description: "Inicia quando um novo contato é adicionado à campanha.",
    category: "leads_crm",
    icon: UserPlus,
    color: "bg-green-500",
    status: "coming_soon", // stub de UI, useDispatchContacts nunca checa trigger_type
    supportedBy: ["dispatch_sequence"],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Lead adicionado", subtitle: "Em breve" }),
    validate: () => [],
  },
  action: {
    type: "action",
    label: "Outra automação",
    description: "Inicia quando uma ação específica do sistema é executada.",
    category: "sistema",
    icon: Zap,
    color: "bg-purple-500",
    status: "coming_soon", // sem referência de backend
    supportedBy: ["dispatch_sequence"],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Outra automação", subtitle: "Em breve" }),
    validate: () => [],
  },
  pipeline_changed: {
    type: "pipeline_changed",
    label: "Mudança no pipeline",
    description: "Inicia quando o lead muda de etapa no pipeline.",
    category: "leads_crm",
    icon: Kanban,
    color: "bg-cyan-600",
    status: "coming_soon",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Mudança no pipeline", subtitle: "Em breve" }),
    validate: () => [],
  },
  prospecting_lead: {
    type: "prospecting_lead",
    label: "Lead encontrado",
    description: "Inicia quando a Prospecção encontra um novo lead.",
    category: "prospeccao",
    icon: Search,
    color: "bg-violet-600",
    status: "coming_soon", // prospecção integra por FK direta, não por trigger_type
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Lead encontrado na prospecção", subtitle: "Em breve" }),
    validate: () => [],
  },
  prospecting_completed: {
    type: "prospecting_completed",
    label: "Prospecção concluída",
    description: "Inicia quando uma prospecção é concluída.",
    category: "prospeccao",
    icon: Radar,
    color: "bg-violet-700",
    status: "coming_soon",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Prospecção concluída", subtitle: "Em breve" }),
    validate: () => [],
  },
  message_received: {
    type: "message_received",
    label: "Mensagem recebida",
    description: "Inicia quando o lead envia uma mensagem.",
    category: "mensagens",
    icon: MessageCircle,
    color: "bg-emerald-600",
    status: "coming_soon",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Mensagem recebida", subtitle: "Em breve" }),
    validate: () => [],
  },
  keyword: {
    type: "keyword",
    label: "Palavra-chave recebida",
    description: "Inicia quando uma palavra-chave específica é recebida.",
    category: "mensagens",
    icon: Hash,
    color: "bg-emerald-700",
    status: "coming_soon", // sem consumidor real para message_sequences (a única lógica de "keyword" existente é de context_campaigns, uma tabela diferente)
    supportedBy: ["group_sequence"],
    defaultConfig: { keyword: "" },
    summaryBuilder: (config) => ({
      title: "Palavra-chave recebida",
      subtitle: (config.keyword as string) || "Em breve",
    }),
    validate: () => [],
  },
  quiz_completed: {
    type: "quiz_completed",
    label: "Quiz concluído",
    description: "Inicia quando o lead conclui um quiz.",
    category: "sistema",
    icon: ClipboardCheck,
    color: "bg-fuchsia-600",
    status: "coming_soon",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Quiz concluído", subtitle: "Em breve" }),
    validate: () => [],
  },
  appointment_created: {
    type: "appointment_created",
    label: "Agendamento criado",
    description: "Inicia quando um novo agendamento é criado.",
    category: "sistema",
    icon: CalendarPlus,
    color: "bg-rose-600",
    status: "coming_soon",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Agendamento criado", subtitle: "Em breve" }),
    validate: () => [],
  },
};

export function getTriggerDefinitionsForEngine(engine: "dispatch_sequence" | "group_sequence") {
  return Object.values(TRIGGER_DEFINITIONS).filter((def) => def.supportedBy.includes(engine));
}

export function getTriggerDefinition(type: string): TriggerDefinition | undefined {
  return TRIGGER_DEFINITIONS[type];
}
