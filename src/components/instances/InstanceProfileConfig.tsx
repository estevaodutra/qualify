import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/settings/ImageUpload";

export interface ProfileConfigData {
  autoUpdate: boolean;
  photoUrl: string;
  name: string;
  status: string;
  isBusiness: boolean;
  businessCategory: string;
  businessEmail: string;
  businessDescription: string;
  businessWebsite: string;
  businessAddress: string;
}

export const defaultProfileConfig: ProfileConfigData = {
  autoUpdate: true,
  photoUrl: "",
  name: "",
  status: "",
  isBusiness: false,
  businessCategory: "",
  businessEmail: "",
  businessDescription: "",
  businessWebsite: "",
  businessAddress: "",
};

interface InstanceProfileConfigProps {
  config: ProfileConfigData;
  onChange: (config: ProfileConfigData) => void;
}

export function InstanceProfileConfig({ config, onChange }: InstanceProfileConfigProps) {
  const handleChange = (field: keyof ProfileConfigData, value: string | boolean) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
        <div className="space-y-0.5">
          <Label className="text-base">Atualização Automática</Label>
          <p className="text-sm text-muted-foreground">
            Aplica este perfil automaticamente quando a instância conectar
          </p>
        </div>
        <Switch 
          checked={config.autoUpdate} 
          onCheckedChange={(c) => handleChange("autoUpdate", c)} 
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Informações Básicas</h4>
        <div className="space-y-4">
          <Label>Foto de Perfil</Label>
          <div className="flex items-center gap-6">
            <ImageUpload
              currentUrl={config.photoUrl}
              onUploadSuccess={(url) => handleChange("photoUrl", url)}
              type="profile"
              name={config.name || "Perfil"}
            />
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-muted-foreground">Ou insira o link da imagem diretamente</Label>
              <Input 
                placeholder="https://..." 
                value={config.photoUrl} 
                onChange={(e) => handleChange("photoUrl", e.target.value)} 
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Perfil</Label>
            <Input 
              placeholder="Nome da Empresa" 
              value={config.name} 
              onChange={(e) => handleChange("name", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Status / Recado</Label>
            <Input 
              placeholder="Atendimento das 8h às 18h" 
              value={config.status} 
              onChange={(e) => handleChange("status", e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Conta Comercial (Business)</Label>
            <p className="text-sm text-muted-foreground">
              Ative se este número for um WhatsApp Business
            </p>
          </div>
          <Switch 
            checked={config.isBusiness} 
            onCheckedChange={(c) => handleChange("isBusiness", c)} 
          />
        </div>

        {config.isBusiness && (
          <div className="grid grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input 
                placeholder="Ex: Consultoria, Varejo" 
                value={config.businessCategory} 
                onChange={(e) => handleChange("businessCategory", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                placeholder="contato@empresa.com" 
                value={config.businessEmail} 
                onChange={(e) => handleChange("businessEmail", e.target.value)} 
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descrição sobre os serviços ou produtos..." 
                value={config.businessDescription} 
                onChange={(e) => handleChange("businessDescription", e.target.value)} 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input 
                placeholder="https://empresa.com" 
                value={config.businessWebsite} 
                onChange={(e) => handleChange("businessWebsite", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input 
                placeholder="Rua Exemplo, 123" 
                value={config.businessAddress} 
                onChange={(e) => handleChange("businessAddress", e.target.value)} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
