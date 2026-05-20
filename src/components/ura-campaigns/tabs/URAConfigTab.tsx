import { useState } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, AudioLines, Sparkles, MessageSquare, PhoneCall, HelpCircle } from "lucide-react";

interface URAConfigTabProps {
  campaign: URACampaign;
  onUpdate: (params: { id: string; updates: Partial<URACampaign> }) => Promise<URACampaign>;
}

export function URAConfigTab({ campaign, onUpdate }: URAConfigTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form states
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [serviceId, setServiceId] = useState(campaign.serviceId || "");
  const [regraRenitenciaId, setRegraRenitenciaId] = useState(campaign.regraRenitenciaId || "");
  const [costCenterName, setCostCenterName] = useState(campaign.costCenterName || "");
  const [dataTermino, setDataTermino] = useState(campaign.dataTermino ? campaign.dataTermino.substring(0, 16) : "");
  
  const [agressividade, setAgressividade] = useState([campaign.agressividade || 1]);
  const [limiteCanaisAtivos, setLimiteCanaisAtivos] = useState(campaign.limiteCanaisAtivos || 0);
  const [limiteCanais, setLimiteCanais] = useState(campaign.limiteCanais || 0);
  
  const [audioType, setAudioType] = useState<"audio" | "tts" | "ura">(campaign.audioType || "audio");
  const [audioValue, setAudioValue] = useState(campaign.audioValue || "");

  // SMS follow up states
  const [hasSMS, setHasSMS] = useState(!!campaign.smsMessage);
  const [smsMessage, setSmsMessage] = useState(campaign.smsMessage || "");
  const [smsServiceId, setSmsServiceId] = useState(campaign.smsServiceId || "");
  const [smsRule, setSmsRule] = useState(campaign.smsRule || "no_answer");

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size and format
    const validExtensions = ["mp3", "wav"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExtensions.includes(ext)) {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos MP3 e WAV são suportados.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    // Simulate upload to MOS BR /tvoz/audio/
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setAudioValue(file.name);
        toast({
          title: "Áudio enviado com sucesso!",
          description: Arquivo '' foi registrado na plataforma MOS BR.,
        });
      }, 300);
    }, 1500);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate({
        id: campaign.id,
        updates: {
          name,
          description: description || null,
          serviceId: serviceId ? Number(serviceId) : null,
          regraRenitenciaId: regraRenitenciaId ? Number(regraRenitenciaId) : null,
          costCenterName: costCenterName || null,
          dataTermino: dataTermino ? new Date(dataTermino).toISOString() : null,
          agressividade: agressividade[0],
          limiteCanaisAtivos,
          limiteCanais,
          audioType,
          audioValue,
          smsMessage: hasSMS ? smsMessage : null,
          smsServiceId: hasSMS && smsServiceId ? Number(smsServiceId) : null,
          smsRule: hasSMS ? smsRule : null,
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Col 1 & 2: General & Audio Configurations */}
      <div className="lg:col-span-2 space-y-6">
        {/* General Config */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Configurações Básicas
            </CardTitle>
            <CardDescription>Parâmetros gerais de identificação e regras de telefonia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="costCenter">Centro de Custo (Opcional)</Label>
                <Input id="costCenter" placeholder="Ex: MKT_2026" value={costCenterName} onChange={(e) => setCostCenterName(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Descrição da Campanha</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  ID do Serviço (MOS BR)
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" title="ID do serviço de telefonia cadastrado no MOS BR" />
                </Label>
                <Input type="number" placeholder="Ex: 101" value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>ID Regra Renitência</Label>
                <Input type="number" placeholder="Ex: 5" value={regraRenitenciaId} onChange={(e) => setRegraRenitenciaId(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Data de Término</Label>
                <Input type="datetime-local" value={dataTermino} onChange={(e) => setDataTermino(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audio Content Configuration */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AudioLines className="h-4 w-4 text-primary" />
              Conteúdo Interativo da URA
            </CardTitle>
            <CardDescription>Configure o áudio de destino que será tocado ao atender a ligação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={audioType} onValueChange={(v) => { setAudioType(v as any); setAudioValue(""); }} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="audio" id="type-audio" className="peer sr-only" />
                <Label
                  htmlFor="type-audio"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Upload className="mb-2 h-5 w-5 text-muted-foreground peer-data-[state=checked]:text-primary" />
                  <span className="font-semibold text-xs">Upload de Áudio</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="tts" id="type-tts" className="peer sr-only" />
                <Label
                  htmlFor="type-tts"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sparkles className="mb-2 h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-xs">Texto para Voz (TTS)</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="ura" id="type-ura" className="peer sr-only" />
                <Label
                  htmlFor="type-ura"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Bot className="mb-2 h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-xs">URA do Sistema</span>
                </Label>
              </div>
            </RadioGroup>

            {/* Render conditional inputs */}
            {audioType === "audio" && (
              <div className="space-y-4">
                <Label>Enviar Arquivo de Áudio (MP3 ou WAV)</Label>
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center bg-muted/20 relative">
                  <input
                    type="file"
                    accept=".mp3,.wav"
                    onChange={handleAudioUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {uploading ? Enviando arquivo... % : "Arraste ou clique para fazer upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">MP3 ou WAV de até 10MB</p>
                </div>

                {audioValue && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg p-3 text-sm flex items-center justify-between">
                    <span className="font-medium">Arquivo ativo: {audioValue}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-emerald-700 font-semibold" onClick={() => setAudioValue("")}>
                      Remover
                    </Button>
                  </div>
                )}
              </div>
            )}

            {audioType === "tts" && (
              <div className="grid gap-2">
                <Label htmlFor="tts-text">Texto para Voz (TTS)</Label>
                <Textarea
                  id="tts-text"
                  placeholder="Escreva a mensagem de voz. Ex: Olá! Identificamos que você possui uma fatura pendente. Pressione 1 para falar com um atendente..."
                  value={audioValue}
                  onChange={(e) => setAudioValue(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">O texto escrito acima será sintetizado em voz pelo robô do MOS BR.</p>
              </div>
            )}

            {audioType === "ura" && (
              <div className="grid gap-2">
                <Label htmlFor="ura-name">Nome da URA Cadastrada</Label>
                <Input
                  id="ura-name"
                  placeholder="Ex: ura_cobranca_v1"
                  value={audioValue}
                  onChange={(e) => setAudioValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Digite o identificador exato da URA configurada no painel do MOS BR.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Col 3: Channel Limits and SMS Follow up */}
      <div className="space-y-6">
        {/* Performance & Dialing limits */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Parâmetros de Discagem</CardTitle>
            <CardDescription>Defina os limites de conexões e velocidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Agressividade da Discagem</Label>
                <span className="font-semibold text-primary">{agressividade[0]}x</span>
              </div>
              <Slider
                value={agressividade}
                onValueChange={setAgressividade}
                max={10}
                min={1}
                step={1}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">
                Fator de multiplicação de chamadas simultâneas por canal ativo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Limite Canais Ativos</Label>
                <Input type="number" value={limiteCanaisAtivos} onChange={(e) => setLimiteCanaisAtivos(Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>Canais Totais</Label>
                <Input type="number" value={limiteCanais} onChange={(e) => setLimiteCanais(Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Follow-Up */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Transbordo para SMS
              </CardTitle>
              <CardDescription>Enviar SMS se a ligação falhar.</CardDescription>
            </div>
            <Switch checked={hasSMS} onCheckedChange={setHasSMS} />
          </CardHeader>
          {hasSMS && (
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Regra de Envio</Label>
                <Select value={smsRule} onValueChange={setSmsRule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_answer">Se não atender</SelectItem>
                    <SelectItem value="busy">Se ocupado</SelectItem>
                    <SelectItem value="always">Sempre (após encerrar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>ID do Serviço SMS</Label>
                <Input type="number" placeholder="Ex: 202" value={smsServiceId} onChange={(e) => setSmsServiceId(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Mensagem do SMS</Label>
                <Textarea
                  placeholder="Escreva o texto do SMS (Máx 160 caracteres)"
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  maxLength={160}
                  rows={3}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={loading || !name.trim() || !audioValue}
          className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95"
        >
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
