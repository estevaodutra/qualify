import React from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const WebhookDocs = () => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copiado!",
      description: "O JSON foi copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-800 my-4 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-400">JSON</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Copiar código"
        >
          {copiedId === id ? <Check size={16} /> : <Copy size={16} />}
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
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Documentação: Webhook Inbound
          </h1>
          <p className="text-lg text-slate-600">
            O Super Endpoint Universal para recebimento de dados normalizados. 
            Esta página documenta os payloads exatos que devem ser enviados para a nossa API 
            <code className="mx-2 bg-slate-200 px-2 py-0.5 rounded text-sm text-slate-800">/webhook-inbound</code>.
          </p>
        </div>

        {/* Estrutura Base */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Estrutura Base (Obrigatória)</h2>
          <p className="text-slate-600 mb-4">
            Todo disparo deve conter os quatro campos raízes abaixo. A formatação detalhada acontece dentro da chave <code className="text-indigo-600 font-semibold bg-indigo-50 px-1 py-0.5 rounded">raw_event</code>.
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium min-w-[120px] inline-block">action</span>
              <span className="text-slate-600">Ação realizada (ex: <code className="text-indigo-600 font-mono text-sm">message.received</code>, <code className="text-indigo-600 font-mono text-sm">message.sent</code>).</span>
            </li>
            <li className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium min-w-[120px] inline-block">provider</span>
              <span className="text-slate-600">O provedor de origem (ex: <code className="text-indigo-600 font-mono text-sm">waha</code>).</span>
            </li>
            <li className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium min-w-[120px] inline-block">instance_id</span>
              <span className="text-slate-600">ID da sessão ou da instância.</span>
            </li>
            <li className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium min-w-[120px] inline-block">raw_event</span>
              <span className="text-slate-600">O payload normalizado da mensagem em si.</span>
            </li>
          </ul>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b border-slate-200 pb-4">
            Exemplos de Payload (<code className="text-indigo-600 text-2xl font-normal">raw_event</code>)
          </h2>
          
          {/* Mensagem Privada - Texto */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-inner">1</div>
              <h3 className="text-xl font-bold text-slate-900">Mensagem de Texto (Privada)</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Usado para mensagens diretas (1x1) que contêm apenas texto. Repare que o campo <code className="text-sm bg-slate-100 px-1 py-0.5 rounded font-mono">is_group</code> é <code className="text-blue-600 font-bold">false</code>.
            </p>
            <CodeBlock 
              id="private-text"
              code={`{
  "action": "message.received",
  "provider": "waha",
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_3EB034E72F18BE445197B5",
    "timestamp": 1786814411,
    "type": "text",
    "is_group": false,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "body": "Conteúdo da mensagem recebida!"
  }
}`} 
            />
          </div>

          {/* Mensagem Privada - Imagem */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shadow-inner">2</div>
              <h3 className="text-xl font-bold text-slate-900">Mensagem com Mídia (Imagem/Áudio)</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Para mídias, mude o <code className="text-sm bg-slate-100 px-1 py-0.5 rounded font-mono">type</code> (ex: <code className="text-sm bg-slate-100 px-1 rounded text-emerald-600">image</code>, <code className="text-sm bg-slate-100 px-1 rounded text-emerald-600">audio</code>, <code className="text-sm bg-slate-100 px-1 rounded text-emerald-600">video</code>) e adicione propriedades específicas da mídia como <code className="text-sm bg-slate-100 px-1 rounded font-mono">media_url</code> e <code className="text-sm bg-slate-100 px-1 rounded font-mono">caption</code> (opcional).
            </p>
            <CodeBlock 
              id="private-image"
              code={`{
  "action": "message.received",
  "provider": "waha",
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_171296717553783@lid_8F9D7C2A3B4E1F",
    "timestamp": 1786814450,
    "type": "image",
    "is_group": false,
    "from_phone": "5512982402981",
    "from_lid": "171296717553783@lid",
    "from_name": "Estevão",
    "media_url": "https://url-publica-do-seu-storage.com/imagem.jpg",
    "caption": "Olha essa foto legal!"
  }
}`} 
            />
          </div>

          {/* Mensagem de Grupo */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold shadow-inner">3</div>
              <h3 className="text-xl font-bold text-slate-900">Mensagem em Grupo</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Quando <code className="text-sm bg-slate-100 px-1 py-0.5 rounded font-mono">is_group: true</code>, devem ser fornecidos o <code className="text-sm bg-slate-100 px-1 rounded font-mono">group_id</code> (geralmente com sufixo @g.us) e o <code className="text-sm bg-slate-100 px-1 rounded font-mono">group_name</code>, além das informações da pessoa que enviou a mensagem (<code className="text-sm bg-slate-100 px-1 rounded font-mono">from_phone</code> e <code className="text-sm bg-slate-100 px-1 rounded font-mono">from_name</code>).
            </p>
            <CodeBlock 
              id="group-text"
              code={`{
  "action": "message.received",
  "provider": "waha",
  "instance_id": "session_01m00wwc7vw2w21nx0n7dfmtf7",
  "raw_event": {
    "id": "false_120363425932296878@g.us_9A8B7C6D5E4F3G",
    "timestamp": 1786814500,
    "type": "text",
    "is_group": true,
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
      </div>
    </div>
  );
};

export default WebhookDocs;
