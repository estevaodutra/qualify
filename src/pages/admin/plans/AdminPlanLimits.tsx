import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { billingStore } from "@/services/billing/billingStore";
import { PlanLimit, LimitType } from "@/services/billing/types";
import {
  Gauge,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ShieldCheck,
  Edit2,
  Trash2,
  Smartphone,
} from "lucide-react";

export default function AdminPlanLimits() {
  const { toast } = useToast();
  const [limits, setLimits] = useState<PlanLimit[]>(() => billingStore.getLimits());
  const [isSaving, setIsSaving] = useState(false);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<Partial<PlanLimit> | null>(null);

  // WhatsApp quick selector
  const whatsappLimit = limits.find((l) => l.resource_key === "whatsapp_connections");

  const handleUpdateWhatsApp = (value: string) => {
    const updated = limits.map((l) => {
      if (l.resource_key === "whatsapp_connections") {
        if (value === "unlimited") {
          return { ...l, limit_type: "unlimited" as LimitType, limit_value: null };
        } else {
          return { ...l, limit_type: "fixed" as LimitType, limit_value: parseInt(value, 10) };
        }
      }
      return l;
    });
    setLimits(updated);
    billingStore.saveLimits(updated, "Super Admin");
    toast({
      title: "Limite de WhatsApp atualizado",
      description: `Definido para: ${value === "unlimited" ? "Ilimitado" : `${value} instâncias por empresa`}.`,
    });
  };

  const handleToggleActive = (id: string, active: boolean) => {
    const updated = limits.map((l) => (l.id === id ? { ...l, is_active: active } : l));
    setLimits(updated);
  };

  const handleOpenAdd = () => {
    setEditingLimit({
      id: "lim_" + Math.random().toString(36).substring(2, 9),
      plan_id: "plan_qualify_standard",
      resource_key: "",
      resource_name: "",
      limit_type: "unlimited",
      limit_value: null,
      unit: "unidades",
      description: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (limit: PlanLimit) => {
    setEditingLimit({ ...limit });
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!editingLimit?.resource_name || !editingLimit.resource_key) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o nome e o identificador do recurso.",
        variant: "destructive",
      });
      return;
    }

    const idx = limits.findIndex((l) => l.id === editingLimit.id);
    let updated: PlanLimit[];
    if (idx >= 0) {
      updated = [...limits];
      updated[idx] = editingLimit as PlanLimit;
    } else {
      updated = [...limits, editingLimit as PlanLimit];
    }

    setLimits(updated);
    billingStore.saveLimits(updated, "Super Admin");
    setIsModalOpen(false);
    toast({
      title: "Limite salvo com sucesso",
      description: `O recurso '${editingLimit.resource_name}' foi atualizado.`,
    });
  };

  const handleDeleteLimit = (id: string) => {
    const updated = limits.filter((l) => l.id !== id);
    setLimits(updated);
    billingStore.saveLimits(updated, "Super Admin");
    toast({
      title: "Limite removido",
      description: "O recurso foi removido da matriz de limites.",
    });
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      billingStore.saveLimits(limits, "Super Admin");
      toast({
        title: "Matriz de limites salva!",
        description: "Todos os limites foram persistidos com sucesso.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getLimitBadge = (limit: PlanLimit) => {
    switch (limit.limit_type) {
      case "unlimited":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">Ilimitado</Badge>;
      case "fixed":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300">{limit.limit_value} {limit.unit}</Badge>;
      case "credit_based":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 flex items-center gap-1"><Coins className="h-3 w-3" /> Por Crédito</Badge>;
      case "disabled":
        return <Badge variant="secondary" className="text-muted-foreground">Desativado</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Matriz de Limites</h1>
            <Badge variant="outline" className="text-xs">Motor de Entitlements</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os limites de recursos por empresa. Limites nunca são hardcodados no frontend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Limite
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Matriz"}
          </Button>
        </div>
      </div>

      {/* Destaque WhatsApp / Conexões */}
      <Card className="border-primary/40 bg-primary/[0.02] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Máximo de Contas WhatsApp Conectadas</CardTitle>
                <CardDescription className="text-xs">
                  O backend valida esta franquia antes de autorizar a geração de novo QRCode / conexão.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs font-semibold text-muted-foreground">Limite por Empresa:</Label>
              <Select
                value={
                  whatsappLimit?.limit_type === "unlimited"
                    ? "unlimited"
                    : String(whatsappLimit?.limit_value ?? 2)
                }
                onValueChange={handleUpdateWhatsApp}
              >
                <SelectTrigger className="w-36 h-9 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Instância</SelectItem>
                  <SelectItem value="2">2 Instâncias (Padrão)</SelectItem>
                  <SelectItem value="3">3 Instâncias</SelectItem>
                  <SelectItem value="5">5 Instâncias</SelectItem>
                  <SelectItem value="10">10 Instâncias</SelectItem>
                  <SelectItem value="unlimited">Ilimitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela de Limites */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recursos e Tipos de Franquia</CardTitle>
          <CardDescription className="text-xs">
            Tipos disponíveis: Ilimitado (unlimited), Franquia Fixa (fixed), Baseado em Créditos (credit_based) ou Desativado (disabled).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[280px]">Recurso</TableHead>
                <TableHead>Chave (Key)</TableHead>
                <TableHead>Tipo de Limite</TableHead>
                <TableHead>Valor / Unidade</TableHead>
                <TableHead>Ativo?</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limits.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-foreground">
                    <div>
                      <span>{l.resource_name}</span>
                      {l.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{l.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{l.resource_key}</TableCell>
                  <TableCell>{getLimitBadge(l)}</TableCell>
                  <TableCell className="text-xs">
                    {l.limit_type === "fixed" ? `${l.limit_value} ${l.unit}` : l.limit_type === "unlimited" ? "Sem limite" : l.limit_type === "credit_based" ? "Conforme saldo" : "Bloqueado"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={l.is_active}
                      onCheckedChange={(checked) => handleToggleActive(l.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(l)} className="h-8 w-8 p-0">
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLimit(l.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição de Limite */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingLimit?.resource_name ? `Editar: ${editingLimit.resource_name}` : "Novo Limite de Recurso"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure as regras de entitulamento que serão verificadas pelo EntitlementService no backend.
            </DialogDescription>
          </DialogHeader>

          {editingLimit && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Recurso</Label>
                <Input
                  value={editingLimit.resource_name || ""}
                  onChange={(e) => setEditingLimit({ ...editingLimit, resource_name: e.target.value })}
                  placeholder="Ex: Disparos de Campanha"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Chave do Recurso (Key)</Label>
                <Input
                  value={editingLimit.resource_key || ""}
                  onChange={(e) => setEditingLimit({ ...editingLimit, resource_key: e.target.value })}
                  placeholder="Ex: campaign_dispatches"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Limite</Label>
                  <Select
                    value={editingLimit.limit_type || "unlimited"}
                    onValueChange={(val: LimitType) => setEditingLimit({ ...editingLimit, limit_type: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlimited">Ilimitado (unlimited)</SelectItem>
                      <SelectItem value="fixed">Franquia Fixa (fixed)</SelectItem>
                      <SelectItem value="credit_based">Por Créditos (credit_based)</SelectItem>
                      <SelectItem value="disabled">Desativado (disabled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingLimit.limit_type === "fixed" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor do Limite</Label>
                    <Input
                      type="number"
                      value={editingLimit.limit_value ?? ""}
                      onChange={(e) =>
                        setEditingLimit({
                          ...editingLimit,
                          limit_value: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      placeholder="Ex: 5"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Unidade de Medida</Label>
                <Input
                  value={editingLimit.unit || ""}
                  onChange={(e) => setEditingLimit({ ...editingLimit, unit: e.target.value })}
                  placeholder="Ex: mensagens, instâncias, minutos"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição Operacional</Label>
                <Input
                  value={editingLimit.description || ""}
                  onChange={(e) => setEditingLimit({ ...editingLimit, description: e.target.value })}
                  placeholder="Como esta franquia funciona na prática..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveModal}>Salvar Limite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
