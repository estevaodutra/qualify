import { useState, useEffect } from "react";
import { PirateCampaign } from "@/hooks/usePirateCampaigns";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useDispatchSequences } from "@/hooks/useDispatchSequences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Link, Upload, User, ShoppingBag, CreditCard, Navigation, Loader2 } from "lucide-react";

interface PirateConfigTabProps {
  campaign: PirateCampaign;
  onUpdate: (id: string, updates: Partial<PirateCampaign>) => Promise<void>;
}

export function PirateConfigTab({ campaign, onUpdate }: PirateConfigTabProps) {
  const [captureLink, setCaptureLink] = useState(campaign.captureLink || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(campaign.profilePhotoUrl || "");
  const [profileName, setProfileName] = useState(campaign.profileName || "");
  const [profileDescription, setProfileDescription] = useState(campaign.profileDescription || "");
  const [profileStatus, setProfileStatus] = useState(campaign.profileStatus || "");
  const [offerText, setOfferText] = useState(campaign.offerText || "");
  const [paymentLink, setPaymentLink] = useState(campaign.paymentLink || "");
  const [destinationType, setDestinationType] = useState<"webhook" | "sequence">(campaign.destinationType || "webhook");
  const [webhookUrl, setWebhookUrl] = useState(campaign.webhookUrl || "");
  const [destinationCampaignId, setDestinationCampaignId] = useState(campaign.destinationCampaignId || "");
  const [destinationSequenceId, setDestinationSequenceId] = useState(campaign.destinationSequenceId || "");
  const [isSaving, setIsSaving] = useState(false);

  const { upload, isUploading, acceptedTypes } = useMediaUpload("image");
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { sequences: dispatchSequences } = useDispatchSequences(destinationCampaignId || undefined);

  useEffect(() => {
    setCaptureLink(campaign.captureLink || "");
    setProfilePhotoUrl(campaign.profilePhotoUrl || "");
    setProfileName(campaign.profileName || "");
    setProfileDescription(campaign.profileDescription || "");
    setProfileStatus(campaign.profileStatus || "");
    setOfferText(campaign.offerText || "");
    setPaymentLink(campaign.paymentLink || "");
    setDestinationType(campaign.destinationType || "webhook");
    setWebhookUrl(campaign.webhookUrl || "");
    setDestinationCampaignId(campaign.destinationCampaignId || "");
    setDestinationSequenceId(campaign.destinationSequenceId || "");
  }, [campaign]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result) setProfilePhotoUrl(result.url);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(campaign.id, {
        captureLink: captureLink || null,
        profilePhotoUrl: profilePhotoUrl || null,
        profileName: profileName || null,
        profileDescription: profileDescription || null,
        profileStatus: profileStatus || null,
        offerText: offerText || null,
        paymentLink: paymentLink || null,
        destinationType,
        webhookUrl: destinationType === "webhook" ? (webhookUrl || null) : campaign.webhookUrl,
        destinationCampaignId: destinationType === "sequence" ? (destinationCampaignId || null) : null,
        destinationSequenceId: destinationType === "sequence" ? (destinationSequenceId || null) : null,
      });
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Link de Captura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="h-4 w-4" />
            Link de Captura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label>URL do grupo (onde o lead será redirecionado)</Label>
          <Input
            value={captureLink}
            onChange={(e) => setCaptureLink(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profilePhotoUrl} />
              <AvatarFallback>{profileName?.charAt(0) || "P"}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isUploading}>
                  <span>
                    <Upload className="h-3 w-3 mr-1" />
                    {isUploading ? "Enviando..." : "Alterar foto"}
                  </span>
                </Button>
              </Label>
              <input
                id="photo-upload"
                type="file"
                accept={acceptedTypes}
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Nome do perfil" className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Input value={profileStatus} onChange={(e) => setProfileStatus(e.target.value)} placeholder="Status do perfil" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={profileDescription} onChange={(e) => setProfileDescription(e.target.value)} placeholder="Descrição do perfil" className="mt-1" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Oferta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Oferta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Texto da oferta</Label>
          <Textarea value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="Descreva a oferta..." className="mt-1" rows={4} />
        </CardContent>
      </Card>

      {/* Link de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Link de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label>URL de pagamento</Label>
          <Input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://pay.exemplo.com/..." className="mt-1" />
        </CardContent>
      </Card>

      {/* Destino */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-4 w-4" />
            Destino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de destino</Label>
            <Select value={destinationType} onValueChange={(v) => setDestinationType(v as "webhook" | "sequence")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="sequence">Sequência de Disparo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {destinationType === "webhook" && (
            <div>
              <Label>URL do Webhook</Label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          )}

          {destinationType === "sequence" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Campanha de Disparo</Label>
                <Select value={destinationCampaignId} onValueChange={(v) => { setDestinationCampaignId(v); setDestinationSequenceId(""); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dispatchCampaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sequência</Label>
                <Select value={destinationSequenceId} onValueChange={setDestinationSequenceId} disabled={!destinationCampaignId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dispatchSequences.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
