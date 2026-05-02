# GEMINI.md — Qualify

> **Constituição do Projeto**  
> Este documento é a lei. Define esquemas de dados, regras comportamentais e invariantes arquiteturais.  
> Atualizar APENAS quando: esquema mudar, regra for adicionada ou arquitetura for modificada.  
> Última atualização: 01/05/2026

---

## 🎯 Estrela Guia (Visão)

**Resultado Único Desejado:**  
Empresa adiciona saldo → Cria campanha → Leads são contactados automaticamente → Operadores qualificam → Agendamentos são criados → Tudo rastreado e cobrado por minuto.

**O que é o Qualify:**  
Plataforma de automação de call center, WhatsApp e qualificação de leads. Empresas gerenciam campanhas de ligação, URA, disparos de WhatsApp, grupos e agendamentos com operadores, pagando por consumo via carteira pré-paga.

---

## 🔗 Integrações (Link)

### Serviços Externos

| Serviço | Função | Credenciais |
|---------|--------|-------------|
| **Supabase** | Banco, Auth, Edge Functions, Realtime | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Mercado Pago** | Pagamentos PIX | `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` |
| **n8n** | Orquestração de webhooks | URL fixa abaixo |
| **Z-API / Evolution API** | WhatsApp (disparos, grupos) | `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN` |
| **Provedor Telefonia** | Discagem, URA, callbacks | `TELEPHONY_API_URL`, `TELEPHONY_API_KEY` |
| **Google Calendar** | Sincronização de agenda | OAuth tokens por atendente |
| **Google Meet / Zoom** | Links de videochamada | OAuth tokens por atendente |

### Webhooks n8n

| Endpoint | Método | Função |
|----------|--------|--------|
| `https://n8n-n8n.nuwfic.easypanel.host/webhook/gerar_pix` | POST | Gerar QR Code PIX via Mercado Pago |
| `https://n8n-n8n.nuwfic.easypanel.host/webhook/groups` | POST | Receber membros de grupo WhatsApp |

### Verificação de Handshake (Fase L)

Antes de prosseguir, verificar:
- [ ] Supabase respondendo (testar query simples)
- [ ] n8n webhook acessível (POST de teste)
- [ ] Credenciais no `.env` configuradas

---

## 🗄️ Fonte da Verdade (Schemas de Dados)

### Hierarquia de Entidades

```
Company (Empresa)
├── CompanyMembers (Membros/Usuários)
├── Wallet (Carteira)
│   ├── WalletTransactions (Histórico)
│   ├── WalletPayments (Recargas PIX)
│   └── WalletReservations (Saldo reservado)
├── Campaigns (Campanhas)
│   ├── CallLogs (Ligações)
│   └── Leads
├── Operators (Operadores)
├── Calendars (Tipos de agendamento)
│   ├── CalendarAttendants (Atendentes)
│   ├── CalendarQuestions (Perguntas)
│   └── Appointments (Agendamentos)
└── WhatsAppInstances
```

---

### Schema: Company

```typescript
interface Company {
  id: string                    // UUID
  name: string                  // Nome da empresa
  cnpj?: string                 // CNPJ opcional
  owner_id: string              // FK → auth.users (quem criou)
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}
```

**Regras:**
- Uma company é criada apenas por superadmin
- Owner é automaticamente adicionado como member com role 'owner'

---

### Schema: Profile (Extensão do auth.users)

```typescript
interface Profile {
  id: string                    // UUID = auth.users.id
  email: string
  name: string
  phone?: string
  avatar_url?: string
  is_superadmin: boolean        // Acesso ao painel /admin
  current_company_id?: string   // Empresa ativa no momento
  created_at: string
  updated_at: string
}
```

---

### Schema: CompanyMember

```typescript
interface CompanyMember {
  id: string
  company_id: string            // FK → companies
  user_id: string               // FK → auth.users
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  invited_by?: string           // Quem convidou
  invited_at?: string
  accepted_at?: string
  created_at: string
}
```

**Regra Crítica:**  
`SE user.company_members.length === 0 → Bloquear em /aguardando-acesso`

---

### Schema: Wallet

```typescript
interface Wallet {
  id: string
  company_id: string            // FK → companies (UNIQUE 1:1)
  balance: number               // Saldo disponível em R$
  reserved_balance: number      // Saldo reservado (ligações em andamento)
  low_balance_alert: number     // Threshold para alerta (default: 50)
  alert_email_enabled: boolean
  daily_limit?: number          // Limite diário (null = sem limite)
  daily_spent: number           // Gasto do dia atual
  daily_spent_date: string      // Data para resetar daily_spent
  created_at: string
  updated_at: string
}
```

