// Qualify Service Worker — PWA & Push Notifications

const CACHE_NAME = "qualify-cache-v1";

// Installation & Activation
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Notification Received Event
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: "Nova mensagem",
      body: event.data.text() || "Você recebeu uma nova mensagem no Chat.",
    };
  }

  const title = payload.title || "Nova mensagem";
  const conversationId = payload.conversationId || payload.data?.conversationId;
  const companyId = payload.companyId || payload.data?.companyId;
  const targetUrl = payload.url || (conversationId ? `/chat?conversationId=${conversationId}` : "/chat");

  const options = {
    body: payload.body || "Você possui um novo atendimento pendente.",
    icon: payload.icon || "/logo-dark.png",
    badge: payload.badge || "/logo-dark.png",
    tag: payload.tag || (conversationId ? `conversation:${conversationId}` : "qualify-msg"),
    renotify: true,
    data: {
      url: targetUrl,
      conversationId: conversationId,
      companyId: companyId,
    },
    actions: [
      { action: "open", title: "Abrir Conversa" }
    ],
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Push Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || "/chat";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window open with Qualify
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          // Focus open window and navigate to conversation
          client.focus();
          client.postMessage({ type: "NAVIGATE_TO_CHAT", url: targetUrl, conversationId: data.conversationId, companyId: data.companyId });
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window open, open new window to target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
