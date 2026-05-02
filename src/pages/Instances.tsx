import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader, StatusBadge, HealthBar, AlertBanner } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Settings, RefreshCw, CheckCircle, XCircle, Plus, Loader2, Trash2, Radio, Shield, Eye, GitBranch, Pencil, QrCode, Phone, ArrowLeft, Copy, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { useInstances, Instance, InstanceFunction, mapFrontendStatusToDb } from "@/hooks/useInstances";
import { useWebhookConfigs, getWebhookUrlForCategory } from "@/hooks/useWebhookConfigs";
import { buildInstancePayload } from "@/lib/webhook-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

// Função para formatar número de telefone brasileiro
const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 13);
  if (limited.length === 0) return "";
  if (limited.length <= 2) return `+${limited}`;
  if (limited.length <= 4) return `+${limited.slice(0, 2)} (${limited.slice(2)}`;
  if (limited.length <= 9) return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4)}`;
  return `+${limited.slice(0, 2)} (${limited.slice(2, 4)}) ${limited.slice(4, 9)}-${limited.slice(9)}`;
};

// Timer Display Component - defined OUTSIDE the main component to avoid React hooks issues
const TimerDisplay = ({ timeLeft, isExpired }: { timeLeft: number; isExpired: boolean }) => {
  const percentage = (timeLeft / 20) * 100;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="18"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="24"
            cy="24"
            r="18"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${
              isExpired ? "text-destructive" : timeLeft <= 5 ? "text-warning" : "text-primary"
            }`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
          isExpired ? "text-destructive" : timeLeft <= 5 ? "text-warning" : ""
        }`}>
          {isExpired ? "!" : timeLeft}
        </span>
      </div>
      <span className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
        {isExpired ? "Expirado" : `${timeLeft}s restantes`}
      </span>
    </div>
  );
};
// Payment status badge component
const PaymentStatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const upper = status.toUpperCase();
  const config: Record<string, { className: string; label: string }> = {
    TRIAL: { className: "bg-warning/15 text-warning", label: "Trial" },
    ACTIVE: { className: "bg-success/15 text-success", label: "Ativo" },
    EXPIRED: { className: "bg-destructive/15 text-destructive", label: "Expirado" },
    SUSPENDED: { className: "bg-destructive/15 text-destructive", label: "Suspenso" },
  };
  const c = config[upper] || { className: "bg-muted text-muted-foreground", label: status };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
};

// Expiration countdown component
const ExpirationCountdown = ({ expirationDate }: { expirationDate: string }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expMs = new Date(expirationDate).getTime();
  const diffMs = expMs - now;

  if (diffMs <= 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Expirado
      </div>
    );
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let label: string;
  let colorClass: string;

  if (days > 0) {
    label = `${days}d ${remainingHours}h restantes`;
    colorClass = "text-success";
  } else if (hours >= 1) {
    label = `${hours}h ${minutes}m restantes`;
    colorClass = hours > 1 ? "text-success" : "text-warning";
  } else {
    label = `${minutes}m restantes`;
    colorClass = "text-destructive";
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${colorClass}`}>
      <Clock className="h-3.5 w-3.5" />
      {label}
    </div>
  );
};