**Cálculo:** `available_balance = balance - reserved_balance`

---

### Schema: WalletTransaction

```typescript
interface WalletTransaction {
  id: string
  company_id: string
  wallet_id: string
  type: 'deposit' | 'consumption' | 'adjustment' | 'refund'
  category: 'pix' | 'call' | 'ura' | 'manual' | 'support'
  amount: number                // Positivo = crédito, Negativo = débito
  balance_before: number
  balance_after: number
  description: string
  metadata: {
    call_id?: string
    duration_seconds?: number
    phone?: string
    mp_payment_id?: string
    paid_at?: string
    reason?: string             // Para adjustments
  }
  reference_type?: string       // 'call_log' | 'wallet_payment' | etc
  reference_id?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
}
```

---

### Schema: WalletPayment

```typescript
interface WalletPayment {
  id: string
  company_id: string
  wallet_id: string
  amount: number
  mp_payment_id?: string        // ID retornado pelo Mercado Pago
  mp_qr_code?: string           // Código PIX copia e cola
  mp_qr_code_base64?: string    // QR Code em base64
  mp_ticket_url?: string        // URL do ticket MP
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  expires_at: string            // PIX expira em 30 min
  paid_at?: string
  created_at: string
  updated_at: string
}
```

---

### Schema: WalletReservation

```typescript
interface WalletReservation {
  id: string
  company_id: string
  wallet_id: string
  amount: number                // Valor reservado
  category: 'call' | 'ura'
  reference_type?: string       // 'call_log'
  reference_id?: string         // ID do call_log
  status: 'active' | 'finalized' | 'cancelled'
  finalized_amount?: number     // Valor real consumido (pode ser diferente)
  created_at: string
  finalized_at?: string
}
```

---

### Schema: Campaign

```typescript
interface Campaign {
  id: string
  company_id: string
  name: string
  type: 'call' | 'ura' | 'whatsapp'
  status: 'active' | 'paused' | 'stopped'
  settings: {
    retry_count: number         // Máximo de tentativas
    retry_interval_minutes: number
    priority: number            // Maior = mais prioridade na fila
    cooldown_seconds: number    // Intervalo entre ligações do operador
  }
  created_at: string
  updated_at: string
}
```

---

### Schema: Lead

```typescript
interface Lead {
  id: string
  company_id: string
  campaign_id?: string
  name: string
  phone: string                 // Normalizado: apenas números
  email?: string
  tags: string[]
  custom_data: Record<string, any>
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  source?: string               // Origem do lead
  created_at: string
  updated_at: string
}
```

---

### Schema: CallLog

```typescript
interface CallLog {
  id: string
  company_id: string
  campaign_id: string
  lead_id: string
  operator_id?: string
  external_call_id?: string     // ID do provedor de telefonia
  phone: string
  status: CallStatus
  duration_seconds?: number     // Duração total
  talk_time_seconds?: number    // Tempo falando (para cobrança)
  started_at?: string           // Início da discagem
  answered_at?: string          // Momento que atendeu
  ended_at?: string             // Fim da ligação
  action_taken?: string         // Ação registrada pelo operador
  notes?: string
  cost?: number                 // Custo calculado
  reservation_id?: string       // FK → wallet_reservations
  retry_count: number           // Tentativa atual
  next_retry_at?: string        // Próxima tentativa agendada
  created_at: string
  updated_at: string
}

type CallStatus = 
  | 'scheduled'     // Na fila aguardando
  | 'dialing'       // Discando
  | 'ringing'       // Chamando no telefone
  | 'on_call'       // Em ligação (conectou)
  | 'completed'     // Finalizada com sucesso
  | 'no_answer'     // Não atendeu
  | 'busy'          // Ocupado
  | 'failed'        // Falhou (erro técnico)
  | 'voicemail'     // Caixa postal
```

---

### Schema: Operator

```typescript
interface Operator {
  id: string
  company_id: string
  user_id: string               // FK → auth.users
  name: string
  status: OperatorStatus
  current_call_id?: string      // Ligação atual (null = disponível)
  cooldown_until?: string       // Em cooldown até este timestamp
  settings: {
    cooldown_seconds: number    // Cooldown pessoal
    max_calls_per_day?: number
  }
  stats: {
    calls_today: number
    total_talk_time_today: number
  }
  created_at: string
  updated_at: string
}

type OperatorStatus = 
  | 'available'     // Pronto para receber ligação
  | 'on_call'       // Em ligação agora
  | 'cooldown'      // Intervalo entre ligações
  | 'offline'       // Deslogado/indisponível
```

