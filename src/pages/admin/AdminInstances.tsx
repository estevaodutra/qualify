import { useState } from "react";
import { useAdminInstances, AdminInstance } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Copy, Eye, EyeOff, RefreshCw, Smartphone, List, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      <button onClick={() => setRevealed(r => !r)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title={revealed ? "Ocultar" : "Revelar"}>
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
      <button onClick={() => copyToClipboard(value, "Token")} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Copiar token">
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function AdminInstances() {
  const { data: instances = [], isLoading, refetch } = useAdminInstances();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Provider instances modal
  const [providerInstances, setProviderInstances] = useState<any[]>([]);
  const [isListingAll, setIsListingAll] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerTotal, setProviderTotal] = useState(0);

  const filtered = instances.filter((inst: AdminInstance) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      inst.name.toLowerCase().includes(q) ||
      inst.phone.toLowerCase().includes(q) ||
      inst.company_name.toLowerCase().includes(q) ||
      (inst.external_instance_id || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleListAll = async () => {
    setIsListingAll(true);
    try {
      let allInstances: any[] = [];
      let page = 1;
      let totalPages = 1;
      let totalItems = 0;

      do {
        const { data: proxyResult, error } = await (supabase as any).functions.invoke("webhook-proxy", {
          body: { url: WEBHOOK_URL, payload: { action: "instance.list_all", page } },
        });
        if (error) throw error;
        if (!proxyResult?.success) throw new Error(proxyResult?.body || "Erro no webhook");

        const parsed = JSON.parse(proxyResult.body);
        const result = Array.isArray(parsed) ? parsed[0] : parsed;
        allInstances = [...allInstances, ...(result.content || [])];
        totalPages = result.totalPage || 1;
        totalItems = result.total || allInstances.length;
        page++;
      } while (page <= totalPages);

      setProviderInstances(allInstances);
      setProviderTotal(totalItems);
      setShowProviderModal(true);
    } catch (e: any) {
      toast({ title: "Erro ao listar instâncias", description: e.message, variant: "destructive" });
    } finally {
      setIsListingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            Instâncias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Todas as conexões WhatsApp da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleListAll} disabled={isListingAll}>
            {isListingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <List className="h-4 w-4 mr-2" />}
            {isListingAll ? "Buscando..." : "Listar Todas Instâncias"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
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
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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

      {/* Tabela banco */}
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
                <th className="px-4 py-3 text-left">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                ? <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhuma instância encontrada.</td></tr>
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
                              <button onClick={() => copyToClipboard(inst.external_instance_id, "Instance ID")} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Copiar Instance ID">
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3"><MaskedToken value={inst.external_instance_token} /></td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs font-medium border ${s.className}`}>{s.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inst.provider}</td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal — instâncias do provedor (Z-API) */}
      <Dialog open={showProviderModal} onOpenChange={setShowProviderModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Instâncias no Provedor
              <Badge variant="secondary" className="ml-2">{providerTotal} total</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto flex-1 -mx-1 px-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-background text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Token</th>
                  <th className="px-3 py-2 text-left">Conectado</th>
                  <th className="px-3 py-2 text-left">Pagamento</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-left">Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {providerInstances.map((inst, i) => {
                  const isConnected = inst.phoneConnected && inst.whatsappConnected;
                  const isPaid = inst.paymentStatus === "PAID";
                  const dueDate = inst.due ? new Date(inst.due) : null;
                  return (
                    <tr key={inst.id || i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium max-w-[160px] truncate" title={inst.name}>{inst.name}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs truncate max-w-[100px]" title={inst.id}>{inst.id}</span>
                          <button onClick={() => copyToClipboard(inst.id, "ID")} className="text-muted-foreground hover:text-foreground flex-shrink-0"><Copy className="h-3 w-3" /></button>
                        </div>
                      </td>
                      <td className="px-3 py-2"><MaskedToken value={inst.token} /></td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs border ${isConnected ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                          {isConnected ? "Ativo" : "Offline"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs border ${isPaid ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}`}>
                          {isPaid ? "PAGO" : "PENDENTE"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[140px]" title={inst.tenant}>{inst.tenant || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