export default function Instances() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { configs } = useWebhookConfigs();
  const { 
    instances, 
    isLoading, 
    refetch, 
    createInstance, 
    updateInstance, 
    deleteInstance,
    isCreating,
    isUpdating,
    isDeleting 
  } = useInstances();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<Instance | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisconnectedAlert, setShowDisconnectedAlert] = useState(true);
  const [configForm, setConfigForm] = useState({
    apiKey: "",
    webhookUrl: "",
    instanceId: ""
  });
  const [newInstance, setNewInstance] = useState({
    name: "",
    provider: "Z-API" as Instance["provider"],
    function: "dispatcher" as InstanceFunction,
    phoneNumber: ""
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editInstance, setEditInstance] = useState<{
    id: string;
    name: string;
    provider: Instance["provider"];
    function: InstanceFunction;
    phoneNumber: string;
  } | null>(null);
  const [connectionStep, setConnectionStep] = useState<"select" | "qr" | "phone" | "code">("select");
  const [phoneForConnection, setPhoneForConnection] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<{
    value?: string; // Base64 do QR Code (formato antigo)
    qrcode_image?: string; // Base64 do QR Code (formato atualizado)
    qrCode?: string;
    qrCodeUrl?: string;
    sessionId?: string;
    expiresAt?: string;
    message?: string;
    code?: string; // Código de conexão via telefone
    id_instance?: string; // ID da instância no provedor
    token_instance?: string; // Token de autenticação
  } | null>(null);
  const [qrTimeLeft, setQrTimeLeft] = useState(20);
  const [isQrExpired, setIsQrExpired] = useState(false);

  const triggerConnectionWebhook = async (method: "qr" | "phone") => {
    if (!selectedInstance) return;
    // Usar URL dinâmica do webhook
    const webhookUrl = getWebhookUrlForCategory("instance", configs);
    setIsConnecting(true);
    setWebhookResponse(null);
    try {
      const payload = buildInstancePayload({
        action: "instance.connect",
        instance: {
          id: selectedInstance.id,
          name: selectedInstance.name,
          phone: method === "phone" && selectedInstance.phoneNumber ? selectedInstance.phoneNumber.replace(/\D/g, '') : "",
          provider: selectedInstance.provider,
          externalId: selectedInstance.idInstance || "",
          externalToken: selectedInstance.tokenInstance || "",
        },
        connection: {
          method: method,
          origin: window.location.origin,
        },
      });
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      console.log("Webhook response:", data);

      // Normalizar resposta - pode ser array ou objeto
      let normalizedData = data;
      if (Array.isArray(data) && data.length > 0) {
        normalizedData = data[0];
      }
      // Extrair connection.code para o nível raiz para exibição do código de pareamento
      if (normalizedData?.connection?.code) {
        normalizedData = { ...normalizedData, code: normalizedData.connection.code };
      }

      // Detectar se algum campo "code" é na verdade uma imagem base64
      const isImageData = (val: string | undefined | null): boolean => {
        if (!val || typeof val !== 'string') return false;
        if (val.startsWith('data:image')) return true;
        // Base64 cru: string longa sem espaços, apenas chars base64
        if (val.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(val.replace(/\s/g, ''))) return true;
        return false;
      };

      const ensureDataUri = (val: string): string => {
        if (val.startsWith('data:image')) return val;
        return `data:image/png;base64,${val.replace(/\s/g, '')}`;
      };

      // Se "code" é na verdade imagem, mover para qrcode_image
      if (isImageData(normalizedData?.code)) {
        normalizedData = {
          ...normalizedData,
          qrcode_image: ensureDataUri(normalizedData.code),
          code: undefined,
        };
      }

      // Garantir prefixo data URI em campos de QR existentes
      for (const field of ['qrcode_image', 'value', 'qrCode', 'qrCodeUrl'] as const) {
        if (normalizedData?.[field] && typeof normalizedData[field] === 'string' && isImageData(normalizedData[field]) && !normalizedData[field].startsWith('data:image') && !normalizedData[field].startsWith('http')) {
          normalizedData = { ...normalizedData, [field]: ensureDataUri(normalizedData[field]) };
        }
      }

      setWebhookResponse(normalizedData);

      // Salvar credenciais se presentes na resposta (novo formato com instance.id/token)
      const instanceData = normalizedData.instance || normalizedData;
      const instanceId = instanceData.id || normalizedData.id_instance;
      const instanceToken = instanceData.token || normalizedData.token_instance;
      const paymentStatus = instanceData.paymentStatus;
      const expirationDate = instanceData.expirationDate;

      if (instanceId && instanceToken) {
        const updates: Record<string, string> = {
          external_instance_id: instanceId,
          external_instance_token: instanceToken,
        };
        if (paymentStatus) updates.payment_status = paymentStatus;
        if (expirationDate) updates.expiration_date = new Date(expirationDate).toISOString();

        await updateInstance({
          id: selectedInstance.id,
          updates,
        });
        
        toast({
          title: "Credenciais recebidas",
          description: "ID e Token da instância foram salvos."
        });
      }

      return normalizedData;
    } catch (error) {
      console.error("Error triggering webhook:", error);
      toast({
        title: t("common.error"),
        description: "Falha ao conectar com o servidor. Tente novamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Timer countdown for QR/Code validity - fixed to avoid state updates during render
  useEffect(() => {
    const hasQrOrCode = webhookResponse?.qrcode_image || webhookResponse?.value || webhookResponse?.qrCode || webhookResponse?.qrCodeUrl || webhookResponse?.code;
    
    if ((connectionStep === "qr" || connectionStep === "code") && hasQrOrCode && !isConnecting) {
      setQrTimeLeft(20);
      setIsQrExpired(false);
      
      const interval = setInterval(() => {
        setQrTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [connectionStep, webhookResponse, isConnecting]);

  // Separate effect to handle expiration state
  useEffect(() => {
    if (qrTimeLeft === 0 && !isQrExpired) {
      setIsQrExpired(true);
    }
  }, [qrTimeLeft, isQrExpired]);

  const { user } = useAuth();

  // Auto-disconnect instances expiring in < 1 hour
  const autoDisconnectedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!instances.length || !user) return;
    
    const checkExpirations = async () => {
      for (const inst of instances) {
        if (inst.status !== "connected" || !inst.expirationDate) continue;
        if (autoDisconnectedRef.current.has(inst.id)) continue;
        
        const diffMs = new Date(inst.expirationDate).getTime() - Date.now();
        if (diffMs < 60 * 60 * 1000) { // < 1 hour
          autoDisconnectedRef.current.add(inst.id);
          
          try {
            await updateInstance({
              id: inst.id,
              updates: { status: "disconnected" }
            });

            // Create alert for the user
            await supabase.from("alerts").insert({
              user_id: user.id,
              severity: "warning",
              title: `Instância ${inst.name} desconectada`,
              description: `A instância foi desconectada automaticamente porque o vencimento é em menos de 1 hora.`,
              entity: inst.name,
            });

            toast({
              title: "Instância desconectada",
              description: `${inst.name} foi desconectada automaticamente por vencimento próximo.`,
              variant: "destructive",
            });
          } catch (e) {
            console.error("Auto-disconnect error:", e);
          }
        }
      }
    };
    
    checkExpirations();
    const interval = setInterval(checkExpirations, 60000);
    return () => clearInterval(interval);
  }, [instances, user]);

  // No longer need localStorage - data persists in database
  const getFunctionIcon = (fn: InstanceFunction) => {
    switch (fn) {
      case "dispatcher":
        return <Radio className="h-3.5 w-3.5" />;
      case "admin":
        return <Shield className="h-3.5 w-3.5" />;
      case "spy":
        return <Eye className="h-3.5 w-3.5" />;
      case "funnel":
        return <GitBranch className="h-3.5 w-3.5" />;
    }
  };
  const getFunctionLabel = (fn: InstanceFunction) => {
    switch (fn) {
      case "dispatcher":
        return t("instances.functionDispatcher");
      case "admin":
        return t("instances.functionAdmin");
      case "spy":
        return t("instances.functionSpy");
      case "funnel":
        return t("instances.functionFunnel");
    }
  };
  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const instancesPayload = instances
        .filter(i => i.idInstance && i.tokenInstance)
        .map(i => ({
          id: i.id,
          name: i.name,
          external_instance_id: i.idInstance,
          external_instance_token: i.tokenInstance,
          current_status: mapFrontendStatusToDb(i.status),
        }));

      if (instancesPayload.length > 0) {
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: {
            url: "https://n8n-n8n.nuwfic.easypanel.host/webhook/status_instances",
            payload: { instances: instancesPayload },
          },
        });

        if (proxyError) {
          console.error("Webhook error:", proxyError);
        } else {
          let results: any[] = [];
          try {
            const bodyData = typeof proxyData?.body === "string"
              ? JSON.parse(proxyData.body)
              : proxyData?.body || proxyData;
            results = Array.isArray(bodyData) ? bodyData : bodyData?.instances || [];
          } catch { /* ignore parse errors */ }

          for (const result of results) {
            if (!result.id) continue;

            // Match by external instance ID (Z-API id), not our internal UUID
            const instance = instances.find(i => i.idInstance === result.id);
            if (!instance) continue;

            const newDbStatus = result.connected ? "connected" : "disconnected";
            const currentDbStatus = mapFrontendStatusToDb(instance.status);

            const updates: Record<string, any> = {};

            if (newDbStatus !== currentDbStatus) {
              updates.status = newDbStatus;
            }
            if (result.paymentStatus) {
              updates.payment_status = result.paymentStatus;
            }
            if (result.due) {
              updates.expiration_date = new Date(result.due).toISOString();
            }

            if (Object.keys(updates).length > 0) {
              await updateInstance({ id: instance.id, updates });
            }
          }
        }
      }

      await refetch();
      toast({
        title: t("instances.statusRefreshed"),
        description: t("instances.statusRefreshed"),
      });
    } catch (err) {
      console.error("Failed to refresh statuses:", err);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status das instâncias.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleConfigure = (instance: Instance) => {
    setSelectedInstance(instance);
    setConfigForm({
      apiKey: "",
      webhookUrl: "",
      instanceId: ""
    });
    setShowConfigDialog(true);
  };
  const handleConnect = async (instance: Instance) => {
    // Update status to waitingConnection when user clicks Connect
    await updateInstance({
      id: instance.id,
      updates: { status: "waiting connection" }
    });
    setSelectedInstance({ ...instance, status: "waitingConnection" });
    setConnectionStep("select");
    setPhoneForConnection("");
    setShowConfigDialog(true);
  };
  const handleCloseConnectionDialog = () => {
    setShowConfigDialog(false);
    setConnectionStep("select");
    setPhoneForConnection("");
    setWebhookResponse(null);
  };
  const handleSaveConfig = async () => {
    if (!configForm.apiKey) {
      toast({
        title: t("common.error"),
        description: t("instances.apiKey") + " " + t("common.required").toLowerCase(),
        variant: "destructive"
      });
      return;
    }
    setIsSaving(true);
    if (selectedInstance) {
      await updateInstance({
        id: selectedInstance.id,
        updates: { status: "connected" }
      });
    }
    setIsSaving(false);
    setShowConfigDialog(false);
    toast({
      title: selectedInstance?.status === "connected" ? t("instances.configSaved") : t("instances.instanceConnected"),
      description: `${selectedInstance?.name} ${selectedInstance?.status === "connected" ? t("instances.configSaved").toLowerCase() : t("instances.instanceConnected").toLowerCase()}.`
    });
  };
  const handleAddInstance = async () => {
    if (!newInstance.name) {
      toast({
        title: t("common.error"),
        description: t("instances.instanceName") + " " + t("common.required").toLowerCase(),
        variant: "destructive"
      });
      return;
    }
    setIsSaving(true);
    try {
      await createInstance({
        name: newInstance.name,
        provider: newInstance.provider,
        phone: newInstance.phoneNumber?.replace(/\D/g, "") || "",
        instance_function: newInstance.function || "dispatcher",
      });
      setShowAddDialog(false);
      setNewInstance({
        name: "",
        provider: "Z-API",
        function: "dispatcher",
        phoneNumber: ""
      });
      toast({
        title: t("instances.instanceAdded"),
        description: `${newInstance.name} - ${t("instances.scanQR")}`
      });
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };
  const handleDeleteInstance = async () => {
    if (instanceToDelete) {
      try {
        await deleteInstance(instanceToDelete.id);
        setShowDeleteDialog(false);
        toast({
          title: t("instances.instanceDeleted"),
          description: `${instanceToDelete.name} ${t("instances.instanceDeletedDescription")}`
        });
      } catch (error) {
        // Error handled in hook
      } finally {
        setInstanceToDelete(null);
      }
    }
  };
  const handleEditClick = (instance: Instance) => {
    setEditInstance({
      id: instance.id,
      name: instance.name,
      provider: instance.provider,
      function: instance.function,
      phoneNumber: (instance as any).phoneNumber || ""
    });
    setShowEditDialog(true);
  };
  const handleSaveEdit = async () => {
    if (!editInstance?.name) {
      toast({
        title: t("common.error"),
        description: t("instances.instanceName") + " " + t("common.required").toLowerCase(),
        variant: "destructive"
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateInstance({
        id: editInstance.id,
        updates: {
          name: editInstance.name,
          provider: editInstance.provider,
          phone: editInstance.phoneNumber?.replace(/\D/g, "") || "",
          instance_function: editInstance.function || "dispatcher",
        }
      });
      setShowEditDialog(false);
      toast({
        title: t("instances.instanceUpdated"),
        description: `${editInstance.name} ${t("instances.instanceUpdatedDescription")}`
      });
      setEditInstance(null);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };
  const disconnectedInstances = instances.filter(inst => inst.status === "disconnected");
  const getStatusDisplay = (status: Instance["status"]) => {
    switch (status) {
      case "connected":
        return "connected";
      case "disconnected":
        return "disconnected";
      case "waitingConnection":
        return "waitingConnection";
      default:
        return "pending";
    }
  };
  return <div className="space-y-8 animate-fade-in">
      <PageHeader title={t("instances.title")} description={t("instances.description")} actions={<Button variant="outline" className="gap-2" onClick={handleRefreshStatus} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("instances.refreshing") : t("instances.refreshStatus")}
          </Button>} />

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("instances.whatsapp")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            {t("instances.settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6">
          {/* Alert for disconnected instances */}
          {disconnectedInstances.length > 0 && showDisconnectedAlert && <AlertBanner variant="warning" title={t("instances.instanceDisconnected")} description={`${disconnectedInstances[0].name} ${t("instances.instanceDisconnectedDescription")}`} dismissible onDismiss={() => setShowDisconnectedAlert(false)} />}

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2].map(i => (
                <Card key={i} className="shadow-elevation-sm">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Instance Cards */}
          {!isLoading && <div className="grid gap-6 md:grid-cols-2">
            {instances.map(instance => <Card key={instance.id} className="shadow-elevation-sm hover:shadow-elevation-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${instance.status === "connected" ? "bg-success/15" : instance.status === "waitingConnection" ? "bg-warning/15" : "bg-muted"}`}>
                      {instance.status === "connected" ? <CheckCircle className="h-5 w-5 text-success" /> : instance.status === "waitingConnection" ? <MessageSquare className="h-5 w-5 text-warning animate-pulse" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{instance.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {instance.provider}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          {getFunctionIcon(instance.function)}
                          {getFunctionLabel(instance.function)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={getStatusDisplay(instance.status)} />
                    <PaymentStatusBadge status={instance.paymentStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connected Number */}
                  {instance.connectedNumber && <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("instances.connectedNumber")}</p>
                      <p className="font-mono text-sm font-medium">{instance.connectedNumber}</p>
                    </div>}

                  {/* Instance Credentials */}
                  {instance.idInstance && (
                    <div className="p-2 bg-muted/50 rounded text-xs font-mono space-y-1">
                      <p><span className="text-muted-foreground">Instance ID:</span> {instance.idInstance}</p>
                      <p><span className="text-muted-foreground">Token:</span> ••••••{instance.tokenInstance?.slice(-6)}</p>
                    </div>
                  )}

                  {/* Expiration Countdown */}
                  {instance.expirationDate && (
                    <ExpirationCountdown expirationDate={instance.expirationDate} />
                  )}

                  {/* Health & Stats */}
                  {instance.status === "connected" && <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("instances.health")}</p>
                          <HealthBar value={instance.health} size="sm" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("instances.dispatches")}</p>
                          <p className="font-mono text-sm font-semibold">
                            {instance.dispatches.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {t("instances.lastCheck")}: {instance.lastCheck}
                      </div>
                    </>}

                  {/* Waiting Connection Message */}
                  {instance.status === "waitingConnection" && <div className="rounded-lg bg-warning/10 p-3 text-center">
                      <p className="text-sm text-warning font-medium">{t("instances.waitingConnection")}</p>
                    </div>}

                  {/* Features */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t("instances.features")}</p>
                    <div className="flex flex-wrap gap-1">
                      {instance.features.map(feature => <Badge key={feature} variant="outline" className="text-xs font-normal">
                          {feature}
                        </Badge>)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    {instance.status === "waitingConnection" ? <Button variant="default" size="sm" className="flex-1 gap-2" onClick={() => handleConnect(instance)}>
                        <QrCode className="h-4 w-4" />
                        {t("instances.viewQR")}
                      </Button> : <Button variant={instance.status === "connected" ? "outline" : "default"} size="sm" className="flex-1 gap-2" onClick={() => instance.status === "connected" ? handleConfigure(instance) : handleConnect(instance)}>
                        <Settings className="h-4 w-4" />
                        {instance.status === "connected" ? t("instances.configure") : t("instances.connect")}
                      </Button>}
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(instance)} title={t("instances.edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                  setInstanceToDelete(instance);
                  setShowDeleteDialog(true);
                }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
          {/* Add Instance */}
          <Card className="border-dashed shadow-elevation-sm">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 rounded-full bg-muted p-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium">{t("instances.addNewInstance")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("instances.connectNewInstance")}
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                {t("instances.addInstance")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("instances.settings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t("settings.description")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configure/Connect Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={handleCloseConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            {connectionStep !== "select" && selectedInstance?.status !== "connected" && <Button variant="ghost" size="sm" className="absolute left-4 top-4 p-0 h-auto" onClick={() => setConnectionStep("select")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("common.back")}
              </Button>}
            <DialogTitle>
              {selectedInstance?.status === "connected" ? `${t("instances.configureInstance")} - ${selectedInstance?.name}` : connectionStep === "select" ? `${t("instances.connectInstance")} - ${selectedInstance?.name}` : connectionStep === "qr" ? t("instances.connectWithQR") : t("instances.connectWithPhone")}
            </DialogTitle>
            <DialogDescription>
              {selectedInstance?.status === "connected" ? t("instances.updateConfiguration") : connectionStep === "select" ? t("instances.howToConnect") : connectionStep === "qr" ? t("instances.connectWithQRDesc") : t("instances.connectWithPhoneDesc")}
            </DialogDescription>
          </DialogHeader>

          {/* Configure Mode - Show technical fields */}
          {selectedInstance?.status === "connected" && <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">{t("instances.apiKey")}</Label>
                <Input id="apiKey" type="password" placeholder={t("instances.apiKeyPlaceholder")} value={configForm.apiKey} onChange={e => setConfigForm(prev => ({
              ...prev,
              apiKey: e.target.value
            }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceId">{t("instances.instanceIdOptional")}</Label>
                <Input id="instanceId" placeholder={t("instances.instanceId")} value={configForm.instanceId} onChange={e => setConfigForm(prev => ({
              ...prev,
              instanceId: e.target.value
            }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">{t("instances.webhookUrl")} ({t("common.optional")})</Label>
                <Input id="webhookUrl" placeholder="https://your-domain.com/webhook" value={configForm.webhookUrl} onChange={e => setConfigForm(prev => ({
              ...prev,
              webhookUrl: e.target.value
            }))} />
              </div>
            </div>}

          {/* Connect Mode - Step 1: Select Method */}
          {selectedInstance?.status !== "connected" && connectionStep === "select" && <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-auto p-4" disabled={isConnecting} onClick={async () => {
              try {
                const response = await triggerConnectionWebhook("qr");
                if (response?.qrcode_image || response?.value || response?.qrCode || response?.qrCodeUrl) {
                  setConnectionStep("qr");
                } else if (response?.code) {
                  setConnectionStep("code");
                } else {
                  setConnectionStep("qr");
                }
              } catch {
                // Error already handled in triggerConnectionWebhook
              }
            }}>
                  {isConnecting ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <QrCode className="h-5 w-5 mr-3" />}
                  <div className="text-left">
                    <p className="font-medium">{t("instances.connectWithQR")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("instances.connectWithQRDesc")}
                    </p>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start h-auto p-4" disabled={!selectedInstance?.phoneNumber || isConnecting} onClick={async () => {
              try {
                const response = await triggerConnectionWebhook("phone");
                if (response?.code) {
                  setConnectionStep("code");
                }
              } catch {
                // Error handled in triggerConnectionWebhook
              }
            }}>
                  {isConnecting ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <Phone className="h-5 w-5 mr-3" />}
                  <div className="text-left">
                    <p className="font-medium">{t("instances.connectWithPhone")}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedInstance?.phoneNumber ? `Conectar com ${selectedInstance.phoneNumber}` : "Nenhum número cadastrado"}
                    </p>
                  </div>
                </Button>
              </div>
            </div>}

          {/* Connect Mode - Step 2A: QR Code */}
          {selectedInstance?.status !== "connected" && connectionStep === "qr" && <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
                <div className="relative w-48 h-48 bg-background border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {isConnecting ? (
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  ) : webhookResponse?.qrcode_image || webhookResponse?.value || webhookResponse?.qrCode || webhookResponse?.qrCodeUrl ? (
                    <>
                      <img 
                        src={webhookResponse.qrcode_image || webhookResponse.value || webhookResponse.qrCode || webhookResponse.qrCodeUrl} 
                        alt="QR Code" 
                        className={`w-full h-full object-contain ${isQrExpired ? "opacity-20 blur-sm" : ""}`}
                      />
                      {isQrExpired && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                            <p className="text-sm font-medium text-destructive">QR Code expirado</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  )}
                </div>
                
                {/* Timer Display */}
                {(webhookResponse?.qrcode_image || webhookResponse?.value || webhookResponse?.qrCode || webhookResponse?.qrCodeUrl) && !isConnecting && (
                  <TimerDisplay timeLeft={qrTimeLeft} isExpired={isQrExpired} />
                )}
                
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {isConnecting 
                    ? "Gerando QR Code..." 
                    : isQrExpired 
                      ? "Clique em 'Gerar Novo QR' para continuar"
                      : webhookResponse?.message || t("instances.waitingForScan")
                  }
                </p>
              </div>
            </div>}

          {/* Connect Mode - Step 2B: Code Display */}
          {selectedInstance?.status !== "connected" && connectionStep === "code" && <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30">
                {isConnecting ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : webhookResponse?.code ? (
                  <>
                    <div className={`text-center mb-4 ${isQrExpired ? "opacity-50" : ""}`}>
                      <p className="text-sm text-muted-foreground mb-2">
                        Código de conexão
                      </p>
                      <div className="flex items-center gap-2 bg-background border rounded-lg px-6 py-4">
                        <span className={`text-3xl font-mono font-bold tracking-widest ${isQrExpired ? "line-through" : ""}`}>
                          {webhookResponse.code}
                        </span>
                      </div>
                    </div>
                    
                    {/* Timer Display */}
                    <TimerDisplay timeLeft={qrTimeLeft} isExpired={isQrExpired} />
                    
                    {!isQrExpired && (
                      <Button variant="outline" className="mt-4" onClick={() => {
                        navigator.clipboard.writeText(webhookResponse.code!);
                        toast({
                          title: "Código copiado!",
                          description: "O código foi copiado para a área de transferência."
                        });
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar código
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Aguardando código...</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {isQrExpired 
                  ? "Código expirado. Gere um novo código para continuar."
                  : webhookResponse?.message || "Informe este código no seu WhatsApp para conectar."
                }
              </p>
            </div>}


          <DialogFooter>
            <Button variant="outline" onClick={handleCloseConnectionDialog}>
              {t("common.cancel")}
            </Button>
            {selectedInstance?.status === "connected" && <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("instances.saving")}
                  </> : t("instances.saveChanges")}
              </Button>}
            {selectedInstance?.status !== "connected" && connectionStep === "qr" && (
              <Button 
                variant={isQrExpired ? "default" : "outline"} 
                onClick={async () => {
                  try {
                    await triggerConnectionWebhook("qr");
                  } catch {
                    // Error handled
                  }
                }} 
                disabled={isConnecting}
              >
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("instances.generateNewQR")}
              </Button>
            )}
            {selectedInstance?.status !== "connected" && connectionStep === "code" && (
              <Button 
                variant={isQrExpired ? "default" : "outline"} 
                onClick={async () => {
                  try {
                    await triggerConnectionWebhook("phone");
                  } catch {
                    // Error handled
                  }
                }} 
                disabled={isConnecting}
              >
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Novo Código
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Instance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("instances.addNewInstance")}</DialogTitle>
            <DialogDescription>
              {t("instances.connectNewInstance")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">{t("instances.instanceName")}</Label>
              <Input id="instanceName" placeholder={t("instances.instanceNamePlaceholder")} value={newInstance.name} onChange={e => setNewInstance(prev => ({
              ...prev,
              name: e.target.value
            }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">{t("instances.provider")}</Label>
              <Select value={newInstance.provider} onValueChange={value => setNewInstance(prev => ({
              ...prev,
              provider: value as Instance["provider"]
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                  <SelectItem value="Meta Business API">Meta Business API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newInstance.provider === "Z-API" && <div className="space-y-2">
                <Label htmlFor="newPhoneNumber">
                  {t("instances.phoneNumber")}
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({t("instances.optional")})
                  </span>
                </Label>
                <Input id="newPhoneNumber" placeholder="+55 (11) 99999-9999" value={newInstance.phoneNumber} onChange={e => setNewInstance(prev => ({
              ...prev,
              phoneNumber: formatPhoneNumber(e.target.value)
            }))} />
                <p className="text-xs text-muted-foreground">
                  {t("instances.phoneNumberHint")}
                </p>
              </div>}
            <div className="space-y-2">
              <Label>{t("instances.function")}</Label>
              <Select value={newInstance.function} onValueChange={(value: InstanceFunction) => setNewInstance(prev => ({
              ...prev,
              function: value
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectFunction")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispatcher">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionDispatcher")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionDispatcherDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionAdmin")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionAdminDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="spy">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionSpy")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionSpyDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="funnel">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionFunnel")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionFunnelDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddInstance} disabled={isSaving}>
              {isSaving ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("instances.adding")}
                </> : <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("instances.addInstance")}
                </>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instance Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("instances.editInstance")}</DialogTitle>
            <DialogDescription>
              {t("instances.editInstanceDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editInstanceName">{t("instances.instanceName")}</Label>
              <Input id="editInstanceName" placeholder={t("instances.instanceNamePlaceholder")} value={editInstance?.name || ""} onChange={e => setEditInstance(prev => prev ? {
              ...prev,
              name: e.target.value
            } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editProvider">{t("instances.provider")}</Label>
              <Select value={editInstance?.provider || "Z-API"} onValueChange={value => setEditInstance(prev => prev ? {
              ...prev,
              provider: value as Instance["provider"]
            } : null)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectProvider")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z-API">Z-API</SelectItem>
                  <SelectItem value="Evolution API">Evolution API</SelectItem>
                  <SelectItem value="Meta Business API">Meta Business API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editInstance?.provider === "Z-API" && <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">
                  {t("instances.phoneNumber")} ({t("instances.optional")})
                </Label>
                <Input id="editPhoneNumber" placeholder="+55 (11) 99999-9999" value={editInstance?.phoneNumber || ""} onChange={e => setEditInstance(prev => prev ? {
              ...prev,
              phoneNumber: formatPhoneNumber(e.target.value)
            } : null)} />
                <p className="text-xs text-muted-foreground">{t("instances.phoneNumberHint")}</p>
              </div>}
            <div className="space-y-2">
              <Label>{t("instances.function")}</Label>
              <Select value={editInstance?.function || "dispatcher"} onValueChange={(value: InstanceFunction) => setEditInstance(prev => prev ? {
              ...prev,
              function: value
            } : null)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("instances.selectFunction")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispatcher">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionDispatcher")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionDispatcherDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionAdmin")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionAdminDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="spy">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionSpy")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionSpyDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="funnel">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{t("instances.functionFunnel")}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{t("instances.functionFunnelDesc")}</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("instances.saving")}
                </> : t("instances.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("instances.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("instances.deleteConfirmDescription")}
              {instanceToDelete && <span className="block mt-2 font-medium text-foreground">
                  {instanceToDelete.name} ({instanceToDelete.provider})
                </span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInstanceToDelete(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInstance} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}