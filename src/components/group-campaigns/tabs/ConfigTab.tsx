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
import { Loader2, Copy, RefreshCw, Upload, Link2, Trash2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    name: campaign.name,
    instanceId: campaign.instanceId || "",
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
      groupName: campaign.groupName || "",
      groupDescription: campaign.groupDescription || "",
      messagePermission: campaign.messagePermission,
      editPermission: campaign.editPermission,
    });
  }, [campaign.id, campaign.instanceId, campaign.name, campaign.groupName, 
      campaign.groupDescription, campaign.messagePermission, campaign.editPermission]);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(campaign.id, {
        name: formData.name,
        instanceId: formData.instanceId || undefined,
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Campanha</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance">Instância WhatsApp</Label>
              <Select
                value={formData.instanceId}
                onValueChange={(v) => setFormData({ ...formData, instanceId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Grupo</CardTitle>
          <CardDescription>
            Configure o nome, descrição e foto do grupo no WhatsApp.
          </CardDescription>
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
