import { useState, useEffect } from "react";
import { useAdminInstances, useAdminCompanies, AdminInstance } from "@/hooks/useAdmin";
import { useWebhookConfigs, getWebhookUrlForCategory } from "@/hooks/useWebhookConfigs";
import { buildInstancePayload } from "@/lib/webhook-utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Copy, Eye, EyeOff, RefreshCw, Smartphone,
  RefreshCcw, Loader2, Plug, QrCode, Phone, ArrowLeft, XCircle,
  MoreVertical, Pencil, Building2, Ban,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL = "https://n8n-n8n.nuwfic.easypanel.host/webhook/instance";

const statusConfig: Record<string, { label: string; className: string }> = {
  connected:            { label: "Conectada",    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  "waiting connection": { label: "Aguardando",   className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  disconnected:         { label: "Desconectada", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

function copyToClipboard(value: string | null, label: string) {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast({ title: `${label} copiado!` });
}

function MaskedToken({ value }: { value: string | null }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="font-mono text-xs truncate max-w-[120px]" title={value}>
        {revealed ? value : "●".repeat(Math.min(value.length, 12))}
      </span>
      <button onClick={() => setRevealed(r => !r)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
      <button onClick={() => copyToClipboard(value, "Token")} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

const TimerDisplay = ({ timeLeft, isExpired }: { timeLeft: number; isExpired: boolean }) => {
  const percentage = (timeLeft / 20) * 100;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3" fill="none" className="text-muted" />
          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3" fill="none"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${isExpired ? "text-destructive" : timeLeft <= 5 ? "text-warning" : "text-primary"}`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${isExpired ? "text-destructive" : timeLeft <= 5 ? "text-warning" : ""}`}>
          {isExpired ? "!" : timeLeft}
        </span>
      </div>
      <span className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
        {isExpired ? "Expirado" : `${timeLeft}s restantes`}
      </span>
    </div>
  );
};

// Countdown até expiração (atualiza a cada minuto)
const ExpirationCountdown = ({ expiresAt }: { expiresAt: string }) => {
  const calc = () => new Date(expiresAt).getTime() - Date.now();
  const [remaining, setRemaining] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setRemaining(calc()), 60000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (remaining <= 0) return <span className="text-[10px] text-destructive font-medium">Expirado</span>;
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return (
    <span className="text-[10px] text-orange-500 font-mono whitespace-nowrap">
      {days > 0 ? `vence em ${days}d ${hours}h` : hours > 0 ? `vence em ${hours}h ${mins}m` : `vence em ${mins}m`}
    </span>
  );
};

// Helper para montar payload de instância
function instPayload(inst: AdminInstance, action: string, extra?: Record<string, unknown>) {
  return {
    action,
    instance: {
      id: inst.id,
      name: inst.name,
      phone: inst.phone || "",
      provider: inst.provider,
      externalId: inst.external_instance_id || "",
      externalToken: inst.external_instance_token || "",
    },
    ...extra,
  };
}

export default function AdminInstances() {
  const { data: instances = [], isLoading, refetch } = useAdminInstances();
  const { data: companies = [] } = useAdminCompanies();
  const { configs } = useWebhookConfigs();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // — Connect dialog —
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectingInstance, setConnectingInstance] = useState<AdminInstance | null>(null);
  const [connectionStep, setConnectionStep] = useState<"select" | "qr" | "code">("select");
  const [isConnecting, setIsConnecting] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const [qrTimeLeft, setQrTimeLeft] = useState(20);
  const [isQrExpired, setIsQrExpired] = useState(false);

  // — Rename dialog —
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingInstance, setRenamingInstance] = useState<AdminInstance | null>(null);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // — Assign dialog —
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningInstance, setAssigningInstance] = useState<AdminInstance | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // — Cancel dialog —
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelingInstance, setCancelingInstance] = useState<AdminInstance | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  // QR countdown
  useEffect(() => {
    if (!showConnectDialog || connectionStep === "select" || isQrExpired) return;
    if (qrTimeLeft <= 0) { setIsQrExpired(true); return; }
    const t = setInterval(() => setQrTimeLeft(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [showConnectDialog, connectionStep, qrTimeLeft, isQrExpired]);

  const openConnectDialog = (inst: AdminInstance) => {
    setConnectingInstance(inst);
    setConnectionStep("select");
    setWebhookResponse(null);
    setQrTimeLeft(20);
    setIsQrExpired(false);
    setShowConnectDialog(true);
  };
  const openRenameDialog = (inst: AdminInstance) => {
    setRenamingInstance(inst);
    setNewName(inst.name);
    setShowRenameDialog(true);
  };
  const openAssignDialog = (inst: AdminInstance) => {
    setAssigningInstance(inst);
    setSelectedCompanyId("");
    setShowAssignDialog(true);
  };
  const openCancelDialog = (inst: AdminInstance) => {
    setCancelingInstance(inst);
    setShowCancelDialog(true);
  };

  const filtered = instances.filter((inst: AdminInstance) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      inst.name.toLowerCase().includes(q) ||
      inst.phone.toLowerCase().includes(q) ||
      inst.company_name.toLowerCase().includes(q) ||
      (inst.external_instance_id || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Webhook helper
  const callWebhook = async (payload: object) => {
    const { data: proxyResult, error } = await (supabase as any).functions.invoke("webhook-proxy", {
      body: { url: WEBHOOK_URL, payload },
    });
    if (error) throw error;
    if (!proxyResult?.success) throw new Error(proxyResult?.body || "Erro no webhook");
    return JSON.parse(proxyResult.body);
  };

  // Connect
  const triggerAdminConnect = async (method: "qr" | "phone") => {
    if (!connectingInstance) return;
    const webhookUrl = getWebhookUrlForCategory("instance", configs);
    if (!webhookUrl) throw new Error("URL de webhook não configurada para instâncias.");
    setIsConnecting(true);
    setWebhookResponse(null);
    try {
      const payload = buildInstancePayload({
        action: "instance.connect",
        instance: {
          id: connectingInstance.id,
          name: connectingInstance.name,
          phone: method === "phone" ? connectingInstance.phone.replace(/\D/g, "") : "",
          provider: connectingInstance.provider,
          externalId: connectingInstance.external_instance_id || "",
          externalToken: connectingInstance.external_instance_token || "",
        },
        connection: { method, origin: window.location.origin },
      });
      const { data: proxyResult, error: proxyError } = await (supabase as any).functions.invoke("webhook-proxy", {
        body: { url: webhookUrl, payload },
      });
      if (proxyError) throw proxyError;
      if (!proxyResult?.success) throw new Error(`Webhook retornou status ${proxyResult?.status}: ${proxyResult?.body}`);

      const data = JSON.parse(proxyResult.body);
      let nd = Array.isArray(data) && data.length > 0 ? data[0] : data;
      if (nd?.connection?.code) nd = { ...nd, code: nd.connection.code };

      const isImg = (v: string | null | undefined) => !!v && (v.startsWith("data:image") || (v.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(v.replace(/\s/g, ""))));
      const toUri = (v: string) => v.startsWith("data:image") ? v : `data:image/png;base64,${v.replace(/\s/g, "")}`;

      if (isImg(nd?.code)) nd = { ...nd, qrcode_image: toUri(nd.code), code: undefined };
      for (const f of ["qrcode_image", "value", "qrCode", "qrCodeUrl"] as const) {
        if (nd?.[f] && isImg(nd[f]) && !nd[f].startsWith("data:image") && !nd[f].startsWith("http")) {
          nd = { ...nd, [f]: toUri(nd[f]) };
        }
      }
      setWebhookResponse(nd);
      setQrTimeLeft(20);
      setIsQrExpired(false);

      const iData = nd.instance || nd;
      const iId = iData.id || nd.id_instance;
      const iToken = iData.token || nd.token_instance;
      if (iId && iToken) {
        await (supabase as any).from("instances").update({
          external_instance_id: iId,
          external_instance_token: iToken,
          ...(iData.paymentStatus ? { payment_status: iData.paymentStatus } : {}),
          ...(iData.expirationDate ? { expiration_date: new Date(iData.expirationDate).toISOString() } : {}),
        }).eq("id", connectingInstance.id);
        toast({ title: "Credenciais salvas" });
        refetch();
      }
      return nd;
    } catch (e: any) {
      toast({ title: "Falha ao conectar", description: e.message, variant: "destructive" });
      throw e;
    } finally { setIsConnecting(false); }
  };

  // Rename
  const handleRename = async () => {
    if (!renamingInstance || !newName.trim()) return;
    setIsRenaming(true);
    try {
      await callWebhook(instPayload(renamingInstance, "rename instance", { newName: newName.trim() }));
      await (supabase as any).from("instances").update({ name: newName.trim() }).eq("id", renamingInstance.id);
      toast({ title: "Instância renomeada com sucesso!" });
      setShowRenameDialog(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Erro ao renomear", description: e.message, variant: "destructive" });
    } finally { setIsRenaming(false); }
  };

  // Assign
  const handleAssign = async () => {
    if (!assigningInstance || !selectedCompanyId) return;
    setIsAssigning(true);
    try {
      await (supabase as any).from("instances").update({ company_id: selectedCompanyId }).eq("id", assigningInstance.id);
      toast({ title: "Instância atribuída à empresa!" });
      setShowAssignDialog(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Erro ao atribuir", description: e.message, variant: "destructive" });
    } finally { setIsAssigning(false); }
  };

  // Cancel
  const handleCancel = async () => {
    if (!cancelingInstance) return;
    setIsCanceling(true);
    try {
      await callWebhook(instPayload(cancelingInstance, "cancel_instance"));
      toast({ title: "Solicitação de cancelamento enviada!" });
      setShowCancelDialog(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" });
    } finally { setIsCanceling(false); }
  };

  // Sync
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      let allProviderInstances: any[] = [];
      let page = 1, totalPages = 1;
      do {
        const { data: pr, error } = await (supabase as any).functions.invoke("webhook-proxy", {
          body: { url: WEBHOOK_URL, payload: { action: "instance.list_all", page } },
        });
        if (error) throw error;
        if (!pr?.success) throw new Error(pr?.body || "Erro no webhook");
        const parsed = JSON.parse(pr.body);
        const result = Array.isArray(parsed) ? parsed[0] : parsed;
        allProviderInstances = [...allProviderInstances, ...(result.content || [])];
        totalPages = result.totalPage || 1;
        page++;
      } while (page <= totalPages);

      const existingMap = new Map(
        instances.filter(i => i.external_instance_id).map(i => [i.external_instance_id!, i.id])
      );
      let updated = 0, inserted = 0, errors = 0;
      for (const inst of allProviderInstances) {
        const isConnected = !!(inst.phoneConnected && inst.whatsappConnected);
        const rowData = {
          name: inst.name,
          external_instance_token: inst.token,
          status: isConnected ? "connected" : "disconnected",
          payment_status: inst.paymentStatus ?? null,
          expiration_date: inst.due ? new Date(inst.due).toISOString() : null,
          provider: "Z-API",
        };
        const dbId = existingMap.get(inst.id);
        if (dbId) {
          const { error } = await (supabase as any).from("instances").update(rowData).eq("id", dbId);
          if (error) { errors++; console.error("[sync] Update error:", error.message, inst.id); } else updated++;
        } else {
          const { error } = await (supabase as any).from("instances").insert({ ...rowData, external_instance_id: inst.id, phone: "" });
          if (error) { errors++; console.error("[sync] Insert error:", error.message, inst.id); } else inserted++;
        }
      }
      await refetch();
      toast({ title: "Sincronização concluída", description: `${updated} atualizadas · ${inserted} novas · ${errors} erros` });
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" });
    } finally { setIsSyncing(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" /> Instâncias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Todas as conexões WhatsApp da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSyncAll} disabled={isSyncing} size="sm">
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            {isSyncing ? "Sincronizando..." : "Sincronizar com Z-API"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Buscar por empresa, nome, phone ou Instance ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="connected">Conectadas</SelectItem>
                <SelectItem value="waiting connection">Aguardando</SelectItem>
                <SelectItem value="disconnected">Desconectadas</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground self-center whitespace-nowrap">
              {filtered.length} instância{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Instance ID</th>
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Pagamento</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                ? <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Nenhuma instância encontrada.</td></tr>
                : filtered.map((inst: AdminInstance) => {
                    const s = statusConfig[inst.status] ?? { label: inst.status, className: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{inst.company_name}</td>
                        <td className="px-4 py-3">{inst.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{inst.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs truncate max-w-[140px]" title={inst.external_instance_id || ""}>{inst.external_instance_id || "—"}</span>
                            {inst.external_instance_id && (
                              <button onClick={() => copyToClipboard(inst.external_instance_id, "Instance ID")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3"><MaskedToken value={inst.external_instance_token} /></td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs font-medium border ${s.className}`}>{s.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {inst.payment_status === "PAID"
                            ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium border">Pago</Badge>
                            : inst.payment_status === "TRIAL"
                            ? <div className="flex flex-col gap-0.5">
                                <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs font-medium border w-fit">Trial</Badge>
                                {inst.expiration_date && <ExpirationCountdown expiresAt={inst.expiration_date} />}
                              </div>
                            : inst.payment_status
                            ? <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs font-medium border">Pendente</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inst.provider}</td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-xs text-muted-foreground">Ações</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openConnectDialog(inst)}>
                                <Plug className="h-4 w-4 mr-2" /> Conectar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openRenameDialog(inst)}>
                                <Pencil className="h-4 w-4 mr-2" /> Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAssignDialog(inst)}>
                                <Building2 className="h-4 w-4 mr-2" /> Atribuir a empresa
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openCancelDialog(inst)} className="text-destructive focus:text-destructive">
                                <Ban className="h-4 w-4 mr-2" /> Cancelar Instância
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ─── Dialog Conectar ─── */}
      <Dialog open={showConnectDialog} onOpenChange={open => { if (!open) { setShowConnectDialog(false); setConnectingInstance(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {connectionStep !== "select" && (
              <button onClick={() => { setConnectionStep("select"); setWebhookResponse(null); }}
                className="absolute left-4 top-4 text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            <DialogTitle>
              {connectionStep === "select" ? `Conectar — ${connectingInstance?.name}` :
               connectionStep === "qr" ? "Conectar com QR Code" : "Conectar com Número"}
            </DialogTitle>
            <DialogDescription>
              {connectionStep === "select" ? "Como deseja conectar esta instância?" :
               connectionStep === "qr" ? "Escaneie o código com o WhatsApp" : "Informe o código no WhatsApp"}
            </DialogDescription>
          </DialogHeader>
          {connectionStep === "select" && (
            <div className="space-y-3 py-4">
              <Button variant="outline" className="w-full justify-start h-auto p-4" disabled={isConnecting}
                onClick={async () => { try { const r = await triggerAdminConnect("qr"); if (r?.qrcode_image || r?.value || r?.qrCode || r?.qrCodeUrl) setConnectionStep("qr"); else if (r?.code) setConnectionStep("code"); else setConnectionStep("qr"); } catch {} }}>
                {isConnecting ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <QrCode className="h-5 w-5 mr-3" />}
                <div className="text-left"><p className="font-medium">Conectar com QR Code</p><p className="text-xs text-muted-foreground">Escaneie o código com o WhatsApp</p></div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto p-4" disabled={isConnecting}
                onClick={async () => { try { const r = await triggerAdminConnect("phone"); if (r?.code) setConnectionStep("code"); } catch {} }}>
                {isConnecting ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <Phone className="h-5 w-5 mr-3" />}
                <div className="text-left"><p className="font-medium">Conectar com Número de Telefone</p><p className="text-xs text-muted-foreground">{connectingInstance?.phone || "Número não cadastrado"}</p></div>
              </Button>
            </div>
          )}
          {connectionStep === "qr" && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
                <div className="relative w-48 h-48 bg-background border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {isConnecting ? <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    : (webhookResponse?.qrcode_image || webhookResponse?.value || webhookResponse?.qrCode || webhookResponse?.qrCodeUrl) ? (
                      <><img src={webhookResponse.qrcode_image || webhookResponse.value || webhookResponse.qrCode || webhookResponse.qrCodeUrl} alt="QR Code" className={`w-full h-full object-contain ${isQrExpired ? "opacity-20 blur-sm" : ""}`} />
                        {isQrExpired && <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><XCircle className="h-12 w-12 text-destructive mx-auto mb-2" /><p className="text-sm font-medium text-destructive">QR Code expirado</p></div></div>}
                      </>
                    ) : <QrCode className="h-24 w-24 text-muted-foreground" />
                  }
                </div>
                {(webhookResponse?.qrcode_image || webhookResponse?.value) && !isConnecting && <TimerDisplay timeLeft={qrTimeLeft} isExpired={isQrExpired} />}
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {isConnecting ? "Gerando QR Code..." : isQrExpired ? "Clique em 'Gerar Novo QR' para continuar" : "Abra o WhatsApp e escaneie o código"}
                </p>
              </div>
              {isQrExpired && <Button className="w-full" onClick={async () => { try { await triggerAdminConnect("qr"); } catch {} }}>Gerar Novo QR Code</Button>}
            </div>
          )}
          {connectionStep === "code" && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center p-6 border rounded-lg bg-muted/30">
                {isConnecting ? <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  : webhookResponse?.code ? (
                    <><div className={`text-center mb-4 ${isQrExpired ? "opacity-50" : ""}`}>
                        <p className="text-sm text-muted-foreground mb-2">Código de conexão</p>
                        <div className="flex items-center gap-2 bg-background border rounded-lg px-6 py-4">
                          <span className={`text-3xl font-mono font-bold tracking-widest ${isQrExpired ? "line-through" : ""}`}>{webhookResponse.code}</span>
                        </div>
                      </div>
                      <TimerDisplay timeLeft={qrTimeLeft} isExpired={isQrExpired} />
                      {!isQrExpired && <Button variant="outline" className="mt-4" onClick={() => { navigator.clipboard.writeText(webhookResponse.code); toast({ title: "Código copiado!" }); }}><Copy className="h-4 w-4 mr-2" /> Copiar código</Button>}
                    </>
                  ) : <p className="text-muted-foreground">Aguardando código...</p>
                }
              </div>
              {isQrExpired && <Button className="w-full" onClick={async () => { try { await triggerAdminConnect("phone"); } catch {} }}>Gerar Novo Código</Button>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Renomear ─── */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Renomear Instância</DialogTitle>
            <DialogDescription>O novo nome será enviado ao provedor e salvo no banco.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="new-name">Novo nome</Label>
            <Input id="new-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: DispatchOne | Jair" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRenameDialog(false)}>Cancelar</Button>
            <Button onClick={handleRename} disabled={isRenaming || !newName.trim()}>
              {isRenaming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Renomeando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Atribuir ─── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Atribuir a Empresa</DialogTitle>
            <DialogDescription>Selecione a empresa que vai usar esta instância.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Empresa</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
              <SelectContent>
                {(companies as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={isAssigning || !selectedCompanyId}>
              {isAssigning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Atribuindo...</> : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Cancelar ─── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Ban className="h-4 w-4" /> Cancelar Instância</DialogTitle>
            <DialogDescription>
              Esta ação enviará uma requisição de cancelamento para o provedor.
              A instância <strong>{cancelingInstance?.name}</strong> será desativada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCancelDialog(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCanceling}>
              {isCanceling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...</> : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
