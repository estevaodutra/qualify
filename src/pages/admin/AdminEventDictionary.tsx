import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Zap, Users, Wifi, Phone, HelpCircle, Code, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const eventCategories = [
  {
    title: "Mensagens",
    icon: <MessageSquare className="h-5 w-4" />,
    events: [
      { id: "text_message", description: "Texto / extendedText / conversation" },
      { id: "image_message", description: "body.image, imageUrl, mimeType image/*" },
      { id: "video_message", description: "body.video, videoUrl, mimeType video/*" },
      { id: "audio_message", description: "body.audio, audioUrl, ptt, mimeType audio/*" },
      { id: "document_message", description: "documento, documentWithCaption" },
      { id: "sticker_message", description: "Stickers / figurinhas" },
      { id: "location_message", description: "Localização geográfica" },
      { id: "contact_message", description: "vcard / contactMessage" },
      { id: "message_status", description: "ACK (sent/delivered/read)" },
      { id: "message_reaction", description: "reactionMessage" },
      { id: "message_revoked", description: "message.revoked" },
    ],
  },
  {
    title: "Interativos",
    icon: <Zap className="h-5 w-4" />,
    events: [
      { id: "button_response", description: "Resposta de botões interativos" },
      { id: "list_response", description: "Resposta de listas de opções" },
      { id: "poll_message", description: "Criação de enquete (pollCreationMessage)" },
      { id: "poll_response", description: "Voto em enquete (body.pollVote)" },
      { id: "reaction", description: "Reação com emoji" },
    ],
  },
  {
    title: "Grupos",
    icon: <Users className="h-5 w-4" />,
    events: [
      { id: "group_join", description: "GROUP_PARTICIPANT_ADD / INVITE" },
      { id: "group_leave", description: "GROUP_PARTICIPANT_REMOVE / LEAVE" },
      { id: "group_promote", description: "GROUP_PARTICIPANT_PROMOTE (novo admin)" },
      { id: "group_demote", description: "GROUP_PARTICIPANT_DEMOTE (remove admin)" },
      { id: "group_update", description: "Alteração de nome, descrição ou ícone" },
    ],
  },
  {
    title: "Conexão",
    icon: <Wifi className="h-5 w-4" />,
    events: [
      { id: "connection_status", description: "Status de conexão (connected/disconnected)" },
      { id: "qrcode_update", description: "Atualização de QR Code para pareamento" },
      { id: "chat_presence", description: "on-chat-presence (digitando/online)" },
    ],
  },
  {
    title: "Chamadas",
    icon: <Phone className="h-5 w-4" />,
    events: [
      { id: "call_received", description: "Recebimento de chamada telefônica" },
    ],
  },
];

export default function AdminEventDictionary() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .eq("classification", "pending")
        .order("received_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setPendingEvents(data || []);
    } catch (err) {
      console.error("Error fetching pending events:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dicionário de Eventos</h2>
        <p className="text-muted-foreground">
          Mapeamento técnico de eventos reconhecidos pela plataforma por provedor.
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="providers">Mapeamento por Provedor</TabsTrigger>
          <TabsTrigger value="rules">Regras Especiais</TabsTrigger>
          <TabsTrigger value="pending" className="text-destructive">Reclassificação</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {eventCategories.map((category) => (
              <Card key={category.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {category.title}
                  </CardTitle>
                  {category.icon}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <ul className="space-y-2">
                      {category.events.map((event) => (
                        <li key={event.id} className="text-xs">
                          <Badge variant="outline" className="font-mono mr-2 mb-1">
                            {event.id}
                          </Badge>
                          <span className="text-muted-foreground">
                            {event.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive">
                  Pendentes
                </CardTitle>
                <HelpCircle className="h-5 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-2">
                  <Badge variant="destructive" className="font-mono">unknown</Badge>
                  <p className="text-muted-foreground">
                    Payloads sem regra correspondente. Ficam em status "pending" para análise e reclassificação manual.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Origem</CardTitle>
              <CardDescription>
                Como cada provedor identifica os eventos antes da classificação unificada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">Z-API</Badge> Classificado via 3 fontes:
                </h4>
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Fonte</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono text-xs">ZAPI_EVENT_MAP</TableCell>
                          <TableCell className="text-xs">
                            Nomes diretos de eventos. Ex: <code className="text-primary">poll.vote</code>, <code className="text-primary">message.ack</code>, <code className="text-primary">connection.update</code>.
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">MESSAGE_TYPE_MAP</TableCell>
                          <TableCell className="text-xs">
                            Tipos de mensagem detectados no objeto payload. Ex: <code className="text-primary">imageMessage</code>, <code className="text-primary">conversation</code>, <code className="text-primary">vcard</code>.
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">NOTIFICATION_MAP</TableCell>
                          <TableCell className="text-xs">
                            Notificações de sistema de grupo. Ex: <code className="text-primary">GROUP_PARTICIPANT_ADD</code>, <code className="text-primary">GROUP_CREATE</code>.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">Evolution & Meta</Badge>
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Ambos utilizam mapeamentos similares baseados nos campos <code className="text-primary">event</code> ou <code className="text-primary">changes.field</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Negócio do Classificador</CardTitle>
              <CardDescription>
                Prioridades e condições lógicas aplicadas no processamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Prioridade de Enquete (Poll Response)</p>
                    <p className="text-xs text-muted-foreground">
                      Tem prioridade máxima. Se o payload contiver <code className="text-primary">body.pollVote</code>, é classificado como <code className="text-primary">poll_response</code> independente de outras flags.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Filtro de Foto de Perfil</p>
                    <p className="text-xs text-muted-foreground">
                      Eventos com <code className="text-primary">body.photo</code> são ignorados pela regra de imagem, pois representam alteração de perfil e não envio de mídia no chat.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Detecção de Direção</p>
                    <p className="text-xs text-muted-foreground">
                      A direção (<code className="text-primary">inbound</code>, <code className="text-primary">outbound</code> ou <code className="text-primary">system</code>) é detectada automaticamente via flag <code className="text-primary">fromMe</code>.
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fila de Reclassificação</CardTitle>
                <CardDescription>
                  Eventos recentes marcados como 'unknown'. Use o payload bruto para criar novos mapeamentos.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPendingEvents}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead>Subtipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          {loading ? "Carregando..." : "Nenhum evento pendente de reclassificação."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-xs">
                            {format(new Date(event.received_at), "dd/MM/yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{event.source}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {event.event_subtype || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                console.log("Raw Event:", event.raw_event);
                                alert("O payload foi enviado para o console do navegador (F12) para inspeção.");
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver JSON
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
