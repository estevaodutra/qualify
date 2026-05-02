import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Plus, Trash2,
  MessageSquare, Clock, Image, Video, Music, FileText,
  MousePointerClick, List,
} from "lucide-react";

interface LocalNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
}

interface DispatchNodeConfigPanelProps {
  node: LocalNode;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

const NODE_TITLES: Record<string, { title: string; icon: React.ElementType }> = {
  message: { title: "Texto", icon: MessageSquare },
  image: { title: "Imagem", icon: Image },
  video: { title: "Vídeo", icon: Video },
  audio: { title: "Áudio", icon: Music },
  document: { title: "Documento", icon: FileText },
  buttons: { title: "Botões", icon: MousePointerClick },
  list: { title: "Lista", icon: List },
  delay: { title: "Delay", icon: Clock },
};

const QUICK_DELAYS = [
  { label: "15 min", minutes: 15, hours: 0, days: 0 },
  { label: "30 min", minutes: 30, hours: 0, days: 0 },
  { label: "1 hora", minutes: 0, hours: 1, days: 0 },
  { label: "2 horas", minutes: 0, hours: 2, days: 0 },
  { label: "1 dia", minutes: 0, hours: 0, days: 1 },
  { label: "2 dias", minutes: 0, hours: 0, days: 2 },
];

export function DispatchNodeConfigPanel({ node, onUpdate, onClose }: DispatchNodeConfigPanelProps) {
  const nodeInfo = NODE_TITLES[node.nodeType] || NODE_TITLES.message;
  const Icon = nodeInfo.icon;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ ...node.config, [key]: value });
  };

  return (
    <Card className="w-80 shrink-0 flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <CardTitle className="text-sm">{nodeInfo.title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4">
          {/* TEXT */}
          {node.nodeType === "message" && (
            <>
              <div className="space-y-2">
                <Label>Conteúdo da Mensagem</Label>
                <Textarea
                  placeholder="Digite a mensagem..."
                  value={(node.config.content as string) || ""}
                  onChange={e => updateConfig("content", e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                </p>
              </div>
              {node.config.content && (
                <div>
                  <Label className="text-sm text-muted-foreground">Prévia:</Label>
                  <div className="mt-2 p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                    {String(node.config.content)
                      .replace("{nome}", "João")
                      .replace("{telefone}", "+55 11 99999-9999")
                      .replace("{email}", "joao@email.com")}
                  </div>
                </div>
              )}
            </>
          )}

          {/* IMAGE / VIDEO / AUDIO / DOCUMENT */}
          {(node.nodeType === "image" || node.nodeType === "video" || node.nodeType === "audio" || node.nodeType === "document") && (
            <>
              <div className="space-y-2">
                <Label>URL da Mídia</Label>
                <Input
                  placeholder={`https://exemplo.com/arquivo.${node.nodeType === "image" ? "jpg" : node.nodeType === "video" ? "mp4" : node.nodeType === "audio" ? "ogg" : "pdf"}`}
                  value={(node.config.url as string) || ""}
                  onChange={e => updateConfig("url", e.target.value)}
                />
              </div>
              {node.nodeType === "document" && (
                <div className="space-y-2">
                  <Label>Nome do Arquivo</Label>
                  <Input
                    placeholder="documento.pdf"
                    value={(node.config.filename as string) || ""}
                    onChange={e => updateConfig("filename", e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Legenda / Mensagem</Label>
                <Textarea
                  placeholder="Texto que acompanha a mídia..."
                  value={(node.config.caption as string) || ""}
                  onChange={e => updateConfig("caption", e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                </p>
              </div>
            </>
          )}

          {/* BUTTONS */}
          {node.nodeType === "buttons" && (
            <>
              <div className="space-y-2">
                <Label>Texto da Mensagem</Label>
                <Textarea
                  placeholder="Texto exibido acima dos botões..."
                  value={(node.config.text as string) || ""}
                  onChange={e => updateConfig("text", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Botões (até 3)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => {
                      const buttons = [...((node.config.buttons as { id: string; label: string }[]) || [])];
                      if (buttons.length < 3) {
                        buttons.push({ id: String(buttons.length + 1), label: "" });
                        updateConfig("buttons", buttons);
                      }
                    }}
                    disabled={((node.config.buttons as unknown[]) || []).length >= 3}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {((node.config.buttons as { id: string; label: string }[]) || []).map((btn, i) => (
                  <div key={i} className="flex gap-1">
                    <Input
                      placeholder={`Botão ${i + 1}`}
                      value={btn.label}
                      onChange={e => {
                        const buttons = [...((node.config.buttons as { id: string; label: string }[]) || [])];
                        buttons[i] = { ...buttons[i], label: e.target.value };
                        updateConfig("buttons", buttons);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        const buttons = ((node.config.buttons as { id: string; label: string }[]) || []).filter((_, idx) => idx !== i);
                        updateConfig("buttons", buttons);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* LIST */}
          {node.nodeType === "list" && (
            <>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Título da lista"
                  value={(node.config.title as string) || ""}
                  onChange={e => updateConfig("title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input
                  placeholder="Selecionar"
                  value={(node.config.buttonText as string) || "Selecionar"}
                  onChange={e => updateConfig("buttonText", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Corpo da Mensagem</Label>
                <Textarea
                  placeholder="Texto exibido antes da lista..."
                  value={(node.config.body as string) || ""}
                  onChange={e => updateConfig("body", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* DELAY */}
          {node.nodeType === "delay" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Dias</Label>
                  <Input
                    type="number"
                    min={0}
                    value={(node.config.days as number) || 0}
                    onChange={e => updateConfig("days", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horas</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={(node.config.hours as number) || 0}
                    onChange={e => updateConfig("hours", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minutos</Label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={(node.config.minutes as number) || 0}
                    onChange={e => updateConfig("minutes", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Atalhos rápidos:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_DELAYS.map(qd => (
                    <Button
                      key={qd.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ ...node.config, minutes: qd.minutes, hours: qd.hours, days: qd.days });
                      }}
                    >
                      {qd.label}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ℹ️ O sistema aguardará este tempo antes de enviar a próxima mensagem da sequência.
              </p>
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