---

### Schema: Calendar

```typescript
interface Calendar {
  id: string
  company_id: string
  name: string                  // "Ligação de Qualificação"
  slug: string                  // URL única: /agendar/{slug}
  description?: string
  duration_minutes: number      // 15, 30, 45, 60
  modality: 'call' | 'video' | 'in_person'
  status: 'active' | 'paused' | 'archived'
  
  // Disponibilidade padrão
  availability: {
    monday?: Array<{ start: string, end: string }>
    tuesday?: Array<{ start: string, end: string }>
    // ... outros dias
  }
  buffer_minutes: number        // Intervalo entre agendamentos
  min_notice_hours: number      // Antecedência mínima
  max_days_ahead: number        // Janela de agendamento
  daily_limit: number           // 0 = ilimitado
  
  // Atendentes
  allow_attendant_selection: boolean  // Lead pode escolher?
  
  // Aparência (página pública)
  logo_url?: string
  company_name?: string
  theme: {
    primary_color: string       // Botões, destaques
    secondary_color: string     // Horários disponíveis
    background_color: string
    card_color: string
    text_color: string
  }
  background_image_url?: string
  background_opacity: number    // 0-100
  custom_texts: {
    page_title: string
    page_subtitle: string
    button_text: string
    success_title: string
    success_message: string
  }
  layout_style: 'side_by_side' | 'centered' | 'compact_grid'
  show_timezone: boolean
  show_duration: boolean
  hide_branding: boolean
  
  // Notificações WhatsApp
  notifications: {
    confirmation: { enabled: boolean, message: string }
    reminder_1d: { enabled: boolean, message: string }
    reminder_1h: { enabled: boolean, message: string }
    reminder_15m: { enabled: boolean, message: string }
  }
  whatsapp_instance_id?: string
  
  // Integrações
  linked_campaign_id?: string   // Criar lead na campanha
  webhook_url?: string
  webhook_events: string[]      // ['created', 'cancelled', 'rescheduled']
  
  // Videochamada
  video_provider?: 'google_meet' | 'zoom'
  
  // Presencial
  location_address?: string
  location_maps_url?: string
  
  created_at: string
  updated_at: string
}
```

---

### Schema: CalendarAttendant

```typescript
interface CalendarAttendant {
  id: string
  company_id: string
  user_id?: string              // FK → auth.users (opcional)
  name: string
  email?: string
  phone?: string
  photo_url?: string
  bio?: string                  // Aparece na página pública
  availability?: {              // Sobrescreve calendário se preenchido
    monday?: Array<{ start: string, end: string }>
    // ...
  }
  google_calendar_id?: string
  google_calendar_token?: {
    access_token: string
    refresh_token: string
    expires_at: string
  }
  zoom_user_id?: string
  zoom_token?: object
  status: 'active' | 'paused'
  priority: number              // Para round-robin (maior = mais prioridade)
  created_at: string
  updated_at: string
}
```

---

### Schema: Appointment

```typescript
interface Appointment {
  id: string
  company_id: string
  calendar_id: string
  attendant_id?: string
  lead_id?: string              // FK → leads (criado automaticamente)
  
  // Dados do lead (snapshot)
  lead_name: string
  lead_phone: string
  lead_email?: string
  custom_data: Record<string, any>
  qualification_answers: Record<string, any>  // Respostas das perguntas
  
  // Agendamento
  scheduled_at: string          // Data/hora UTC
  duration_minutes: number
  timezone: string              // 'America/Sao_Paulo'
  modality: 'call' | 'video' | 'in_person'
  meeting_link?: string         // Link do Meet/Zoom
  
  // Status
  status: AppointmentStatus
  
  // Cancelamento/Reagendamento
  cancel_token: string          // Token único para link de gerenciamento
  cancelled_at?: string
  cancellation_reason?: string
  cancellation_comment?: string
  rescheduled_from?: string     // ID do appointment original
  rescheduled_to?: string       // ID do novo appointment
  
  // Notificações enviadas
  confirmation_sent_at?: string
  reminder_1d_sent_at?: string
  reminder_1h_sent_at?: string
  reminder_15m_sent_at?: string
  
  // Rastreamento
  source: 'direct' | 'whatsapp' | 'campaign' | 'api'
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  
  // Google Calendar
  google_event_id?: string
  
  // Notas internas
  notes?: string
  
  created_at: string
  updated_at: string
}

type AppointmentStatus = 
  | 'confirmed'     // Agendado e confirmado
  | 'completed'     // Atendimento realizado
  | 'cancelled'     // Cancelado pelo lead
  | 'no_show'       // Lead não compareceu
  | 'rescheduled'   // Foi reagendado (ver rescheduled_to)
```

