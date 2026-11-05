import React, { useState } from "react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Grid,
  ChevronUp,
  ChevronDown,
  Settings,
  AlertCircle,
  Volume2,
  Loader2,
  X,
} from "lucide-react";
import { useWebphone } from "@/contexts/WebphoneContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export const WebphoneDock: React.FC = () => {
  const {
    status,
    isOnline,
    isMuted,
    duration,
    activeCall,
    errorMessage,
    operator,
    hasSipConfig,
    isPrimaryTab,
    toggleOnline,
    dial,
    hangup,
    toggleMute,
    sendDTMF,
    syncOperator,
    claimPrimaryTab,
  } = useWebphone();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [manualPhone, setManualPhone] = useState<string>("");

  const isCallActive = status === "dialing" || status === "ringing" || status === "in_call";

  const handleSync = async () => {
    if (!tokenInput.trim()) return;
    setIsSyncing(true);
    const res = await syncOperator(tokenInput.trim());
    setIsSyncing(false);
    if (res.success) {
      setShowConfigModal(false);
      setTokenInput("");
    }
  };

  const handleManualDial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;
    await dial({ phone: manualPhone.trim() });
  };

  // O Webphone dock só fica visível e disponível para quem tem o token do webphone preenchido
  const hasToken = Boolean(operator?.api4com_token?.trim());
  if (!operator || !hasToken) return null;

  return (
    <>
      {/* Banner de Aviso de Aba Secundária */}
      {!isPrimaryTab && (
        <div className="fixed bottom-20 right-6 z-50 bg-amber-500/90 text-amber-950 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-3 backdrop-blur-sm border border-amber-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Webphone ativo em outra aba</p>
            <p className="text-[11px] opacity-90">O ramal SIP só pode ficar online em uma aba por vez.</p>
          </div>
          <Button size="sm" variant="secondary" className="h-7 text-xs ml-2 bg-white" onClick={claimPrimaryTab}>
            Assumir Aqui
          </Button>
        </div>
      )}

      {/* Dock Principal do Webphone */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300 shadow-2xl rounded-2xl border bg-card/95 backdrop-blur-md overflow-hidden",
          isCallActive || isExpanded ? "w-80" : "w-auto min-w-[260px]",
          status === "in_call" && "border-emerald-500/60 shadow-emerald-500/10",
          status === "ringing" && "border-amber-500/60 shadow-amber-500/10 animate-pulse",
          status === "error" && "border-destructive/60"
        )}
      >
        {/* Cabeçalho do Dock */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Switch
              checked={isOnline}
              onCheckedChange={(val) => toggleOnline(val)}
              disabled={!hasSipConfig || status === "connecting"}
              className="data-[state=checked]:bg-emerald-500"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                {status === "connecting" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {status === "connected" && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
                {status === "in_call" && <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />}
                {status === "ringing" && <Phone className="h-3.5 w-3.5 text-amber-500 animate-bounce" />}
                {isOnline ? `Ramal ${operator.extension || ""}` : "Webphone Offline"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {!hasSipConfig
                  ? "Configuração pendente"
                  : status === "in_call"
                  ? `Em chamada • ${formatSeconds(duration)}`
                  : status === "ringing"
                  ? "Chamando lead..."
                  : status === "dialing"
                  ? "Conectando ramal..."
                  : isOnline
                  ? "Pronto para ligar"
                  : "Desconectado"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!hasSipConfig && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-500 hover:text-amber-600"
                onClick={() => setShowConfigModal(true)}
                title="Configurar Token API4COM"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            {hasSipConfig && !isCallActive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Recolher discador" : "Abrir discador"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive text-[11px] px-3 py-1.5 flex items-center gap-1.5 border-b border-destructive/20">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Visualização de Chamada Ativa */}
        {isCallActive && (
          <div className="p-4 space-y-4">
            <div className="text-center space-y-1">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2.5 py-0.5",
                  status === "in_call" && "border-emerald-500 text-emerald-500 bg-emerald-500/10",
                  status === "ringing" && "border-amber-500 text-amber-500 bg-amber-500/10",
                  status === "dialing" && "border-blue-500 text-blue-500 bg-blue-500/10"
                )}
              >
                {status === "in_call" ? "EM LIGAÇÃO" : status === "ringing" ? "CHAMANDO..." : "DISCANDO..."}
              </Badge>
              <h4 className="text-sm font-bold truncate">{activeCall?.leadName || "Lead"}</h4>
              <p className="text-xs text-muted-foreground font-mono">{activeCall?.leadPhone}</p>
              {status === "in_call" && (
                <p className="text-2xl font-mono font-bold text-foreground pt-1">{formatSeconds(duration)}</p>
              )}
            </div>

            {/* Controles da Chamada */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {/* Botão Mudo */}
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={toggleMute}
                disabled={status !== "in_call"}
                title={isMuted ? "Desativar Mudo" : "Silenciar Microfone"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* Botão Teclado DTMF */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    disabled={status !== "in_call"}
                    title="Teclado DTMF"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="center">
                  <div className="grid grid-cols-3 gap-1.5">
                    {DTMF_KEYS.map((k) => (
                      <Button
                        key={k}
                        variant="secondary"
                        size="sm"
                        className="h-10 text-sm font-semibold"
                        onClick={() => sendDTMF(k)}
                      >
                        {k}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Botão Desligar */}
              <Button
                variant="destructive"
                size="icon"
                className="h-11 w-11 rounded-full shadow-lg hover:bg-destructive/90 animate-pulse"
                onClick={hangup}
                title="Encerrar Chamada"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Discador Manual (Quando expandido e sem chamada ativa) */}
        {!isCallActive && isExpanded && (
          <div className="p-3.5 space-y-3">
            <form onSubmit={handleManualDial} className="flex gap-1.5">
              <Input
                placeholder="Número (DDD + Telefone)..."
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="text-xs h-9 font-mono"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!isOnline || !manualPhone.trim()}
              >
                <Phone className="h-3.5 w-3.5 mr-1" />
                Ligar
              </Button>
            </form>

            <div className="grid grid-cols-3 gap-1 pt-1">
              {DTMF_KEYS.map((k) => (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold"
                  onClick={() => setManualPhone((prev) => prev + k)}
                >
                  {k}
                </Button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1 text-[11px] text-muted-foreground border-t">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfigModal(true)}
              >
                Configurar Token API4COM
              </Button>
              {manualPhone && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[11px] text-destructive hover:underline"
                  onClick={() => setManualPhone("")}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Configuração do Token API4COM */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configuração do Webphone API4COM</DialogTitle>
            <DialogDescription>
              Cole o Token de Acesso da sua conta de usuário na API4COM para vincular automaticamente o seu ramal SIP e
              ativar o Webphone próprio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Token de Acesso do Operador</label>
              <Input
                type="password"
                placeholder="Cole o token (Tokens de Acesso -> Nunca expira)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Gere o token no portal da API4COM em <strong>Tokens de acesso → Novo Token</strong> com validade{" "}
                <em>Nunca expira</em>.
              </p>
            </div>

            {operator?.extension && (
              <div className="rounded-lg border bg-muted/40 p-2.5 text-xs space-y-1">
                <p>
                  <strong>Ramal atual:</strong> {operator.extension}
                </p>
                <p>
                  <strong>Domínio SIP:</strong> {operator.sip_domain || "Não vinculado"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={!tokenInput.trim() || isSyncing} className="gap-2">
              {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSyncing ? "Sincronizando..." : "Sincronizar Ramal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
