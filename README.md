# DispatchOne

WhatsApp and call center automation platform with campaign management, operators, and automatic dialing.

---

## What is it?

DispatchOne centralizes outbound contact operations (calls and WhatsApp) on a single platform, connecting leads, campaigns, channels, and operators with automatic queuing, intelligent retry, and cost-per-action analytics.

---

## Problem it solves

Outbound contact operations depend on constant manual coordination: manual dialing, follow-up via reminders, fragmented data across tools, and the inability to measure the real cost per conversion. Scaling requires hiring managers, not just operators.

DispatchOne eliminates manual coordination. The system automatically distributes work, performs retries without intervention, and centralizes operational metrics.

---

## Modules

**Call Campaigns**
- Campaign creation with configurable retry count, interval, and priority
- Lead import via spreadsheet or API
- Automatic dialing queue with prioritization
- Call script with configurable steps
- Customized actions based on call outcome

**Operators**
- Real-time status: available, on_call, cooldown, offline
- Automatic assignment via atomic RPC (zero race conditions)
- Real-time call pop-up with script, timer, and lead data
- Configurable cooldown between calls
- Email invitation

**WhatsApp Campaigns**
- Mass messaging with templates
- Tracking: sent → delivered → read → replied
- Group campaigns with member management
- Scheduling of messages

**Leads**
- Centralized database with tags and origin
- Lead extraction from WhatsApp groups
- Complete interaction history
- Status Synchronized with campaign results

**External API**
- `POST /call-dial` — initiate calls via API with SHA-256 authentication
- `POST /call-status` — provider status callback
- Documentation with examples in cURL, Node.js, and Python

**Analytics**
- Cost per minute, per answered call, per conversion
- Funnel: incoming → completed → answered → with action
- Performance per operator
- Heatmap of times with the best call handling rate

---

## Stack

| Layer | Technology |

|---|---|

| Frontend | Lovable (React + TypeScript) |

| Backend / API | Supabase Edge Functions (Deno) |

| Database | Supabase (PostgreSQL) |

| Realtime | Supabase Realtime |

| Automation | n8n |

| WhatsApp | Z-API, Evolution API | Telephony | Webhook with external providers |

---

## Architecture

```
[External System / n8n]

│

▼
POST /call-dial

│

▼
Edge Function (validation + upsert lead)

│

▼
reserve_operator_for_call (atomic RPC)

│
├── Operator available → dialing → webhook provider

│

└── No operator → queue (scheduled)

│

▼
Queue processor

(automatic ticking)

│

▼
Next item + operator available

│

▼
webhook provider → callback /call-status

│

▼
Update status + release operator
```

---

## Limits of Scope

- Does not make direct calls — depends on an external provider via webhook
- No IVR or automated service — human operator always involved
- No native integration with external CRMs (Salesforce, HubSpot)
- WhatsApp depends on an instance connected via Z-API or Evolution API
- No native call recording — depends on the provider
- No predictive dialer — one call per operator available at a time

---

## Exception Handling

- `heal_stuck_operators`: releases operators stuck in `on_call` without an active call
- `enforce_single_active_call`: constraint that prevents an operator from making multiple calls
- Dialing timeout (45s) releases the operator if the webhook does not respond
- Automatic retry for `no_answer`, `busy`, `voicemail` up to max_attempts
- `FOR UPDATE SKIP LOCKED` prevents race conditions in the queue

---

## Status

In production with active use. Call queue refactored from 3 levels to a single queue. Stable WhatsApp integrations. Operator pop-up works via Realtime without critical failures.

---

## Author

**Estevão Dutra** — Automation Engineer & Systems Architect

[LinkedIn](https://www.linkedin.com/in/estevao-dutra-ai) · [Portfolio](https://estevaodutra1.lovable.app/)