---

## 📤 Payload de Entrega (Formatos de I/O)

### PIX — Request para n8n

```json
{
  "company_id": "uuid",
  "payment_id": "uuid",
  "amount": 250.00,
  "description": "Recarga Qualify - Nome da Empresa",
  "payer_email": "cliente@email.com",
  "payer_name": "Nome do Cliente"
}
```

### PIX — Response do n8n

```json
{
  "success": true,
  "payment_id": "mp_123456789",
  "qr_code": "00020126580014br.gov.bcb.pix...",
  "qr_code_base64": "data:image/png;base64,iVBORw0KGgo...",
  "ticket_url": "https://www.mercadopago.com.br/...",
  "expires_at": "2025-04-22T11:00:00Z"
}
```

### PIX — Confirmação de Pagamento (n8n → Edge Function)

```json
{
  "payment_id": "uuid",
  "mp_payment_id": "mp_123456789",
  "status": "approved",
  "amount": 250.00,
  "paid_at": "2025-04-22T10:35:00Z"
}
```

### Callback de Ligação (Provedor → Edge Function)

```json
{
  "external_call_id": "provider_123",
  "status": "answered",
  "duration_seconds": 185,
  "answered_at": "2025-04-22T10:30:15Z",
  "ended_at": "2025-04-22T10:33:20Z"
}
```

---

## 📐 Regras Comportamentais

### Billing (Cobrança)

| Ação | Preço | Unidade | Fórmula |
|------|-------|---------|---------|
| **Ligação** | R$ 0,40 | por minuto falado | `Math.ceil(talk_time_seconds / 60) * 0.40` |
| **URA** | R$ 0,15 | por 30 segundos | `Math.ceil(duration_seconds / 30) * 0.15` |

```typescript
const BILLING = {
  CALL_PRICE_PER_MINUTE: 0.40,
  URA_PRICE_PER_30_SECONDS: 0.15,
  MIN_RECHARGE_AMOUNT: 250.00,
  RECHARGE_PRESETS: [250, 500, 1000, 2000],
  LOW_BALANCE_ALERT_DEFAULT: 50.00
}
```

### Fluxo de Cobrança — Ligação

```
ANTES DE DISCAR:
  available = wallet.balance - wallet.reserved_balance
  estimated_cost = 2 * 0.40  // Estima 2 minutos

  IF available < estimated_cost:
    THROW Error("INSUFFICIENT_BALANCE")
  
  reservation = CREATE wallet_reservation(amount: estimated_cost)
  wallet.reserved_balance += estimated_cost

DURANTE LIGAÇÃO:
  Saldo fica reservado
  Não debita ainda

AO FINALIZAR (conectou):
  actual_cost = Math.ceil(talk_time_seconds / 60) * 0.40
  wallet.balance -= actual_cost
  wallet.reserved_balance -= reservation.amount
  reservation.status = 'finalized'
  reservation.finalized_amount = actual_cost
  
  CREATE wallet_transaction({
    type: 'consumption',
    category: 'call',
    amount: -actual_cost,
    description: `Ligação ${minutes}min para ${phone}`
  })

SE NÃO CONECTOU:
  wallet.reserved_balance -= reservation.amount
  reservation.status = 'cancelled'
  // Não cobra nada
```

### Controle de Acesso

| Condição | Comportamento |
|----------|---------------|
| `company_members.length === 0` | Bloquear em `/aguardando-acesso` |
| `is_superadmin === true` | Acesso ao painel `/admin` |
| `role === 'operator'` | Apenas operar (fazer ligações) |
| `role === 'viewer'` | Apenas visualizar (read-only) |

### Permissões por Papel

| Recurso | Owner | Admin | Manager | Operator | Viewer |
|---------|:-----:|:-----:|:-------:|:--------:|:------:|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar campanhas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Operar (ligações) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver carteira | ✅ | ✅ | ✅ | ❌ | ❌ |
| Adicionar saldo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerenciar membros | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ✅ | ❌ | ❌ | ❌ |
| Excluir empresa | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🏗️ Arquitetura (3 Camadas A.N.T.)

### Camada 1: Arquitetura (`architecture/`)

