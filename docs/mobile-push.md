# Mobile PWA and Web Push setup

The mobile navigation uses the existing application sidebar. The Push switch is in Settings → Notifications. On iPhone, install Qualify from Safari using **Add to Home Screen**, then enable Push in the installed app. Android can enable it in a supported browser or installed PWA. HTTPS is required outside localhost.

Deploy the `20261101000000_push_delivery_guards.sql` migration and the `webhook-inbound` Edge Function. Set `VITE_VAPID_PUBLIC_KEY` at frontend build time and `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in the Supabase Edge Function secrets. The public keys must match; `VAPID_SUBJECT` should be a `mailto:` contact. Generate a fresh VAPID key pair for this deployment and keep the private key out of the repository.

Push is sent only for inbound private messages that were stored in `chat_messages`. The assigned operator receives it, or the instance owner when no operator is assigned. Delivery checks active company membership and active subscriptions, then records one delivery per message and device. Invalid endpoints are revoked. The notification opens the conversation in its company workspace.
