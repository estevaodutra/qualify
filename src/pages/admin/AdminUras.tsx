import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PhoneCall, Trash2, CheckCircle2, Play, AlertCircle, XCircle, RefreshCw, Download, Copy, ExternalLink, Settings } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface UraSetupRequest {
  id: string;
  company_id: string;
  workflow_id: string | null;
  node_id: string;
  requested_by: string | null;
  reviewed_by: string | null;
  status: 'pending_admin_setup' | 'in_setup' | 'approved' | 'rejected' | 'needs_adjustment' | 'cancelled';
  ura_name: string;
  ura_mode: 'simple' | 'reverse';
  audio_type: 'audio' | 'tts' | 'mos_ura';
  audio_value: string | null;
  audio_file_url: string | null;
  audio_file_name: string | null;
  dtmf_actions: any[];
  attempts_config: any;
  mos_campaign_id: string | null;
  mos_ura_id: string | null;
  mos_campaign_name: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  companies?: { name: string } | null;
  message_sequences?: { name: string } | null;
}

export default function AdminUras() {
  const [requests, setRequests] = useState<UraSetupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<UraSetupRequest | null>(null);
  
  // Review form states
  const [reviewAction, setReviewAction] = useState<"approve" | "needs_adjustment" | "reject" | null>(null);
  const [mosCampaignId, setMosCampaignId] = useState("");
  const [mosUraId, setMosUraId] = useState("");
  const [mosCampaignName, setMosCampaignName] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ura_setup_requests")
        .select(`
          *,
          companies ( name ),
          message_sequences ( name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data || []) as any);
    } catch (err: any) {
      toast.error(`Erro ao carregar solicitações: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusBadge = (status: UraSetupRequest['status']) => {
    switch (status) {
      case "pending_admin_setup":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Pendente</Badge>;
      case "in_setup":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Em Configuração</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Aprovada</Badge>;
      case "needs_adjustment":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Ajuste Solicitado</Badge>;
      case "rejected":
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">Rejeitada</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200">Cancelada</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{status}</Badge>;
    }
  };

  const handleStartSetup = async (req: UraSetupRequest) => {
    try {
      // 1. Update request status to in_setup
      const { error: reqError } = await supabase
        .from("ura_setup_requests")
        .update({ status: "in_setup" })
        .eq("id", req.id);

      if (reqError) throw reqError;

      // 2. Update status in the workflow node config
      const { data: nodeData, error: nodeFetchError } = await supabase
        .from("sequence_nodes")
        .select("config")
        .eq("id", req.node_id)
        .single();

      if (!nodeFetchError && nodeData) {
        const currentConfig = nodeData.config || {};
        const updatedConfig = {
          ...currentConfig,
          approval: {
            ...(currentConfig.approval || {}),
            status: "in_setup"
          }
        };

        await supabase
          .from("sequence_nodes")
          .update({ config: updatedConfig })
          .eq("id", req.node_id);
      }

      toast.success("Solicitação marcada como 'Em Configuração'!");
      fetchRequests();
      if (selectedRequest?.id === req.id) {
        setSelectedRequest({ ...req, status: "in_setup" });
      }
    } catch (err: any) {
      toast.error(`Erro ao iniciar configuração: ${err.message}`);
    }
  };

  const handleOpenReview = (action: "approve" | "needs_adjustment" | "reject") => {
    setReviewAction(action);
    setMosCampaignId(selectedRequest?.mos_campaign_id || "");
    setMosUraId(selectedRequest?.mos_ura_id || "");
    setMosCampaignName(selectedRequest?.mos_campaign_name || selectedRequest?.ura_name || "");
    setAdminNotes(selectedRequest?.admin_notes || "");
    setRejectionReason(selectedRequest?.rejection_reason || "");
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (reviewAction === "approve" && !mosCampaignId.trim()) {
      toast.error("ID da Campanha MOS BR é obrigatório para aprovação.");
      return;
    }
    if (reviewAction === "needs_adjustment" && !adminNotes.trim()) {
      toast.error("Por favor, descreva as notas de ajuste solicitadas.");
      return;
    }
    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const newStatus = reviewAction === "approve" ? "approved" : (reviewAction === "needs_adjustment" ? "needs_adjustment" : "rejected");
      
      // 1. Update URA Setup Request status and metadata
      const requestPayload: any = {
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };

      if (newStatus === "approved") {
        requestPayload.mos_campaign_id = mosCampaignId;
        requestPayload.mos_ura_id = mosUraId || null;
        requestPayload.mos_campaign_name = mosCampaignName || null;
        requestPayload.admin_notes = adminNotes || null;
        requestPayload.approved_at = new Date().toISOString();
      } else if (newStatus === "needs_adjustment") {
        requestPayload.admin_notes = adminNotes;
      } else if (newStatus === "rejected") {
        requestPayload.rejection_reason = rejectionReason;
      }

      const { error: reqError } = await supabase
        .from("ura_setup_requests")
        .update(requestPayload)
        .eq("id", selectedRequest.id);

      if (reqError) throw reqError;

      // 2. Update corresponding node configuration in workflow builder
      const { data: nodeData, error: nodeFetchError } = await supabase
        .from("sequence_nodes")
        .select("config")
        .eq("id", selectedRequest.node_id)
        .single();

      if (nodeFetchError) throw nodeFetchError;

      const currentConfig = nodeData.config || {};
      const updatedConfig = {
        ...currentConfig,
        approval: {
          ...(currentConfig.approval || {}),
          status: newStatus,
          requestId: selectedRequest.id,
          reviewedAt: new Date().toISOString(),
          reviewedBy: user.id,
          adminNotes: newStatus === "needs_adjustment" ? adminNotes : (currentConfig.approval?.adminNotes || ""),
          rejectionReason: newStatus === "rejected" ? rejectionReason : (currentConfig.approval?.rejectionReason || "")
        },
        mos: {
          mosCampaignId: newStatus === "approved" ? mosCampaignId : (currentConfig.mos?.mosCampaignId || null),
          mosUraId: newStatus === "approved" ? (mosUraId || null) : (currentConfig.mos?.mosUraId || null),
          mosCampaignName: newStatus === "approved" ? (mosCampaignName || "") : (currentConfig.mos?.mosCampaignName || ""),
          configuredManually: true
        }
      };

      const { error: nodeUpdateError } = await supabase
        .from("sequence_nodes")
        .update({ config: updatedConfig })
        .eq("id", selectedRequest.node_id);

      if (nodeUpdateError) throw nodeUpdateError;

      toast.success(`URA revisada com sucesso! Status: ${newStatus}`);
      setReviewAction(null);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(`Erro ao salvar revisão: ${err.message}`);
    }
  };

  const copyTtsText = (text: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Texto TTS copiado para a área de transferência!");
  };

  const copyDtmfMap = (req: UraSetupRequest) => {
    const actions = req.dtmf_actions || [];
    let mapText = `URA: ${req.ura_name}\n`;
    actions.forEach((act: any) => {
      mapText += `Tecla ${act.digit}: ${act.label || `Digitação ${act.digit}`}\n`;
    });
    navigator.clipboard.writeText(mapText);
    toast.success("Mapa de DTMF copiado com sucesso!");
  };

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.ura_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.companies?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.message_sequences?.name || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Solicitações de URA</h1>
          <p className="text-muted-foreground">Revise os parâmetros, configure na MOS BR e libere as solicitações enviadas pelos usuários</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchRequests} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por URA, empresa ou workflow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar por Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-background text-xs">
              <SelectValue placeholder="Status..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending_admin_setup">Pendentes</SelectItem>
              <SelectItem value="in_setup">Em Configuração</SelectItem>
              <SelectItem value="approved">Aprovadas</SelectItem>
              <SelectItem value="needs_adjustment">Ajuste Solicitado</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">Empresa</TableHead>
                <TableHead className="font-semibold text-slate-600">Workflow</TableHead>
                <TableHead className="font-semibold text-slate-600">Nome da URA</TableHead>
                <TableHead className="font-semibold text-slate-600">Tipo de Áudio</TableHead>
                <TableHead className="font-semibold text-slate-600">Status</TableHead>
                <TableHead className="font-semibold text-slate-600">Solicitado em</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-12">
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-700">
                      {r.companies?.name || "Empresa desconhecida"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {r.message_sequences?.name || "Sem workflow"}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">
                      {r.ura_name}
                    </TableCell>
                    <TableCell className="text-xs uppercase font-mono">
                      {r.audio_type === "tts" ? "TTS (Texto)" : (r.audio_type === "audio" ? "Áudio Upload" : "URA Configurada")}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(r.status)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {format(new Date(r.requested_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(r)} className="rounded-lg text-xs font-semibold">
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Detail & Action Drawer/Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(v) => { if (!v) setSelectedRequest(null); }}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[85vh] overflow-y-auto">
          {selectedRequest && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-600 text-white shadow-sm">
                      <PhoneCall className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-800">Detalhes da URA: {selectedRequest.ura_name}</DialogTitle>
                      <p className="text-xs text-muted-foreground">{selectedRequest.companies?.name} • Workflow: {selectedRequest.message_sequences?.name}</p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* 1. URA Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Modo de Operação</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedRequest.ura_mode === "reverse" ? "URA Reversa / Interativa" : "URA Simples (Discador)"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Entrada de Áudio</span>
                    <span className="text-xs font-semibold text-slate-700 uppercase font-mono">{selectedRequest.audio_type}</span>
                  </div>
                </div>

                {/* 2. Audio Value Display */}
                {selectedRequest.audio_type === "tts" && (
                  <div className="p-4 border rounded-xl bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Texto para Conversão de Voz (TTS)</span>
                      <Button variant="ghost" size="sm" onClick={() => copyTtsText(selectedRequest.audio_value)} className="h-6 gap-1 text-[10px]">
                        <Copy className="h-3 w-3" /> Copiar Texto
                      </Button>
                    </div>
                    <Textarea readOnly value={selectedRequest.audio_value || ""} className="bg-slate-50/50 border-slate-100 rounded-xl text-xs" rows={3} />
                  </div>
                )}

                {selectedRequest.audio_type === "audio" && (
                  <div className="p-4 border rounded-xl bg-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Arquivo de Áudio Carregado</span>
                      <span className="text-xs font-semibold text-slate-700">{selectedRequest.audio_file_name || "audio.mp3"}</span>
                    </div>
                    {selectedRequest.audio_file_url && (
                      <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs gap-1.5 h-8">
                        <a href={selectedRequest.audio_file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" /> Baixar Áudio
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {selectedRequest.audio_type === "mos_ura" && (
                  <div className="p-4 border rounded-xl bg-white">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Identificador de URA Pré-configurada</span>
                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">{selectedRequest.audio_value}</span>
                  </div>
                )}

                {/* 3. DTMF Action Map */}
                <div className="p-4 border rounded-xl bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mapa de Digitações de Teclas (DTMF)</span>
                    <Button variant="ghost" size="sm" onClick={() => copyDtmfMap(selectedRequest)} className="h-6 gap-1 text-[10px]">
                      <Copy className="h-3 w-3" /> Copiar Mapa DTMF
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                    {(selectedRequest.dtmf_actions || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhuma tecla DTMF configurada.</p>
                    ) : (
                      selectedRequest.dtmf_actions.map((act: any) => (
                        <div key={act.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                          <span className="font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Tecla {act.digit}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {act.label || `Ação ${act.digit}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Attempts/Retries configuration */}
                <div className="p-4 border rounded-xl bg-white space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Configuração de Retentativas</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-slate-50/50 rounded-lg">
                      <span className="text-[9px] text-slate-400 block">Ativo</span>
                      <span className="font-semibold">{selectedRequest.attempts_config?.enabled ? "Sim" : "Não"}</span>
                    </div>
                    <div className="p-2 bg-slate-50/50 rounded-lg">
                      <span className="text-[9px] text-slate-400 block">Tentativas</span>
                      <span className="font-semibold">{selectedRequest.attempts_config?.maxAttempts || 1}</span>
                    </div>
                    <div className="p-2 bg-slate-50/50 rounded-lg">
                      <span className="text-[9px] text-slate-400 block">Intervalo</span>
                      <span className="font-semibold">{Math.round((selectedRequest.attempts_config?.retryDelayMs || 0) / 60000)}m</span>
                    </div>
                  </div>
                </div>

                {/* Status messages / Notes */}
                {selectedRequest.admin_notes && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notas do Administrador</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{selectedRequest.admin_notes}</p>
                  </div>
                )}
                {selectedRequest.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800">
                    <span className="text-[10px] font-bold text-rose-400 uppercase block mb-1">Motivo da Rejeição</span>
                    <p className="leading-relaxed font-semibold">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {/* Review Forms */}
                {reviewAction === "approve" && (
                  <form onSubmit={submitReview} className="p-4 border border-emerald-200 bg-emerald-50/20 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-emerald-800 uppercase block border-b border-emerald-100 pb-1">Aprovação da URA</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="mosCampId" className="text-[10px] font-bold text-slate-500 uppercase">ID da Campanha MOS BR</Label>
                        <Input id="mosCampId" required value={mosCampaignId} onChange={(e) => setMosCampaignId(e.target.value)} placeholder="Ex: 51239" className="rounded-xl border-slate-200 font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mosUraId" className="text-[10px] font-bold text-slate-500 uppercase">ID da URA MOS BR (Opcional)</Label>
                        <Input id="mosUraId" value={mosUraId} onChange={(e) => setMosUraId(e.target.value)} placeholder="Ex: 92837" className="rounded-xl border-slate-200 font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mosCampName" className="text-[10px] font-bold text-slate-500 uppercase">Nome na Plataforma MOS BR</Label>
                      <Input id="mosCampName" value={mosCampaignName} onChange={(e) => setMosCampaignName(e.target.value)} placeholder="Ex: URA Vendas Qualify" className="rounded-xl border-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="adminNotes" className="text-[10px] font-bold text-slate-500 uppercase">Observações Internas (Opcional)</Label>
                      <Textarea id="adminNotes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notas adicionais" className="rounded-xl border-slate-200" rows={2} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setReviewAction(null)} className="rounded-xl text-xs">Cancelar</Button>
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold">Liberar URA</Button>
                    </div>
                  </form>
                )}

                {reviewAction === "needs_adjustment" && (
                  <form onSubmit={submitReview} className="p-4 border border-purple-200 bg-purple-50/20 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-purple-800 uppercase block border-b border-purple-100 pb-1">Solicitar Ajustes</span>
                    <div className="space-y-1">
                      <Label htmlFor="adjNotes" className="text-[10px] font-bold text-slate-500 uppercase">O que o usuário deve alterar?</Label>
                      <Textarea id="adjNotes" required value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Ex: O áudio enviado possui ruídos, favor subir outro. / Revisar opção de DTMF tecla 3 que está vazia." className="rounded-xl border-slate-200" rows={3} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setReviewAction(null)} className="rounded-xl text-xs">Cancelar</Button>
                      <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold">Solicitar Alteração</Button>
                    </div>
                  </form>
                )}

                {reviewAction === "reject" && (
                  <form onSubmit={submitReview} className="p-4 border border-rose-200 bg-rose-50/20 rounded-xl space-y-4">
                    <span className="text-xs font-bold text-rose-800 uppercase block border-b border-rose-100 pb-1">Rejeição da Solicitação</span>
                    <div className="space-y-1">
                      <Label htmlFor="rejReason" className="text-[10px] font-bold text-slate-500 uppercase">Motivo da Rejeição</Label>
                      <Textarea id="rejReason" required value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Descreva o motivo pelo qual esta solicitação não pode ser aprovada." className="rounded-xl border-slate-200" rows={3} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setReviewAction(null)} className="rounded-xl text-xs">Cancelar</Button>
                      <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold">Rejeitar Definitivamente</Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Main Dialog Controls */}
              {!reviewAction && selectedRequest.status !== "approved" && selectedRequest.status !== "rejected" && selectedRequest.status !== "cancelled" && (
                <DialogFooter className="border-t pt-4 mt-6 gap-2 flex-wrap">
                  {selectedRequest.status === "pending_admin_setup" && (
                    <Button type="button" onClick={() => handleStartSetup(selectedRequest)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold mr-auto">
                      Iniciar Configuração
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => handleOpenReview("needs_adjustment")} className="rounded-xl text-xs text-purple-700 border-purple-200 hover:bg-purple-50">
                    Solicitar Ajustes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleOpenReview("reject")} className="rounded-xl text-xs text-rose-600 border-rose-200 hover:bg-rose-50">
                    Rejeitar
                  </Button>
                  <Button type="button" onClick={() => handleOpenReview("approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold">
                    Aprovar e Liberar
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