POPs técnicos em Markdown:
- `billing.md` — Sistema de cobrança e carteira
- `calls.md` — Sistema de discagem e fila
- `appointments.md` — Sistema de agendamentos
- `access-control.md` — Controle de acesso e permissões

**Regra de Ouro:** Se a lógica mudar, atualize o POP antes de atualizar o código.

### Camada 2: Navegação (Edge Functions)

| Função | Responsabilidade |
|--------|------------------|
| `create-pix-payment` | Gerar PIX, chamar n8n, retornar QR |
| `webhook-payment-confirmation` | Receber confirmação, creditar saldo |
| `check-balance` | Verificar saldo disponível |
| `reserve-balance` | Reservar saldo para ligação |
| `finalize-call` | Finalizar ligação, debitar real |
| `get-available-slots` | Buscar horários disponíveis |
| `create-appointment` | Criar agendamento |
| `cancel-appointment` | Cancelar por token |

### Camada 3: Ferramentas (Supabase)

- **Database:** PostgreSQL com RLS
- **Auth:** Supabase Auth
- **Realtime:** Para status de operadores
- **Storage:** Logos, imagens de fundo

---

## ⚠️ Invariantes Arquiteturais (NUNCA VIOLAR)

1. **Sem saldo = Sem ação.**  
   Ligação/URA não inicia se `available_balance < estimated_cost`.

2. **Sem empresa = Sem acesso.**  
   Usuário sem `company_members` ativo é bloqueado em `/aguardando-acesso`.

3. **Callback é verdade.**  
   Status de ligação vem do provedor de telefonia via callback, não de timeout interno.

4. **Reserva antes de debitar.**  
   Sempre criar `wallet_reservation` antes da ligação, finalizar depois.

5. **Arredondamento para cima.**  
   - Ligação de 61 segundos = 2 minutos = R$ 0,80
   - URA de 31 segundos = 2 blocos = R$ 0,30

6. **Token único para cancelamento.**  
   Cada `appointment.cancel_token` é único, aleatório e não-sequencial.

7. **Round-robin atômico.**  
   Reserva de operador usa `FOR UPDATE SKIP LOCKED` para evitar race conditions.

8. **Superadmin é auditado.**  
   Todas as ações de superadmin são logadas em `admin_logs`.

9. **Recarga mínima R$ 250.**  
   `wallet_payments.amount >= 250` sempre.

10. **Isolamento por empresa.**  
    RLS garante que usuário só vê dados da própria empresa.

---

## 🔐 RLS (Row Level Security)

### Padrão de Isolamento

```sql
-- Aplicar em TODAS as tabelas com company_id
CREATE POLICY "company_isolation" ON [table]
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

### Superadmin Override

```sql
CREATE POLICY "superadmin_full_access" ON [table]
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_superadmin = true
  )
);
```

---

## 📁 Estrutura de Arquivos

```
qualify/
├── gemini.md              # ← ESTE ARQUIVO (Lei/Constituição)
├── task_plan.md           # Fases, objetivos, checklists
├── findings.md            # Pesquisas, descobertas, restrições
├── progress.md            # Log de progresso, erros, testes
├── .env                   # Chaves de API (verificar na fase Link)
│
├── architecture/          # Camada 1: POPs técnicos
│   ├── billing.md
│   ├── calls.md
│   ├── appointments.md
│   └── access-control.md
│
├── src/                   # Frontend (React + Tailwind)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── supabase/
│   ├── functions/         # Edge Functions (Camada 2)
│   │   ├── create-pix-payment/
│   │   ├── webhook-payment-confirmation/
│   │   ├── check-balance/
│   │   ├── reserve-balance/
│   │   ├── finalize-call/
│   │   ├── get-available-slots/
│   │   └── create-appointment/
│   └── migrations/        # SQL migrations
│
└── .tmp/                  # Arquivos temporários (efêmeros)
```

---

## 📋 Log de Manutenção

| Data | Mudança | Autor |
|------|---------|-------|
| 01/05/2026 | Documento criado seguindo protocolo V.L.A.E.G. | Sistema |
| | | |

---

## 🔖 Versão

**Qualify v1.0.0**

Módulos:
- [x] Sistema de Empresas e Membros
- [x] Sistema de Carteira (Billing)
- [x] Sistema de Campanhas (Ligação + URA)
- [x] Sistema de Operadores
- [x] Sistema de Leads
- [x] Sistema de Agendamentos (Calendly-like)
- [x] Painel Superadmin
- [x] Controle de Acesso por Empresa
