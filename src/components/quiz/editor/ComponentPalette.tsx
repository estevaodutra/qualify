import { Type, Image, MousePointer, ListChecks, User, Mail, Phone } from "lucide-react";
import { QuizComponentType } from "@/hooks/useQuizComponents";
import { cn } from "@/lib/utils";

interface ComponentDef {
  type: QuizComponentType;
  label: string;
  icon: React.ReactNode;
  category: "formulario" | "quiz" | "conteudo";
}

const components: ComponentDef[] = [
  { type: "field_name", label: "Nome", icon: <User className="w-4 h-4" />, category: "formulario" },
  { type: "field_email", label: "E-mail", icon: <Mail className="w-4 h-4" />, category: "formulario" },
  { type: "field_phone", label: "Telefone", icon: <Phone className="w-4 h-4" />, category: "formulario" },
  { type: "options", label: "Quiz / Opções", icon: <ListChecks className="w-4 h-4" />, category: "quiz" },
  { type: "text", label: "Texto", icon: <Type className="w-4 h-4" />, category: "conteudo" },
  { type: "image", label: "Imagem", icon: <Image className="w-4 h-4" />, category: "conteudo" },
  { type: "button", label: "Botão", icon: <MousePointer className="w-4 h-4" />, category: "conteudo" },
];

const categoryLabel: Record<ComponentDef["category"], string> = {
  formulario: "Formulário",
  quiz: "Quiz",
  conteudo: "Conteúdo",
};

interface Props {
  onAdd: (type: QuizComponentType) => void;
  disabled?: boolean;
}

export function ComponentPalette({ onAdd, disabled }: Props) {
  const categories = ["formulario", "quiz", "conteudo"] as ComponentDef["category"][];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Componentes</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map((cat) => {
          const items = components.filter((c) => c.category === cat);
          return (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                {categoryLabel[cat]}
              </p>
              <div className="space-y-0.5">
                {items.map((comp) => (
                  <button
                    key={comp.type}
                    disabled={disabled}
                    onClick={() => onAdd(comp.type)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left",
                      "hover:bg-muted transition-colors",
                      disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="text-muted-foreground">{comp.icon}</span>
                    {comp.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
