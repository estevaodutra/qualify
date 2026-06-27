import { useState, useEffect, useRef } from "react";
import { GroupCampaign } from "@/hooks/useGroupCampaigns";
import { useInstances } from "@/hooks/useInstances";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Copy, RefreshCw, Upload, Link2, Trash2, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ConfigTabProps {
  campaign: GroupCampaign;
  onUpdate: (id: string, updates: Partial<GroupCampaign>) => Promise<void>;
}

export function ConfigTab({ campaign, onUpdate }: ConfigTabProps) {
  const { toast } = useToast();
  const { instances } = useInstances();
  const { upload, isUploading, progress, acceptedTypes } = useMediaUpload("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedInstances = instances.filter((i) => i.status === "connected");

  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncingGroups, setIsSyncingGroups] = useState(false);
  const [formData, setFormData] = useState({
    name: campaign.name,
    instanceId: campaign.instanceId || "",
    instanceIds: (campaign.config?.instance_ids as string[]) || [],
    instanceLock: (campaign.config?.instance_lock as boolean) ?? true,
    groupName: campaign.groupName || "",
    groupDescription: campaign.groupDescription || "",
    messagePermission: campaign.messagePermission,
    editPermission: campaign.editPermission,
  });

  // Sync formData when campaign prop changes
  useEffect(() => {
    setFormData({
      name: campaign.name,
      instanceId: campaign.instanceId || "",
      instanceIds: (campaign.config?.instance_ids as string[]) || [],
      instanceLock: (campaign.config?.instance_lock as boolean) ?? true,
      groupName: campaign.groupName || "",
      groupDescription: campaign.groupDescription || "",
      messagePermission: campaign.messagePermission,
      editPermission: campaign.editPermission,
    });
  }, [campaign.id, campaign.instanceId, campaign.name, campaign.groupName,
      campaign.groupDescription, campaign.messagePermission, campaign.editPermission,
      campaign.config]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(campaign.id, {
        name: formData.name,
        instanceId: formData.instanceLock ? (formData.instanceId || undefined) : undefined,
        config: {
          ...campaign.config,
          instance_ids: formData.instanceIds,
          instance_lock: formData.instanceLock,
        },
        groupName: formData.groupName || undefined,
        groupDescription: formData.groupDescription || undefined,
        messagePermission: formData.messagePermission,
        editPermission: formData.editPermission,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyInviteLink = () => {
    if (campaign.inviteLink) {
      navigator.clipboard.writeText(campaign.inviteLink);
      toast({ title: "Link copiado!", description: "Link de convite copiado para a área de transferência." });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result?.url) {
      await onUpdate(campaign.id, { groupPhotoUrl: result.url });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpdateGroups = async () => {
    setIsSyncingGroups(true);
    try {
      const response = await fetch("https://qualify.6ksfuf.easypanel.host/functions/v1/schedule-group-updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ campaign_id: campaign.id })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erro ao agendar atualização");
      }
      
      toast({
        title: "Atualização Agendada",
        description: `${result.count} grupos serão atualizados em segundo plano (1 a cada 3 minutos).`,
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncingGroups(false);
    }
  };

  const handleRemovePhoto = async () => {
    await onUpdate(campaign.id, { groupPhotoUrl: "" });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Configure o nome da campanha e a instância do WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Pool de instâncias */}
          <div className="space-y-2">
            <Label>Pool de Instâncias WhatsApp</Label>
            <p className="text-xs text-muted-foreground">
              Selecione as instâncias que participarão desta campanha. As instâncias secundárias servirão para blindagem e administração do grupo (capa, título, descrição, etc).
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 border rounded-md p-2">
              {instances.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 px-1">Nenhuma instância disponível.</p>
              ) : instances.map((inst) => {
                const isConnected = inst.status === "connected";
                return (
                  <label
                    key={inst.id}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={formData.instanceIds.includes(inst.id)}
                      onCheckedChange={(checked) => {
                        setFormData(f => ({
                          ...f,
                          instanceIds: checked
                            ? [...f.instanceIds, inst.id]
                            : f.instanceIds.filter(id => id !== inst.id),
                          instanceId: !checked && f.instanceId === inst.id ? "" : f.instanceId,
                        }));
                      }}
                    />
                    <span className="text-sm flex-1">{inst.name}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isConnected
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {isConnected ? "Conectada" : "Desconectada"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Toggle de restrição — só aparece com 2+ instâncias no pool */}
          {formData.instanceIds.length > 1 && (
            <div className="flex items-center justify-between p-3 rounded-md border bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
                  Envio aleatório balanceado
                </p>
                <p className="text-xs text-muted-foreground">
                  Ativado: qualquer instância do pool envia. Desativado: apenas a instância específica.
                </p>
              </div>
              <Switch
                checked={!formData.instanceLock}
                onCheckedChange={(v) =>
                  setFormData(f => ({ ...f, instanceLock: !v, instanceId: v ? "" : f.instanceId }))
                }
              />
            </div>
          )}

          {/* Select da instância específica */}
          {formData.instanceLock && formData.instanceIds.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <Label>Instância Principal de Envio</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Somente esta instância será utilizada para mandar mensagens e enviar conteúdos. As demais instâncias do pool atuarão apenas como administradoras.
              </p>
              <Select
                value={formData.instanceId}
                onValueChange={(v) => setFormData({ ...formData, instanceId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância exclusiva" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances
                    .filter(i => formData.instanceIds.includes(i.id))
                    .map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Informações do Grupo</CardTitle>
            <CardDescription>
              Configure o nome, descrição e foto do grupo no WhatsApp.
            </CardDescription>
          </div>
          <Button onClick={handleUpdateGroups} disabled={isSyncingGroups} variant="outline" size="sm">
            {isSyncingGroups ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Atualizar Grupos
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Nome do Grupo</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              placeholder="Nome que aparecerá no WhatsApp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupDescription">Descrição do Grupo</Label>
            <Textarea
              id="groupDescription"
              value={formData.groupDescription}
              onChange={(e) => setFormData({ ...formData, groupDescription: e.target.value })}
              placeholder="Descrição que aparecerá no grupo..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto do Grupo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {campaign.groupPhotoUrl ? (
                  <img
                    src={campaign.groupPhotoUrl}
                    alt="Foto do grupo"
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? "Enviando..." : "Upload Foto"}
                </Button>
                {campaign.groupPhotoUrl && (
                  <Button variant="ghost" size="sm" onClick={handleRemovePhoto}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            {isUploading && <Progress value={progress} className="h-1" />}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões do Grupo</CardTitle>
          <CardDescription>
            Defina quem pode enviar mensagens e editar informações do grupo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Quem pode enviar mensagens</Label>
              <Select
                value={formData.messagePermission}
                onValueChange={(v) => setFormData({ ...formData, messagePermission: v as "all" | "admins" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os participantes</SelectItem>
                  <SelectItem value="admins">Apenas administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quem pode editar informações</Label>
              <Select
                value={formData.editPermission}
                onValueChange={(v) => setFormData({ ...formData, editPermission: v as "all" | "admins" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os participantes</SelectItem>
                  <SelectItem value="admins">Apenas administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Link */}
      <Card>
        <CardHeader>
          <CardTitle>Link de Convite</CardTitle>
          <CardDescription>
            Gere e gerencie o link de convite do grupo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={campaign.inviteLink || "Nenhum link gerado"}
              readOnly
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyInviteLink}
              disabled={!campaign.inviteLink}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O link de convite será gerado quando o grupo for criado no WhatsApp.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
