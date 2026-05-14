import { useState } from "react";
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuizFunnel } from "@/hooks/useQuizFunnels";

interface Props {
  open: boolean;
  onClose: () => void;
  funnel: QuizFunnel;
  onSave: (field: "webhook_config" | "seo_config" | "pixel_config", value: Record<string, unknown>) => Promise<void>;
}

export function QuizSettingsDialog({ open, onClose, funnel, onSave }: Props) {
  const webhook = (funnel.webhookConfig as Record<string, string>) || {};
  const seo = (funnel.seoConfig as Record<string, string>) || {};
  const pixel = (funnel.pixelConfig as Record<string, string>) || {};

  const [webhookUrl, setWebhookUrl] = useState(webhook.url || "");
  const [webhookToken, setWebhookToken] = useState(webhook.token || "");
  const [webhookTrigger, setWebhookTrigger] = useState(webhook.trigger || "completion");

  const [seoTitle, setSeoTitle] = useState(seo.title || "");
  const [seoDescription, setSeoDescription] = useState(seo.description || "");
  const [seoOgImage, setSeoOgImage] = useState(seo.ogImage || "");

  const [gaId, setGaId] = useState(pixel.gaId || "");
  const [gtmId, setGtmId] = useState(pixel.gtmId || "");
  const [fbPixelId, setFbPixelId] = useState(pixel.fbPixelId || "");

  const [saving, setSaving] = useState(false);

  const handleSave = async (field: "webhook_config" | "seo_config" | "pixel_config", data: Record<string, unknown>) => {
    setSaving(true);
    await onSave(field, data);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurações do Funil
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="webhook">
          <TabsList className="w-full">
            <TabsTrigger value="webhook" className="flex-1">Webhook</TabsTrigger>
            <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
            <TabsTrigger value="pixel" className="flex-1">Pixel</TabsTrigger>
          </TabsList>

          {/* Webhook */}
          <TabsContent value="webhook" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>URL do endpoint</Label>
              <Input
                placeholder="https://seu-sistema.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bearer Token (opcional)</Label>
              <Input
                type="password"
                placeholder="seu-token-secreto"
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gatilho de envio</Label>
              <Select value={webhookTrigger} onValueChange={setWebhookTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion">Ao concluir o funil</SelectItem>
                  <SelectItem value="each_step">A cada etapa respondida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => handleSave("webhook_config", { url: webhookUrl, token: webhookToken, trigger: webhookTrigger })}
            >
              Salvar Webhook
            </Button>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Título da página</Label>
              <Input
                placeholder="Meu funil incrível"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (meta description)</Label>
              <Textarea
                placeholder="Descrição para SEO e compartilhamentos..."
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground text-right">{seoDescription.length}/160</p>
            </div>
            <div className="space-y-1.5">
              <Label>Imagem de compartilhamento (OG Image)</Label>
              <Input
                placeholder="https://..."
                value={seoOgImage}
                onChange={(e) => setSeoOgImage(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => handleSave("seo_config", { title: seoTitle, description: seoDescription, ogImage: seoOgImage })}
            >
              Salvar SEO
            </Button>
          </TabsContent>

          {/* Pixel */}
          <TabsContent value="pixel" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Google Analytics ID</Label>
              <Input
                placeholder="G-XXXXXXXXXX"
                value={gaId}
                onChange={(e) => setGaId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Google Tag Manager ID</Label>
              <Input
                placeholder="GTM-XXXXXXX"
                value={gtmId}
                onChange={(e) => setGtmId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Facebook Pixel ID</Label>
              <Input
                placeholder="123456789012345"
                value={fbPixelId}
                onChange={(e) => setFbPixelId(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => handleSave("pixel_config", { gaId, gtmId, fbPixelId })}
            >
              Salvar Pixels
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
