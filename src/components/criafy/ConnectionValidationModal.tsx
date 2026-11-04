import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Instagram,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Facebook,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { CriafyInstagramAccount } from "@/types/criafy";
import { criafyService } from "@/services/criafy/criafyService";
import { toast } from "sonner";

interface ConnectionValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  account: CriafyInstagramAccount | null;
  error: string | null;
  onRetry?: () => void;
  onSuccessClose?: () => void;
}

export function ConnectionValidationModal({
  open,
  onOpenChange,
  loading,
  account,
  error,
  onRetry,
  onSuccessClose,
}: ConnectionValidationModalProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    status: string;
    error?: string;
  } | null>(null);

  const handleTestToken = async () => {
    if (!account?.id) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await criafyService.checkTokenHealth(account.id);
      setTestResult(res);
      if (res.valid) {
        toast.success("Token de acesso validado com sucesso na Meta Graph API!");
      } else {
        toast.error(`Falha na validação do token: ${res.error || res.status}`);
      }
    } catch (err: any) {
      setTestResult({
        valid: false,
        status: "ERROR",
        error: err.message || "Erro ao consultar Meta Graph API",
      });
      toast.error(`Erro ao validar token: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleFinish = () => {
    onOpenChange(false);
    if (onSuccessClose) onSuccessClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
        {/* Header Decorativo */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

          {loading ? (
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : account ? (
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-emerald-300 drop-shadow" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <XCircle className="w-9 h-9 text-rose-300 drop-shadow" />
            </div>
          )}

          <DialogTitle className="text-xl font-bold text-white tracking-tight">
            {loading
              ? "Processando Conexão com a Meta..."
              : account
              ? "Instagram Conectado com Sucesso!"
              : "Falha na Conexão com o Instagram"}
          </DialogTitle>
          <DialogDescription className="text-white/85 text-xs mt-1">
            {loading
              ? "Aguarde enquanto registramos os tokens de acesso e ativos homologados."
              : account
              ? "Sua conta oficial da Meta foi validada e vinculada à sua empresa."
              : "Não foi possível concluir o registro da conta na Meta Graph API."}
          </DialogDescription>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5">
          {/* Cenário 1: Loading */}
          {loading && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Trocando código de autorização e registrando conta profissional...
              </p>
              <p className="text-xs text-slate-400">
                Isso pode levar de 3 a 5 segundos para estender o token para 60 dias.
              </p>
            </div>
          )}

          {/* Cenário 2: Erro */}
          {!loading && error && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Detalhes do Retorno da Meta:
                </div>
                <p className="text-xs leading-relaxed font-mono bg-white/60 dark:bg-black/30 p-2.5 rounded-lg border border-rose-200/60 break-words">
                  {error}
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                  >
                    Tentar Conectar Novamente
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Cenário 3: Sucesso com Conta Vinculada */}
          {!loading && account && (
            <div className="space-y-5">
              {/* Card da Conta Identificada */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-pink-500 shadow-sm shrink-0">
                  <AvatarImage src={account.profile_picture_url || ""} />
                  <AvatarFallback className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white font-bold text-lg">
                    {account.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white truncate">
                      @{account.username}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {account.name || "Conta Profissional do Instagram"}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                      ID: {account.instagram_account_id}
                    </span>
                    {account.metadata?.page_name && (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
                        <Facebook className="w-3 h-3 text-blue-600" />
                        {account.metadata.page_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Box de Validação de Token em Tempo Real */}
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Validação em Tempo Real na Meta API
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestToken}
                    disabled={testing}
                    className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300"
                  >
                    {testing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    {testing ? "Validando..." : "Testar Token Agora"}
                  </Button>
                </div>

                {testResult ? (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      testResult.valid
                        ? "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-rose-100/70 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                    }`}
                  >
                    {testResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {testResult.valid
                          ? "Token Válido e Operacional na Meta Graph API!"
                          : "Problema identificado no Token da Meta"}
                      </p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        {testResult.valid
                          ? "Permissões de leitura de métricas, agendamento de posts e publicação de reels confirmadas."
                          : testResult.error || `Status retornado: ${testResult.status}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed">
                    ✓ Token estendido de longa duração gerado e homologado para os próximos 60 dias.
                  </p>
                )}
              </div>

              {/* Botões Finais de Ação */}
              <div className="flex gap-2 pt-2 justify-end">
                <Button
                  onClick={handleFinish}
                  className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium shadow-md shadow-purple-500/20 gap-2 h-11"
                >
                  <Sparkles className="w-4 h-4" />
                  Concluir e Acessar Minhas Demandas & Planner
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
