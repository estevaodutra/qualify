import React, { useState } from "react";
import { Check, Copy, MessageSquare, Image, Mic, Video, FileText, Smile, MapPin, User, BarChart2, Heart, Edit3, Trash2, ArrowRight, Users, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const WebhookDocs = () => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copiado!",
      description: "O código foi copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CodeBlock = ({ code, id, language = "JSON" }: { code: string; id: string; language?: string }) => (
    <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-800 my-4 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-400 font-semibold">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="text-slate-400 hover:text-white transition-colors p-1 flex items-center gap-1.5 text-xs"
          title="Copiar código"
        >
          {copiedId === id ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copiado</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-50 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Cabeçalho */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 py-1 font-semibold">
              API REST v2 Semântica
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Webhooks de Mensagem
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Endpoints semânticos dedicados para cada tipo de mensagem e evento de mensageria da Qualify.
            A própria rota da URL define a categoria, o tipo e a responsabilidade da ingestão.
          </p>
        </div>

        {/* Princípios e Contrato Base */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Contrato Base Raiz</h2>
          <p className="text-slate-600 leading-relaxed">
            Todos os endpoints de mensagem recebem um payload limpo com apenas <strong>dois campos raiz obrigatórios</strong>. 
            Campos redundantes como <code className="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded line-through">action</code>, <code className="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded line-through">provider</code>, <code className="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded line-through">type</code> e <code className="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded line-through">is_group</code> foram eliminados.
          </p>

          <CodeBlock
            id="base-contract"
            code={`{
  "instance_id": "session_uuid",
  "raw_event": {}
}`}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Conversa Privada (1x1)
              </h4>
              <p className="text-xs text-slate-600">
                Identificada automaticamente pela <strong>ausência</strong> de <code className="font-mono text-slate-700">group_id</code> no <code className="font-mono text-slate-700">raw_event</code>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Mensagem em Grupo
              </h4>
              <p className="text-xs text-slate-600">
                Identificada pela <strong>presença</strong> de <code className="font-mono text-slate-700">group_id</code> (ex: <code className="font-mono text-slate-700">120363...@g.us</code>) no <code className="font-mono text-slate-700">raw_event</code>.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO 1: MENSAGENS POR TIPO */}
        {/* ======================================================== */}
        <div className="space-y-8">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <MessageSquare className="h-6 w-6 text-indigo-600" />
              Mensagens por Tipo
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Envio de mensagens recebidas ou enviadas classificadas pelo tipo de conteúdo.
            </p>
          </div>

          {/* 1. Texto */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mensagem de Texto</h3>
                  <p className="text-xs text-slate-500">Conversas diretas ou mensagens em grupo de texto puro</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/text
              </Badge>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Exemplo: Texto Privado</h4>
              <CodeBlock
                id="msg-text-private"
                code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_3EB034E72F18BE445197B5",
    "timestamp": 1786814411,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "body": "Conteúdo da mensagem recebida!"
  }
}`}
              />

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-4">Exemplo: Texto em Grupo</h4>
              <CodeBlock
                id="msg-text-group"
                code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_120363425932296878@g.us_9A8B7C6D5E4F3G",
    "timestamp": 1786814500,
    "group_id": "120363425932296878@g.us",
    "group_name": "Equipe de Vendas VIP",
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "body": "Bom dia equipe! Vamos bater a meta!"
  }
}`}
              />
            </div>
          </div>

          {/* 2. Imagem */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <Image className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mensagem com Imagem</h3>
                  <p className="text-xs text-slate-500">Fotos e imagens com URL de mídia e legenda opcional</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/image
              </Badge>
            </div>

            <CodeBlock
              id="msg-image"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_8F9D7C2A3B4E1F",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "media_url": "https://storage/imagem.jpg",
    "caption": "Olha essa foto legal!"
  }
}`}
            />
          </div>

          {/* 3. Áudio / Voz */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mensagem de Áudio / Voz</h3>
                  <p className="text-xs text-slate-500">Áudios gravados ou arquivos de áudio enviados</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-1">
                  POST /webhooks/messages/audio
                </Badge>
                <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-1">
                  POST /webhooks/messages/voice
                </Badge>
              </div>
            </div>

            <CodeBlock
              id="msg-audio"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_90A1B2C3D4E5",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "media_url": "https://storage/audio.ogg",
    "mimetype": "audio/ogg"
  }
}`}
            />
          </div>

          {/* 4. Vídeo */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mensagem de Vídeo / Video Note</h3>
                  <p className="text-xs text-slate-500">Vídeos com legenda e arquivos de vídeo</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/video
              </Badge>
            </div>

            <CodeBlock
              id="msg-video"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_F1E2D3C4B5A6",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "media_url": "https://storage/video.mp4",
    "mimetype": "video/mp4",
    "caption": "Veja esse vídeo demonstrativo"
  }
}`}
            />
          </div>

          {/* 5. Documento */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-100 text-cyan-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Documento / Anexo</h3>
                  <p className="text-xs text-slate-500">PDFs, planilhas e documentos gerais</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/document
              </Badge>
            </div>

            <CodeBlock
              id="msg-document"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_A1B2C3D4E5F6",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "media_url": "https://storage/documento.pdf",
    "filename": "proposta_comercial.pdf",
    "mimetype": "application/pdf",
    "caption": "Segue a proposta comercial solicitada"
  }
}`}
            />
          </div>

          {/* 6. Sticker */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-600">
                  <Smile className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Figurinha / Sticker</h3>
                  <p className="text-xs text-slate-500">Stickers em formato WebP</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/sticker
              </Badge>
            </div>

            <CodeBlock
              id="msg-sticker"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_778899AABBCC",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "media_url": "https://storage/sticker.webp",
    "mimetype": "image/webp"
  }
}`}
            />
          </div>

          {/* 7. Localização */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 text-red-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Localização</h3>
                  <p className="text-xs text-slate-500">Coordenadas geográficas de localização compartilhada</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/location
              </Badge>
            </div>

            <CodeBlock
              id="msg-location"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_445566778899",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "latitude": -23.55052,
    "longitude": -46.633308,
    "name": "Sede Qualify",
    "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
  }
}`}
            />
          </div>

          {/* 8. Contato */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Contato / Cartão de Visita</h3>
                  <p className="text-xs text-slate-500">VCard ou dados de contato compartilhado</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/contact
              </Badge>
            </div>

            <CodeBlock
              id="msg-contact"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_112233445566",
    "timestamp": 1786814450,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "contact_name": "Dr. João Silva",
    "contact_phone": "5511988887777",
    "vcard": "BEGIN:VCARD\\nVERSION:3.0\\nFN:Dr. João Silva\\nTEL:5511988887777\\nEND:VCARD"
  }
}`}
            />
          </div>

          {/* 9. Enquete */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Enquete / Poll Recebida</h3>
                  <p className="text-xs text-slate-500">Criação de enquete no WhatsApp</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/poll
              </Badge>
            </div>

            <CodeBlock
              id="msg-poll"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_120363425932296878@g.us_POLL123456",
    "timestamp": 1786814450,
    "group_id": "120363425932296878@g.us",
    "group_name": "Equipe de Vendas VIP",
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "name": "Qual o melhor horário para a reunião?",
    "options": [
      { "name": "09:00", "id": "opt_1" },
      { "name": "14:00", "id": "opt_2" },
      { "name": "17:00", "id": "opt_3" }
    ],
    "selectable_options_count": 1
  }
}`}
            />
          </div>

          {/* 10. Resposta / Voto de Enquete */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Resposta / Voto de Enquete</h3>
                  <p className="text-xs text-slate-500">Notificação de voto selecionado por um participante em uma enquete do WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 font-semibold">
                  POST /webhooks/messages/poll-vote
                </Badge>
                <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1">
                  POST /webhook-inbound/polls/vote
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> Registra o voto do participante no banco de dados (<code className="font-mono text-slate-700">poll_responses</code>) e <strong>retoma automaticamente a execução do Workflow</strong> no ramo/saída correspondente à alternativa selecionada.
            </p>

            <CodeBlock
              id="msg-poll-vote"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "message_id": "false_120363425932296878@g.us_POLL123456",
    "group_id": "120363425932296878@g.us",
    "from_phone": "5512982402981",
    "from_name": "Estevão",
    "selected_option_index": 0,
    "selected_option_text": "Sim, tenho interesse",
    "timestamp": 1786814900
  }
}`}
            />

            <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
              <span><strong>Campos aceitos:</strong> <code className="font-mono text-slate-700">message_id</code> / <code className="font-mono text-slate-700">poll_message_id</code>, <code className="font-mono text-slate-700">group_id</code>, <code className="font-mono text-slate-700">from_phone</code>, <code className="font-mono text-slate-700">selected_option_index</code>, <code className="font-mono text-slate-700">selected_option_text</code>.</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO 2: EVENTOS ESPECIAIS (NÃO DUPLICAM MENSAGENS) */}
        {/* ======================================================== */}
        <div className="space-y-8 pt-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Heart className="h-6 w-6 text-rose-500" />
              Eventos Especiais de Mensagens
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Eventos que alteram ou associam estado a uma mensagem existente sem gerar novas mensagens comuns no histórico.
            </p>
          </div>

          {/* 1. Reação */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reação de Mensagem</h3>
                  <p className="text-xs text-slate-500">Associa uma reação (emoji) à mensagem alvo especificada</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/reaction
              </Badge>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> A reação é gravada diretamente no registro da mensagem alvo (<code className="font-mono text-slate-700">target_message_id</code>), sem criar uma nova linha de mensagem no chat.
            </p>

            <CodeBlock
              id="event-reaction"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "timestamp": 1786814600,
    "message_id": "reaction_event_id_999",
    "target_message_id": "false_171296717553783@lid_3EB034E72F18BE445197B5",
    "reaction": "❤️",
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid"
  }
}`}
            />
          </div>

          {/* 2. Edição */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edição de Mensagem</h3>
                  <p className="text-xs text-slate-500">Atualiza o conteúdo de uma mensagem previamente enviada</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/edited
              </Badge>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> O corpo da mensagem (<code className="font-mono text-slate-700">original_message_id</code>) é atualizado e marcado como editado, preservando a conversa sem duplicatas.
            </p>

            <CodeBlock
              id="event-edited"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "timestamp": 1786814700,
    "message_id": "edit_event_id_888",
    "original_message_id": "false_171296717553783@lid_3EB034E72F18BE445197B5",
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "body": "Texto corrigido e atualizado pelo remetente."
  }
}`}
            />
          </div>

          {/* 3. Revogação */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-200 text-slate-700">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mensagem Revogada / Apagada</h3>
                  <p className="text-xs text-slate-500">Marca a mensagem como apagada para todos</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1">
                POST /webhooks/messages/revoked
              </Badge>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> A mensagem correspondente (<code className="font-mono text-slate-700">revoked_message_id</code>) é marcada como revogada (<code className="font-mono text-slate-700">status: 'revoked'</code>).
            </p>

            <CodeBlock
              id="event-revoked"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "timestamp": 1786814800,
    "message_id": "revoke_event_id_777",
    "revoked_message_id": "false_171296717553783@lid_3EB034E72F18BE445197B5",
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid"
  }
}`}
            />
          </div>

          {/* 4. Status de Mensagem (Entregue, Lida, Enviada, Falha) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Status de Entrega e Leitura (ACK)</h3>
                  <p className="text-xs text-slate-500">Atualiza se a mensagem foi enviada, entregue, lida ou falhou</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 font-semibold">
                POST /webhooks/messages/status
              </Badge>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> Atualiza o status da mensagem original no chat (ex: 1 check para <em>sent</em>, 2 checks cinzas para <em>delivered</em>, 2 checks azuis para <em>read</em>) <strong>sem duplicar mensagens</strong> na conversa.
            </p>

            <CodeBlock
              id="event-status"
              code={`{
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "3EB0C0D5C4CC000102A087",
    "status": "read",
    "timestamp": 1787604503,
    "from_phone": "5512982402981"
  }
}`}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO 3: EVENTOS DE GRUPO (ENTRADA E SAÍDA) */}
        {/* ======================================================== */}
        <div className="space-y-8 pt-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Users className="h-6 w-6 text-purple-600" />
              Eventos de Grupo (Entrada e Saída)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Endpoints dedicados para registrar a movimentação de participantes em grupos do WhatsApp e disparar automações de boas-vindas / campanhas.
            </p>
          </div>

          {/* 1. Entrada de Participante no Grupo (Group Join) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Entrada de Participante no Grupo (Join)</h3>
                  <p className="text-xs text-slate-500">Notifica quando um novo participante entra ou é adicionado ao grupo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 font-semibold">
                  POST /webhook-inbound/groups/join
                </Badge>
                <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1">
                  POST /webhooks/groups/join
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> Registra a entrada do participante no grupo, insere a notificação de sistema no chat (<em>"5512982402981 entrou no grupo."</em>) e aciona automaticamente as automações configuradas (como <strong>Campanhas Piratas / Sequências de Boas-Vindas</strong>).
            </p>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Payload Minimalista (Real)</h4>
              <CodeBlock
                id="group-join"
                code={`{
  "instance_id": "session_01m0e0qnqsjb4xepkmax583azc",
  "raw_event": {
    "group_id": "120363024849182394@g.us",
    "from_phone": "5512982402981",
    "@lid": "171296717553783@lid",
    "timestamp": 1787617800
  }
}`}
              />
            </div>

            <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
              <span><strong>Campos aceitos:</strong> <code className="font-mono text-slate-700">group_id</code> (obrigatório), <code className="font-mono text-slate-700">from_phone</code> / <code className="font-mono text-slate-700">phone</code>, <code className="font-mono text-slate-700">@lid</code> / <code className="font-mono text-slate-700">from_lid</code>, <code className="font-mono text-slate-700">timestamp</code>.</span>
            </div>
          </div>

          {/* 2. Saída de Participante do Grupo (Group Leave) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <UserMinus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Saída / Remoção de Participante (Leave)</h3>
                  <p className="text-xs text-slate-500">Notifica quando um participante sai voluntariamente ou é removido do grupo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-rose-50 text-rose-700 border-rose-200 px-3 py-1 font-semibold">
                  POST /webhook-inbound/groups/leave
                </Badge>
                <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1">
                  POST /webhooks/groups/leave
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong>Comportamento:</strong> Registra a saída na timeline do chat do grupo com a mensagem de sistema (<em>"5512982402981 saiu do grupo."</em>) e atualiza os registros do CRM.
            </p>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Payload Minimalista (Real)</h4>
              <CodeBlock
                id="group-leave"
                code={`{
  "instance_id": "session_01m0e0qnqsjb4xepkmax583azc",
  "raw_event": {
    "group_id": "120363024849182394@g.us",
    "from_phone": "5512982402981",
    "@lid": "171296717553783@lid",
    "timestamp": 1787617900
  }
}`}
              />
            </div>

            <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
              <span><strong>Campos aceitos:</strong> <code className="font-mono text-slate-700">group_id</code> (obrigatório), <code className="font-mono text-slate-700">from_phone</code> / <code className="font-mono text-slate-700">phone</code>, <code className="font-mono text-slate-700">@lid</code> / <code className="font-mono text-slate-700">from_lid</code>, <code className="font-mono text-slate-700">timestamp</code>.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WebhookDocs;
