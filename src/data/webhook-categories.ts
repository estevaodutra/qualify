export interface WebhookAction {
  id: string;
  name: string;
  description: string;
  type: "request" | "event";
}

export interface WebhookCategory {
  id: string;
  name: string;
  description: string;
  defaultUrl: string;
  actions: WebhookAction[];
}

export const webhookCategories: WebhookCategory[] = [
  {
    id: "messages",
    name: "Mensagens",
    description: "Eventos relacionados a envio e recebimento de mensagens",
    defaultUrl: "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "message.send_text", name: "message.send_text", description: "Enviar mensagem de texto", type: "request" },
      { id: "message.send_media", name: "message.send_media", description: "Enviar mídia genérica", type: "request" },
      { id: "message.send_image", name: "message.send_image", description: "Enviar imagem", type: "request" },
      { id: "message.send_video", name: "message.send_video", description: "Enviar vídeo", type: "request" },
      { id: "message.send_audio", name: "message.send_audio", description: "Enviar áudio", type: "request" },
      { id: "message.send_document", name: "message.send_document", description: "Enviar documento", type: "request" },
      { id: "message.send_sticker", name: "message.send_sticker", description: "Enviar sticker", type: "request" },
      { id: "message.send_location", name: "message.send_location", description: "Enviar localização", type: "request" },
      { id: "message.send_contact", name: "message.send_contact", description: "Enviar contato", type: "request" },
      { id: "message.send_buttons", name: "message.send_buttons", description: "Enviar botões interativos", type: "request" },
      { id: "message.send_list", name: "message.send_list", description: "Enviar lista de opções", type: "request" },
      { id: "message.send_poll", name: "message.send_poll", description: "Enviar enquete", type: "request" },
      { id: "message.send_reaction", name: "message.send_reaction", description: "Enviar reação a mensagem", type: "request" },
      { id: "message.forward", name: "message.forward", description: "Encaminhar mensagem", type: "request" },
      { id: "message.delete", name: "message.delete", description: "Deletar mensagem", type: "request" },
      { id: "message.read", name: "message.read", description: "Marcar como lida", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "message.received", name: "message.received", description: "Mensagem recebida", type: "event" },
      { id: "message.sent", name: "message.sent", description: "Mensagem enviada com sucesso", type: "event" },
      { id: "message.delivered", name: "message.delivered", description: "Mensagem entregue", type: "event" },
      { id: "message.read_ack", name: "message.read_ack", description: "Confirmação de leitura", type: "event" },
      { id: "message.failed", name: "message.failed", description: "Falha no envio", type: "event" },
    ],
  },
  {
    id: "instance",
    name: "Instância",
    description: "Eventos de status e conexão da instância WhatsApp",
    defaultUrl: "https://n8n-n8n.nuwfic.easypanel.host/webhook/instance",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "instance.connect", name: "instance.connect", description: "Conectar instância (QR/telefone)", type: "request" },
      { id: "instance.disconnect", name: "instance.disconnect", description: "Desconectar instância", type: "request" },
      { id: "instance.restart", name: "instance.restart", description: "Reiniciar instância", type: "request" },
      { id: "instance.status", name: "instance.status", description: "Verificar status", type: "request" },
      { id: "instance.qrcode", name: "instance.qrcode", description: "Obter QR Code", type: "request" },
      { id: "instance.logout", name: "instance.logout", description: "Fazer logout", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "instance.connected", name: "instance.connected", description: "Instância conectada", type: "event" },
      { id: "instance.disconnected", name: "instance.disconnected", description: "Instância desconectada", type: "event" },
      { id: "instance.qrcode_updated", name: "instance.qrcode_updated", description: "QR Code atualizado", type: "event" },
      { id: "instance.auth_failed", name: "instance.auth_failed", description: "Falha na autenticação", type: "event" },
      { id: "instance.battery_low", name: "instance.battery_low", description: "Bateria baixa", type: "event" },
    ],
  },
  {
    id: "groups",
    name: "Grupos",
    description: "Eventos de grupos do WhatsApp",
    defaultUrl: "https://n8n-n8n.nuwfic.easypanel.host/webhook/groups",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "group.list", name: "group.list", description: "Listar grupos", type: "request" },
      { id: "group.create", name: "group.create", description: "Criar grupo", type: "request" },
      { id: "group.update_name", name: "group.update_name", description: "Atualizar nome", type: "request" },
      { id: "group.update_description", name: "group.update_description", description: "Atualizar descrição", type: "request" },
      { id: "group.update_photo", name: "group.update_photo", description: "Atualizar foto", type: "request" },
      { id: "group.get_invite_link", name: "group.get_invite_link", description: "Obter link de convite", type: "request" },
      { id: "group.revoke_invite_link", name: "group.revoke_invite_link", description: "Revogar link", type: "request" },
      { id: "group.add_member", name: "group.add_member", description: "Adicionar membro", type: "request" },
      { id: "group.remove_member", name: "group.remove_member", description: "Remover membro", type: "request" },
      { id: "group.promote_admin", name: "group.promote_admin", description: "Promover a admin", type: "request" },
      { id: "group.demote_admin", name: "group.demote_admin", description: "Remover admin", type: "request" },
      { id: "group.leave", name: "group.leave", description: "Sair do grupo", type: "request" },
      { id: "group.get_members", name: "group.get_members", description: "Listar membros", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "group.created", name: "group.created", description: "Grupo criado", type: "event" },
      { id: "group.updated", name: "group.updated", description: "Grupo atualizado", type: "event" },
      { id: "group.member_joined", name: "group.member_joined", description: "Membro entrou", type: "event" },
      { id: "group.member_left", name: "group.member_left", description: "Membro saiu", type: "event" },
      { id: "group.admin_changed", name: "group.admin_changed", description: "Admin alterado", type: "event" },
    ],
  },
  {
    id: "calls",
    name: "Ligações",
    description: "Eventos relacionados a campanhas de ligação telefônica",
    defaultUrl: "",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "call.dial", name: "call.dial", description: "Iniciar ligação", type: "request" },
      { id: "call.hangup", name: "call.hangup", description: "Encerrar ligação", type: "request" },
      { id: "call.transfer", name: "call.transfer", description: "Transferir ligação", type: "request" },
      { id: "call.hold", name: "call.hold", description: "Colocar em espera", type: "request" },
      { id: "call.resume", name: "call.resume", description: "Retomar ligação", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "call.started", name: "call.started", description: "Ligação iniciada", type: "event" },
      { id: "call.answered", name: "call.answered", description: "Ligação atendida", type: "event" },
      { id: "call.ended", name: "call.ended", description: "Ligação encerrada", type: "event" },
      { id: "call.failed", name: "call.failed", description: "Falha na ligação", type: "event" },
      { id: "call.busy", name: "call.busy", description: "Linha ocupada", type: "event" },
      { id: "call.no_answer", name: "call.no_answer", description: "Sem resposta", type: "event" },
    ],
  },
  {
    id: "contacts",
    name: "Contatos",
    description: "Eventos relacionados a contatos e números",
    defaultUrl: "",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "contact.list", name: "contact.list", description: "Listar contatos", type: "request" },
      { id: "contact.get_profile", name: "contact.get_profile", description: "Obter perfil", type: "request" },
      { id: "contact.get_photo", name: "contact.get_photo", description: "Obter foto", type: "request" },
      { id: "contact.check_exists", name: "contact.check_exists", description: "Verificar se existe no WhatsApp", type: "request" },
      { id: "contact.block", name: "contact.block", description: "Bloquear contato", type: "request" },
      { id: "contact.unblock", name: "contact.unblock", description: "Desbloquear contato", type: "request" },
      { id: "contact.get_business_info", name: "contact.get_business_info", description: "Obter info comercial", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "contact.updated", name: "contact.updated", description: "Contato atualizado", type: "event" },
      { id: "contact.blocked", name: "contact.blocked", description: "Contato bloqueado", type: "event" },
      { id: "contact.unblocked", name: "contact.unblocked", description: "Contato desbloqueado", type: "event" },
    ],
  },
  {
    id: "chat",
    name: "Conversas",
    description: "Eventos de conversas e histórico",
    defaultUrl: "",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "chat.list", name: "chat.list", description: "Listar conversas", type: "request" },
      { id: "chat.archive", name: "chat.archive", description: "Arquivar conversa", type: "request" },
      { id: "chat.unarchive", name: "chat.unarchive", description: "Desarquivar", type: "request" },
      { id: "chat.pin", name: "chat.pin", description: "Fixar conversa", type: "request" },
      { id: "chat.unpin", name: "chat.unpin", description: "Desfixar", type: "request" },
      { id: "chat.mute", name: "chat.mute", description: "Silenciar", type: "request" },
      { id: "chat.unmute", name: "chat.unmute", description: "Reativar notificações", type: "request" },
      { id: "chat.mark_read", name: "chat.mark_read", description: "Marcar como lida", type: "request" },
      { id: "chat.mark_unread", name: "chat.mark_unread", description: "Marcar como não lida", type: "request" },
      { id: "chat.delete", name: "chat.delete", description: "Deletar conversa", type: "request" },
      { id: "chat.clear", name: "chat.clear", description: "Limpar mensagens", type: "request" },
      { id: "chat.get_messages", name: "chat.get_messages", description: "Obter histórico", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "chat.updated", name: "chat.updated", description: "Conversa atualizada", type: "event" },
      { id: "chat.presence", name: "chat.presence", description: "Presença (online/offline/digitando)", type: "event" },
    ],
  },
  {
    id: "profile",
    name: "Perfil",
    description: "Eventos de perfil do usuário",
    defaultUrl: "",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "profile.get", name: "profile.get", description: "Obter perfil próprio", type: "request" },
      { id: "profile.update_name", name: "profile.update_name", description: "Atualizar nome", type: "request" },
      { id: "profile.update_status", name: "profile.update_status", description: "Atualizar status/recado", type: "request" },
      { id: "profile.update_photo", name: "profile.update_photo", description: "Atualizar foto", type: "request" },
      { id: "profile.remove_photo", name: "profile.remove_photo", description: "Remover foto", type: "request" },
      { id: "profile.get_privacy", name: "profile.get_privacy", description: "Obter config privacidade", type: "request" },
      { id: "profile.update_privacy", name: "profile.update_privacy", description: "Atualizar privacidade", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "profile.updated", name: "profile.updated", description: "Perfil atualizado", type: "event" },
    ],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Gerenciamento de webhooks e eventos",
    defaultUrl: "",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "webhook.set", name: "webhook.set", description: "Configurar webhook", type: "request" },
      { id: "webhook.get", name: "webhook.get", description: "Obter configuração", type: "request" },
      { id: "webhook.delete", name: "webhook.delete", description: "Remover webhook", type: "request" },
      { id: "webhook.list", name: "webhook.list", description: "Listar webhooks", type: "request" },
      { id: "webhook.test", name: "webhook.test", description: "Testar conectividade", type: "request" },
      // Event actions (n8n -> Dispatch)
      { id: "webhook.registered", name: "webhook.registered", description: "Webhook registrado", type: "event" },
      { id: "webhook.failed", name: "webhook.failed", description: "Falha no webhook", type: "event" },
    ],
  },
  {
    id: "utilities",
    name: "Utilitários",
    description: "Funções auxiliares e utilitárias",
    defaultUrl: "",
    actions: [
      // Request actions (Dispatch -> n8n)
      { id: "utility.download_media", name: "utility.download_media", description: "Baixar mídia", type: "request" },
      { id: "utility.upload_media", name: "utility.upload_media", description: "Upload de mídia", type: "request" },
      { id: "utility.get_base64", name: "utility.get_base64", description: "Converter para base64", type: "request" },
      { id: "utility.check_number", name: "utility.check_number", description: "Verificar número válido", type: "request" },
      { id: "utility.get_product_catalog", name: "utility.get_product_catalog", description: "Obter catálogo", type: "request" },
      { id: "utility.send_product", name: "utility.send_product", description: "Enviar produto", type: "request" },
    ],
  },
];

// Helper to get all request actions for a category
export function getRequestActions(categoryId: string): WebhookAction[] {
  const category = webhookCategories.find(c => c.id === categoryId);
  return category?.actions.filter(a => a.type === "request") || [];
}

// Helper to get all event actions for a category
export function getEventActions(categoryId: string): WebhookAction[] {
  const category = webhookCategories.find(c => c.id === categoryId);
  return category?.actions.filter(a => a.type === "event") || [];
}
