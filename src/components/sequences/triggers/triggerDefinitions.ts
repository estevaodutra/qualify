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
    label: "Execução manual da automação por lead ou contato",
    description: "Permite iniciar a automação com comando rápido de '/' no chat e disparar manualmente em um lead específico ou conjunto de leads.",
    category: "leads",
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
    category: "http",
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
    category: "http",
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
    category: "sistema",
    icon: CalendarClock,
    color: "bg-orange-500",
    status: "available",
    supportedBy: ["dispatch_sequence", "group_sequence"],
    defaultConfig: { scheduleType: "schedule_once" },
    summaryBuilder: (config) => {
      const type = config.scheduleType as string;
      const times = (config.times as string[]) || [];
      const firstTime = times[0] || "--:--";

      if (type === "schedule_daily") return { title: "Todo dia", subtitle: `às ${firstTime}` };
      if (type === "schedule_week_days") {
        const days = (config.daysOfWeek as string[]) || [];
        const ptDays: Record<string, string> = { monday: "Seg", tuesday: "Ter", wednesday: "Qua", thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom" };
        const dayNames = days.map(d => ptDays[d]).filter(Boolean);
        return { title: days.length > 0 ? dayNames.join(", ") : "Dias não definidos", subtitle: `às ${firstTime}` };
      }
      if (type === "schedule_month_days") {
        const days = (config.daysOfMonth as number[]) || [];
        return { title: days.length > 0 ? `Dias ${days.slice(0,3).join(", ")}${days.length>3?"...":""} do mês` : "Dias não definidos", subtitle: `às ${firstTime}` };
      }
      if (type === "schedule_interval") {
        const i = config.interval;
        const u = config.unit === "minutes" ? "min" : config.unit === "hours" ? "hora(s)" : config.unit === "days" ? "dia(s)" : "semana(s)";
        return { title: `A cada ${i || "?"} ${u}`, subtitle: config.startAt ? `A partir de ${String(config.startAt).replace("T"," ")}` : "Recorrente" };
      }
      
      const date = config.scheduledDate as string | undefined;
      const time = config.scheduledTime as string | undefined;
      return { title: "Data específica", subtitle: date && time ? `${date} às ${time}` : "Não configurada" };
    },
    validate: (config) => {
      const errors: string[] = [];
      const type = config.scheduleType as string;
      if (!type || type === "schedule_once") {
        if (!config.scheduledDate) errors.push("Configure a data do agendamento.");
        if (!config.scheduledTime) errors.push("Configure a hora do agendamento.");
      } else if (type === "schedule_interval") {
        if (!config.interval || (config.interval as number) < 1) errors.push("O intervalo precisa ser maior que zero.");
      } else {
        const times = config.times as string[];
        if (!times || times.length === 0) errors.push("Configure ao menos um horário.");
        if (type === "schedule_week_days" && !(config.daysOfWeek as string[])?.length) errors.push("Selecione ao menos um dia da semana.");
        if (type === "schedule_month_days" && !(config.daysOfMonth as number[])?.length) errors.push("Informe os dias do mês.");
      }
      return errors;
    },
    configComponent: ScheduledTriggerConfig,
  },
  member_join: {
    type: "member_join",
    label: "Membro entrar",
    description: "Inicia quando um novo membro entra no grupo.",
    category: "leads",
    icon: Users,
    color: "bg-green-500",
    status: "available",
    supportedBy: ["group_sequence"],
    defaultConfig: { sendPrivate: false },
    summaryBuilder: () => ({ title: "Membro entrar no grupo" }),
    validate: () => [],
  },
  member_leave: {
    type: "member_leave",
    label: "Membro sair",
    description: "Inicia quando um membro sai do grupo.",
    category: "leads",
    icon: LogOut,
    color: "bg-red-500",
    status: "available",
    supportedBy: ["group_sequence"],
    defaultConfig: { sendPrivate: false },
    summaryBuilder: () => ({ title: "Membro sair do grupo" }),
    validate: () => [],
  },
  on_add: {
    type: "on_add",
    label: "Lead adicionado",
    description: "Inicia quando um novo contato é adicionado à campanha.",
    category: "leads",
    icon: UserPlus,
    color: "bg-green-500",
    status: "available",
    supportedBy: ["dispatch_sequence"],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Lead adicionado" }),
    validate: () => [],
  },
  action: {
    type: "action",
    label: "Outra automação",
    description: "Inicia quando uma ação específica do sistema é executada.",
    category: "sistema",
    icon: Zap,
    color: "bg-purple-500",
    status: "available",
    supportedBy: ["dispatch_sequence"],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Outra automação" }),
    validate: () => [],
  },
  pipeline_changed: {
    type: "pipeline_changed",
    label: "Mudança no pipeline",
    description: "Inicia quando o lead muda de etapa no pipeline.",
    category: "negocios",
    icon: Kanban,
    color: "bg-cyan-600",
    status: "available",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Mudança no pipeline" }),
    validate: () => [],
  },
  prospecting_lead: {
    type: "prospecting_lead",
    label: "Lead encontrado",
    description: "Inicia quando a Prospecção encontra um novo lead.",
    category: "leads",
    icon: Search,
    color: "bg-violet-600",
    status: "available",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Lead encontrado na prospecção" }),
    validate: () => [],
  },
  prospecting_completed: {
    type: "prospecting_completed",
    label: "Prospecção concluída",
    description: "Inicia quando uma prospecção é concluída.",
    category: "leads",
    icon: Radar,
    color: "bg-violet-700",
    status: "available",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Prospecção concluída" }),
    validate: () => [],
  },
  message_received: {
    type: "message_received",
    label: "Mensagem recebida",
    description: "Inicia quando o lead envia uma mensagem.",
    category: "mensagens",
    icon: MessageCircle,
    color: "bg-emerald-600",
    status: "available",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Mensagem recebida" }),
    validate: () => [],
  },
  keyword: {
    type: "keyword",
    label: "Palavra-chave recebida",
    description: "Inicia quando uma palavra-chave específica é recebida.",
    category: "mensagens",
    icon: Hash,
    color: "bg-emerald-700",
    status: "available",
    supportedBy: ["group_sequence"],
    defaultConfig: { keyword: "" },
    summaryBuilder: (config) => ({
      title: "Palavra-chave recebida",
      subtitle: (config.keyword as string) || "Gatilho de Palavra-chave",
    }),
    validate: () => [],
  },
  quiz_completed: {
    type: "quiz_completed",
    label: "Quiz concluído",
    description: "Inicia quando o lead conclui um quiz.",
    category: "atividades",
    icon: ClipboardCheck,
    color: "bg-fuchsia-600",
    status: "available",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Quiz concluído" }),
    validate: () => [],
  },
  appointment_created: {
    type: "appointment_created",
    label: "Agendamento criado",
    description: "Inicia quando um novo agendamento é criado.",
    category: "atividades",
    icon: CalendarPlus,
    color: "bg-rose-600",
    status: "available",
    supportedBy: [],
    defaultConfig: {},
    summaryBuilder: () => ({ title: "Agendamento criado" }),
    validate: () => [],
  },
};

export function getTriggerDefinitionsForEngine(engine: "dispatch_sequence" | "group_sequence") {
  return Object.values(TRIGGER_DEFINITIONS);
}

export function getTriggerDefinition(type: string): TriggerDefinition | undefined {
  return TRIGGER_DEFINITIONS[type];
}
