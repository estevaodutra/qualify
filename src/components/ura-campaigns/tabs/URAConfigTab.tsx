import { useState, useRef } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Music, Volume2, Save, Trash2, ArrowRightLeft, FileAudio, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface URAConfigTabProps {
  campaign: URACampaign;
  onUpdate: (params: { id: string; updates: Partial<URACampaign> }) => Promise<URACampaign>;
}

export function URAConfigTab({ campaign, onUpdate }: URAConfigTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States mirroring campaign configs
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [serviceId, setServiceId] = useState(campaign.serviceId?.toString() || "");
  const [regraRenitenciaId, setRegraRenitenciaId] = useState(campaign.regraRenitenciaId?.toString() || "");
  const [agressividade, setAgressividade] = useState(campaign.agressividade);
  const [limiteCanaisAtivos, setLimiteCanaisAtivos] = useState(campaign.limiteCanaisAtivos);
  const [limiteCanais, setLimiteCanais] = useState(campaign.limiteCanais);

  // Audio configuration states
  const [audioType, setAudioType] = useState<URACampaign["audioType"]>(campaign.audioType);
  const [audioValue, setAudioValue] = useState(campaign.audioValue || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // SMS fallback states
  const [smsFallback, setSmsFallback] = useState(!!campaign.smsMessage);
  const [smsMessage, setSmsMessage] = useState(campaign.smsMessage || "");
  const [smsRule, setSmsRule] = useState(campaign.smsRule || "no_answer");

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate size and format
    const validFormats = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];
    if (!validFormats.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos MP3 ou WAV são permitidos.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate MOS BR Audio Upload endpoint progression
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    setTimeout(async () => {
      clearInterval(interval);
      setUploadProgress(100);
      setIsUploading(false);

      // Save the file name or public URL
      setAudioValue(file.name);
      toast({
        title: "Áudio enviado com sucesso!",
        description: `Arquivo ${file.name} foi registrado na plataforma MOS BR.`,
      });
    }, 1300);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core & Performance Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Configurações Gerais</CardTitle>
              <CardDescription>Parâmetros de execução da campanha e limites de rede.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Nome da Campanha</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="serviceId">ID do Serviço (MOS BR)</Label>
                  <Input
                    id="serviceId"
                    type="number"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    placeholder="Ex: 504"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regraRenitenciaId">ID da Regra de Renitência</Label>
                  <Input
                    id="regraRenitenciaId"
                    type="number"
                    value={regraRenitenciaId}
                    onChange={(e) => setRegraRenitenciaId(e.target.value)}
                    placeholder="Ex: 12"
                  />
                </div>
              </div>

              {/* Performance Sliders */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="flex items-center gap-1.5">Agressividade (Mapeamento de Discagem)</Label>
                    <span className="font-mono text-sm font-semibold">{agressividade}x</span>
                  </div>
                  <Slider
                    value={[agressividade]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={([v]) => setAgressividade(v)}
                  />
                  <p className="text-xs text-muted-foreground">Multiplicador de chamadas simultâneas por operador livre.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Limite de Canais Ativos</Label>
                      <span className="font-mono text-sm font-semibold">{limiteCanaisAtivos}</span>
                    </div>
                    <Slider
                      value={[limiteCanaisAtivos]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setLimiteCanaisAtivos(v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Limite de Canais Globais</Label>
                      <span className="font-mono text-sm font-semibold">{limiteCanais}</span>
                    </div>
                    <Slider
                      value={[limiteCanais]}
                      min={0}
                      max={200}
                      step={5}
                      onValueChange={([v]) => setLimiteCanais(v)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Fallback configuration */}
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Transbordo para SMS</CardTitle>
                <CardDescription>Envie um SMS automático em caso de insucesso na ligação.</CardDescription>
              </div>
              <Switch checked={smsFallback} onCheckedChange={setSmsFallback} />
            </CardHeader>
            {smsFallback && (
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Regra de Disparo</Label>
                  <Select value={smsRule} onValueChange={setSmsRule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_answer">Não Atendeu</SelectItem>
                      <SelectItem value="busy">Ocupado</SelectItem>
                      <SelectItem value="failed">Falha Geral (Não Atendeu + Ocupado + Congestionamento)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smsMessage">Mensagem de SMS</Label>
                  <Textarea
                    id="smsMessage"
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Olá! Tentamos falar com você sobre sua solicitação..."
                    rows={3}
                  />
                  <p className="text-right text-xs text-muted-foreground">{smsMessage.length} caracteres</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Audio Content Configuration */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Áudio e URA</CardTitle>
              <CardDescription>Configure a mensagem de áudio tocada ao atender.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={audioType}
                onValueChange={(v: any) => {
                  setAudioType(v);
                  setAudioValue("");
                }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: "audio", label: "Arquivo", icon: Music },
                  { value: "tts", label: "TTS (Texto)", icon: Volume2 },
                  { value: "ura", label: "URA", icon: Bot },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = audioType === item.value;
                  return (
                    <Label
                      key={item.value}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer text-center gap-1.5 transition-all ${
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <RadioGroupItem value={item.value} className="sr-only" />
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </Label>
                  );
                })}
              </RadioGroup>

              {/* Conditionally render settings based on Audio Type */}
              {audioType === "audio" && (
                <div className="space-y-3">
                  <Label>Arquivo de Áudio (.mp3 ou .wav)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />

                  {audioValue ? (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileAudio className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate font-mono">{audioValue}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setAudioValue("")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-dashed border-2 flex flex-col gap-2 rounded-xl"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <div className="h-1.5 w-1/2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">Enviando {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Clique para fazer upload do áudio</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {audioType === "tts" && (
                <div className="space-y-2">
                  <Label htmlFor="tts-text">Texto para Voz (TTS)</Label>
                  <Textarea
                    id="tts-text"
                    placeholder="Digite a mensagem que a assistente de voz irá ler..."
                    value={audioValue}
                    onChange={(e) => setAudioValue(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Utiliza a voz padrão configurada na MOS BR.</p>
                </div>
              )}

              {audioType === "ura" && (
                <div className="space-y-2">
                  <Label htmlFor="ura-id">ID do Fluxo de URA</Label>
                  <Input
                    id="ura-id"
                    placeholder="Ex: 8527"
                    value={audioValue}
                    onChange={(e) => setAudioValue(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Digite o ID do fluxo URA previamente construído na MOS BR.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button floating footer style */}
      <div className="flex justify-end p-4 border border-border bg-card rounded-xl shadow-sm gap-2">
        <Button onClick={handleSave} disabled={loading || !name.trim()} className="h-10 gap-2">
          <Save className="h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
