import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Eye, HelpCircle, Phone, Sparkles, XCircle, ArrowRightLeft, MousePointerClick, Hourglass } from "lucide-react";

interface TimelineEvent {
  id: string;
  eventName: string;
  stepId: string | null;
  stepName: string | null;
  componentId: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

interface Props {
  timeline: TimelineEvent[];
  firstSeenAt: string;
}

export function QuizLeadTimeline({ timeline, firstSeenAt }: Props) {
  const getEventMeta = (eventName: string) => {
    switch (eventName) {
      case "quiz_viewed":
        return {
          label: "Abriu o quiz",
          icon: <Eye className="h-3 w-3 text-slate-500" />,
          bgColor: "bg-slate-100 border-slate-200"
        };
      case "quiz_started":
        return {
          label: "Iniciou o funil",
          icon: <Sparkles className="h-3 w-3 text-blue-500" />,
          bgColor: "bg-blue-50 border-blue-200"
        };
      case "step_viewed":
        return {
          label: "Visualizou Etapa",
          icon: <Eye className="h-3 w-3 text-indigo-500" />,
          bgColor: "bg-indigo-50 border-indigo-200"
        };
      case "step_completed":
        return {
          label: "Concluiu Etapa",
          icon: <CheckCircle2 className="h-3 w-3 text-indigo-600" />,
          bgColor: "bg-indigo-100 border-indigo-300"
        };
      case "option_selected":
        return {
          label: "Selecionou Opção",
          icon: <MousePointerClick className="h-3 w-3 text-purple-500" />,
          bgColor: "bg-purple-50 border-purple-200"
        };
      case "field_completed":
        return {
          label: "Preencheu Campo",
          icon: <HelpCircle className="h-3 w-3 text-slate-500" />,
          bgColor: "bg-slate-50 border-slate-200"
        };
      case "lead_identified":
        return {
          label: "Lead identificado",
          icon: <Phone className="h-3 w-3 text-emerald-500" />,
          bgColor: "bg-emerald-50 border-emerald-200"
        };
      case "quiz_completed":
        return {
          label: "Concluiu o quiz",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
          bgColor: "bg-emerald-100 border-emerald-300"
        };
      case "quiz_resumed":
        return {
          label: "Retornou ao quiz",
          icon: <ArrowRightLeft className="h-3 w-3 text-amber-500" />,
          bgColor: "bg-amber-50 border-amber-200"
        };
      case "quiz_abandoned":
        return {
          label: "Abandonou",
          icon: <Hourglass className="h-3.5 w-3.5 text-rose-500" />,
          bgColor: "bg-rose-50 border-rose-200"
        };
      case "quiz_disqualified":
        return {
          label: "Encerrado por Regra",
          icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
          bgColor: "bg-red-50 border-red-200"
        };
      default:
        return {
          label: eventName,
          icon: <HelpCircle className="h-3 w-3 text-slate-400" />,
          bgColor: "bg-slate-100 border-slate-200"
        };
    }
  };

  const formatEventTime = (dateStr: string) => {
    return format(new Date(dateStr), "HH:mm:ss", { locale: ptBR });
  };

  return (
    <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-5 py-1">
      {timeline.map((evt) => {
        const meta = getEventMeta(evt.eventName);
        const details = [];

        if (evt.eventName === "step_viewed" && evt.stepName) {
          details.push(`Etapa: ${evt.stepName}`);
        }
        if (evt.eventName === "step_completed" && evt.stepName) {
          details.push(`Etapa: ${evt.stepName}`);
        }
        if (evt.eventName === "option_selected" && evt.payload.selectedOptions) {
          details.push(`Opções: ${evt.payload.selectedOptions.join(", ")}`);
        }
        if (evt.eventName === "lead_identified") {
          const { name, phone } = evt.payload;
          if (name) details.push(`Nome: ${name}`);
          if (phone) details.push(`WhatsApp: ${phone}`);
        }

        return (
          <div key={evt.id} className="relative flex flex-col space-y-1">
            {/* Left Dot Icon */}
            <div className={`absolute -left-[35px] top-0 h-6 w-6 rounded-full border flex items-center justify-center bg-white ${meta.bgColor} shadow-sm shrink-0`}>
              {meta.icon}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">{meta.label}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatEventTime(evt.createdAt)}
              </span>
            </div>

            {details.length > 0 && (
              <div className="text-[11px] text-slate-500 font-medium">
                {details.join(" | ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
