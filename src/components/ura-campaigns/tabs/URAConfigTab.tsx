import { useState, useRef } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { useURACampaigns } from "@/hooks/useURACampaigns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Music, Volume2, Save, Trash2, FileAudio, Bot, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface URAConfigTabProps {
  campaign: URACampaign;
  onUpdate: (params: { id: string; updates: Partial<URACampaign> }) => Promise<URACampaign>;
}

export function URAConfigTab({ campaign, onUpdate }: URAConfigTabProps) {
  const { toast } = useToast();
  const { uploadAudio, isUploadingAudio } = useURACampaigns();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [serviceId, setServiceId] = useState(campaign.serviceId?.toString() || "");
  const [regraRenitenciaId, setRegraRenitenciaId] = useState(campaign.regraRenitenciaId?.toString() || "");
  const [costCenterName, setCostCenterName] = useState(campaign.costCenterName || "");
  const [agressividade, setAgressividade] = useState(campaign.agressividade);
  const [limiteCanaisAtivos, setLimiteCanaisAtivos] = useState(campaign.limiteCanaisAtivos);
  const [limiteCanais, setLimiteCanais] = useState(campaign.limiteCanais);
  const [audioType, setAudioType] = useState<URACampaign["audioType"]>(campaign.audioType);
  const [audioValue, setAudioValue] = useState(campaign.audioValue || "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [smsFallback, setSmsFallback] = useState(!!campaign.smsMessage);
  const [smsMessage, setSmsMessage] = useState(campaign.smsMessage || "");
  const [smsRule, setSmsRule] = useState(campaign.smsRule || "no_answer");

  const hasMosCampaign = !!campaign.mosCampaignId;

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validFormats = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];
    if (!validFormats.includes(file.type)) {
      toast({ title: "Formato invalido", description: "Apenas MP3 ou WAV sao permitidos.", variant: "destructive" });
      return;
    }

    // Progress simulation while the real upload happens
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 85 ? 85 : prev + 10));
    }, 200);

    try {
      await uploadAudio({ campaignId: campaign.id, file });
      clearInterval(interval);
      setUploadProgress(100);
      const audioName = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
      setAudioValue(audioName);
      setTimeout(() => setUploadProgress(0), 1200);
    } catch (err) {
      clearInterval(interval);
      setUploadProgress(0);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate({
        id: campaign.id,
        updates: {
          name,
          description: description || null,
          serviceId: serviceId ? parseInt(serviceId) : null,
          regraRenitenciaId: regraRenitenciaId ? parseInt(regraRenitenciaId) : null,
          costCenterName: costCenterName || null,
          agressividade,
          limiteCanaisAtivos,
          limiteCanais,
          audioType,
          audioValue: audioValue || null,
          smsMessage: smsFallback ? smsMessage : null,
          smsRule: smsFallback ? smsRule : null,
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* MOS BR Sync Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
        hasMosCampaign
          ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/8 border-amber-500/20 text-amber-600 dark:text-amber-400"
      }`}>
        {hasMosCampaign ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Campanha sincronizada na MOS BR — ID #{campaign.mosCampaignId}. Toda alteracao salva sera sincronizada automaticamente.</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Campanha nao sincronizada com a MOS BR ainda. Salve as configuracoes para criar a campanha la.</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Config */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Configuracoes Gerais</CardTitle>
              <CardDescription>Parametros de execucao enviados diretamente para a MOS BR ao salvar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Nome da Campanha</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Descricao</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="serviceId">ID do Servico (MOS BR)</Label>
                  <Input id="serviceId" type="number" value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="Ex: 504" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regraId">ID Regra de Renitencia</Label>
                  <Input id="regraId" type="number" value={regraRenitenciaId} onChange={(e) => setRegraRenitenciaId(e.target.value)} placeholder="Ex: 12" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="costCenter">Centro de Custo</Label>
                  <Input id="costCenter" value={costCenterName} onChange={(e) => setCostCenterName(e.target.value)} placeholder="Ex: MARKETING" />
                </div>
              </div>

              {/* Performance Sliders */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Agressividade (Fator Multiplicador)</Label>
                    <span className="font-mono text-sm font-bold">{agressividade}x</span>
                  </div>
                  <Slider value={[agressividade]} min={1} max={10} step={1} onValueChange={([v]) => setAgressividade(v)} />
                  <p className="text-xs text-muted-foreground">Multiplicador de chamadas simultaneas por canal livre.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Limite Canais Ativos</Label>
                      <span className="font-mono text-sm font-bold">{limiteCanaisAtivos === 0 ? "Ilimitado" : limiteCanaisAtivos}</span>
                    </div>
                    <Slider value={[limiteCanaisAtivos]} min={0} max={100} step={5} onValueChange={([v]) => setLimiteCanaisAtivos(v)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Limite Canais Globais</Label>
                      <span className="font-mono text-sm font-bold">{limiteCanais === 0 ? "Ilimitado" : limiteCanais}</span>
                    </div>
                    <Slider value={[limiteCanais]} min={0} max={200} step={5} onValueChange={([v]) => setLimiteCanais(v)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Fallback */}
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Transbordo para SMS</CardTitle>
                <CardDescription>Envie um SMS automatico caso a ligacao nao seja atendida.</CardDescription>
              </div>
              <Switch checked={smsFallback} onCheckedChange={setSmsFallback} />
            </CardHeader>
            {smsFallback && (
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Regra de Disparo do SMS</Label>
                  <Select value={smsRule} onValueChange={setSmsRule}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_answer">Nao Atendeu</SelectItem>
                      <SelectItem value="busy">Ocupado</SelectItem>
                      <SelectItem value="failed">Falha Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smsMessage">Mensagem de SMS</Label>
                  <Textarea id="smsMessage" value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} placeholder="Ola! Tentamos falar com voce..." rows={3} />
                  <p className="text-right text-xs text-muted-foreground">{smsMessage.length} chars</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column: Audio */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Audio da URA</CardTitle>
              <CardDescription>
                O audio enviado sera registrado na MOS BR em{" "}
                <code className="text-xs bg-muted px-1 rounded">POST /api/v2/tvoz/audio/</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <RadioGroup
                value={audioType}
                onValueChange={(v: any) => { setAudioType(v); setAudioValue(""); }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: "audio", label: "Arquivo", icon: Music },
                  { value: "tts", label: "TTS", icon: Volume2 },
                  { value: "ura", label: "URA", icon: Bot },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = audioType === item.value;
                  return (
                    <Label
                      key={item.value}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer text-center gap-1.5 transition-all ${
                        selected ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <RadioGroupItem value={item.value} className="sr-only" />
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </Label>
                  );
                })}
              </RadioGroup>

              {audioType === "audio" && (
                <div className="space-y-3">
                  <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav" onChange={handleAudioUpload} className="hidden" />
                  {audioValue ? (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-sm font-mono truncate">{audioValue}</span>
                        <Badge variant="outline" className="shrink-0 text-xs bg-emerald-50 border-emerald-200 text-emerald-700">MOS BR</Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setAudioValue("")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 border-dashed border-2 flex flex-col gap-2 rounded-xl"
                      disabled={isUploadingAudio}
                    >
                      {isUploadingAudio && uploadProgress > 0 ? (
                        <>
                          <div className="h-2 w-2/3 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">Enviando para MOS BR... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">Upload MP3 / WAV</span>
                          <span className="text-xs text-muted-foreground/60">Sera registrado na MOS BR via API</span>
                        </>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    O arquivo e enviado para <code className="bg-muted px-1 rounded">POST /api/v2/tvoz/audio/</code> e o nome e salvo na campanha.
                  </p>
                </div>
              )}

              {audioType === "tts" && (
                <div className="space-y-2">
                  <Label htmlFor="tts-text">Texto para Voz (TTS)</Label>
                  <Textarea id="tts-text" placeholder="Digite a mensagem que sera convertida em voz..." value={audioValue} onChange={(e) => setAudioValue(e.target.value)} rows={4} />
                  <p className="text-xs text-muted-foreground">Utiliza a voz padrao da MOS BR. Campo <code className="bg-muted px-0.5 rounded">tts</code> no payload.</p>
                </div>
              )}

              {audioType === "ura" && (
                <div className="space-y-2">
                  <Label htmlFor="ura-name">Nome do Fluxo de URA (MOS BR)</Label>
                  <Input id="ura-name" placeholder="Ex: URA_ATENDIMENTO" value={audioValue} onChange={(e) => setAudioValue(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Nome identificador da URA cadastrada na plataforma MOS BR. Campo <code className="bg-muted px-0.5 rounded">ura</code> no payload.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Footer */}
      <div className="flex justify-between items-center p-4 border border-border bg-card rounded-xl shadow-sm gap-2">
        <p className="text-xs text-muted-foreground">
          Ao salvar, a campanha e automaticamente criada/atualizada na MOS BR via <code className="bg-muted px-1 rounded">POST /api/v2/tvoz/campaigns/</code>
        </p>
        <Button onClick={handleSave} disabled={loading || !name.trim()} className="h-10 gap-2 shrink-0">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Salvando e Sincronizando..." : "Salvar Alteracoes"}
        </Button>
      </div>
    </div>
  );
}
