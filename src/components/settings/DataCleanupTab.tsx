import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle, ShieldAlert, Users, UsersRound, MessageSquare, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CleanupType = "leads" | "groups" | "chats" | "all";

export function DataCleanupTab() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleanupTarget, setCleanupTarget] = useState<CleanupType>("all");
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const targetTitles: Record<CleanupType, string> = {
    leads: "Excluir Todos os Leads do CRM",
    groups: "Excluir Todos os Grupos do CRM",
    chats: "Excluir Histórico de Chats e Mensagens",
    all: "Zerar Audiência Completa do CRM (TUDO)",
  };

  const handleOpenConfirm = (target: CleanupType) => {
    setCleanupTarget(target);
    setConfirmInput("");
    setConfirmOpen(true);
  };

  const handleExecuteCleanup = async () => {
    if (confirmInput.trim().toUpperCase() !== "EXCLUIR") {
      toast.error('Digite a palavra "EXCLUIR" em maiúsculo para confirmar.');
      return;
    }

    if (!activeCompanyId) {
      toast.error("Nenhuma organização selecionada.");
      return;
    }

    setIsDeleting(true);
    try {
      if (cleanupTarget === "leads" || cleanupTarget === "all") {
        const { error } = await supabase
          .from("leads")
          .delete()
          .eq("company_id", activeCompanyId);
        if (error) throw error;
      }

      if (cleanupTarget === "groups" || cleanupTarget === "all") {
        await supabase.from("whatsapp_groups" as any).delete().eq("company_id", activeCompanyId);
        await supabase.from("group_campaigns").delete().eq("company_id", activeCompanyId);
        await supabase.from("group_members").delete().eq("user_id", activeCompanyId);
      }

      if (cleanupTarget === "chats" || cleanupTarget === "all") {
        await supabase.from("chat_messages").delete().eq("company_id", activeCompanyId);
        await supabase.from("chat_conversations").delete().eq("company_id", activeCompanyId);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });

      toast.success("Limpeza executada com sucesso! Os dados selecionados foram zerados no CRM.");
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(`Erro ao realizar limpeza: ${err.message || String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Limpeza de Audiência & Dados do CRM
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reinicie a sua base de dados do CRM excluindo Leads, Grupos e Conversas acumuladas.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Alert Note */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Atenção sobre a Limpeza de Dados:</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Esta ação exclui <strong>estritamente os registros armazenados no banco de dados do CRM Qualify</strong>.
          Nenhuma alteração é feita no seu WhatsApp nem nos seus aparelhos. Nenhum contato real ou grupo do WhatsApp será bloqueado ou excluído de verdade nos seus telefones.
        </p>
      </div>

      {/* Cards de Ações Individuais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Limpar Leads */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" /> Leads
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                Tabela `leads`
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground pt-1">
              Apaga todos os leads individuais cadastrados no CRM da sua organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenConfirm("leads")}
              className="w-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200/60"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir Todos os Leads
            </Button>
          </CardContent>
        </Card>

        {/* 2. Limpar Grupos */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-emerald-500" /> Grupos
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                Tabela `whatsapp_groups`
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground pt-1">
              Apaga todos os grupos salvos na lista de grupos do CRM da organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenConfirm("groups")}
              className="w-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200/60"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir Todos os Grupos
            </Button>
          </CardContent>
        </Card>

        {/* 3. Limpar Chats */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" /> Chats & Mensagens
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                Tabela `chat_conversations`
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground pt-1">
              Apaga todo o histórico de conversas e mensagens de chat armazenadas no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenConfirm("chats")}
              className="w-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200/60"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir Histórico de Chats
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Master Action: Limpeza Geral Completa */}
      <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-xl">
        <CardHeader className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-extrabold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Zerar Audiência Completa do CRM (Limpeza Geral)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Exclui simultaneamente todos os Leads, Grupos, Conversas e Mensagens da sua organização no CRM da Qualify para iniciar uma base limpa do zero.
              </CardDescription>
            </div>

            <Button
              variant="destructive"
              onClick={() => handleOpenConfirm("all")}
              className="gap-2 font-bold shrink-0 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
            >
              <Trash2 className="h-4 w-4" /> EXCLUIR TUDO DO CRM
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Safety Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border shadow-2xl p-6 z-[9999]">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-center text-foreground">
              Confirmar Exclusão de Dados
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground leading-relaxed">
              Você está prestes a executar: <strong className="text-red-600 dark:text-red-400">{targetTitles[cleanupTarget]}</strong>.<br />
              Para confirmar esta ação no CRM da sua empresa, digite a palavra <strong className="text-foreground">EXCLUIR</strong> abaixo:
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder="Digite EXCLUIR..."
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="text-center font-bold tracking-widest uppercase text-sm h-11"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteCleanup}
              disabled={confirmInput.trim().toUpperCase() !== "EXCLUIR" || isDeleting}
              className="w-full sm:w-auto font-bold bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
