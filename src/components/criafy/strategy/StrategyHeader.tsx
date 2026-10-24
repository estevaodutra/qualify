import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Instagram,
  Sparkles,
  UploadCloud,
  Edit3,
  Copy,
  Check,
  MoreVertical,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { CriafyInstagramAccount } from "@/types/criafy";
import { CriafyStrategyData } from "@/types/criafyStrategy";
import { ANAMNESE_PROMPT_TEMPLATE } from "@/utils/criafyStrategyDefaults";
import { toast } from "sonner";

interface StrategyHeaderProps {
  account: CriafyInstagramAccount;
  strategy: CriafyStrategyData;
  percentage: number;
  completedAreas: number;
  totalAreas: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onOpenImport: () => void;
}

export function StrategyHeader({
  account,
  strategy,
  percentage,
  completedAreas,
  totalAreas,
  isEditing,
  onToggleEdit,
  onOpenImport,
}: StrategyHeaderProps) {
  const navigate = useNavigate();
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(ANAMNESE_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    toast.success("Prompt oficial de Anamnese copiado para a área de transferência!", {
      description: "Cole em um novo chat do ChatGPT para entrevistar o cliente ou especialista.",
    });
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(strategy, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `estrategia_${account.username}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Arquivo JSON da estratégia exportado com sucesso!");
  };

  return (
    <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lado Esquerdo: Breadcrumb Voltar + Avatar + Identidade */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/criafy")}
            className="h-9 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-xl"
            title="Voltar para a listagem de contas"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Contas</span>
          </Button>

          <div className="h-6 w-px bg-border/80 hidden sm:block shrink-0" />

          {/* Avatar com selo do Instagram */}
          <div className="relative shrink-0">
            <Avatar className="w-11 h-11 border-2 border-border shadow-xs">
              <AvatarImage src={account.profile_picture_url || undefined} alt={account.username} />
              <AvatarFallback className="bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-xs">
                @{account.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white ring-2 ring-card"
              title="Instagram Conectado"
            >
              <Instagram className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Textos de Cabeçalho */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-base leading-tight truncate">@{account.username}</h1>
              <a
                href={`https://instagram.com/${account.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-pink-500 transition-colors"
                title="Abrir no Instagram"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0">
                Estratégia
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate font-medium mt-0.5 max-w-xl">
              Central estratégica da conta e memória de longo prazo para IA
            </p>
          </div>
        </div>

        {/* Lado Direito: Status de preenchimento + Ações principais */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          {/* Badge de Completude */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-background/80 shadow-xs text-xs font-medium cursor-help"
            title={`${completedAreas} de ${totalAreas} áreas essenciais preenchidas`}
          >
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="font-bold text-foreground">{percentage}%</span>
            <span className="text-muted-foreground text-[11px] hidden sm:inline">completa</span>
          </div>

          {/* Botão Copiar Prompt da Anamnese */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPrompt}
            className="h-9 text-xs gap-1.5 rounded-xl border-border/80 hover:bg-muted text-foreground"
            title="Copiar prompt completo para entrevistar cliente/especialista no ChatGPT"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
            <span className="hidden md:inline">{copiedPrompt ? "Prompt Copiado!" : "Copiar Prompt Anamnese"}</span>
            <span className="inline md:hidden">Prompt</span>
          </Button>

          {/* Botão Importar Anamnese */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-muted text-foreground"
            title="Importar anamnese colando texto em Markdown"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            <span>Importar Anamnese</span>
          </Button>

          {/* Botão Alternar Edição */}
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={onToggleEdit}
            className={`h-9 text-xs font-semibold gap-1.5 rounded-xl transition-all ${
              isEditing
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-sm"
                : "border-border/80 hover:bg-muted text-foreground"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? "Concluir Edição" : "Editar Estratégia"}</span>
          </Button>

          {/* Menu de Opções Adicionais */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem onClick={handleExportJson} className="gap-2 cursor-pointer">
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                Exportar Estratégia (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyPrompt} className="gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5 text-amber-500" />
                Copiar Prompt da Anamnese
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href={`https://instagram.com/${account.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2 cursor-pointer flex items-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  Abrir no Instagram
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
