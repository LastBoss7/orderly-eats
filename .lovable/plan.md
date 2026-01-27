
# Plano de Implementação: Homologação iFood Completa

## Contexto

O iFood solicitou validação dos critérios de homologação para todos os módulos. Após análise da documentação e do código atual, identifiquei as funcionalidades existentes e as que faltam implementar.

---

## Funcionalidades Atuais ✅

| Funcionalidade | Status |
|----------------|--------|
| Autenticação OAuth2 (client_credentials) | ✅ Implementado |
| Refresh Token | ✅ Implementado |
| Polling de eventos | ✅ Implementado |
| Webhook para receber eventos | ✅ Implementado |
| GET /orders/{id} - Detalhes do pedido | ✅ Implementado |
| POST /confirm - Confirmar pedido | ✅ Implementado |
| POST /readyToPickup - Pedido pronto | ✅ Implementado |
| POST /dispatch - Despachar pedido | ✅ Implementado |
| Conversão para pedido local | ✅ Implementado |
| Recepção de eventos (PLACED, CFM, CAN, RTP, DSP, CON) | ✅ Implementado |

---

## Funcionalidades Pendentes para Homologação 🔴

### 1. Início de Preparo (startPreparation)
**Requisito iFood:** Informar quando inicia o preparo do pedido.
- Endpoint: `POST /orders/{id}/startPreparation`
- Quando usar: Após confirmação, antes do despacho
- Melhora a experiência do cliente e otimiza entregadores parceiros

### 2. Cancelamento pelo Restaurante (requestCancellation)
**Requisito iFood:** Permitir cancelar pedidos com motivo válido.
- Endpoint: `GET /orders/{id}/cancellationReasons` - Lista motivos válidos
- Endpoint: `POST /orders/{id}/requestCancellation` - Solicita cancelamento
- Códigos de cancelamento: 501-512 (PROBLEMAS DE SISTEMA, ITEM INDISPONÍVEL, etc.)

### 3. Rastreamento de Entregador (tracking)
**Requisito iFood:** Exibir posição do entregador para pedidos com logística iFood.
- Endpoint: `GET /orders/{id}/tracking`
- Disponível após evento `ASSIGN_DRIVER`
- Atualizar a cada 30 segundos

### 4. Eventos Adicionais no Webhook
**Requisito iFood:** Processar mais eventos do ciclo de vida.
- `PREPARATION_STARTED` (PRS) - Preparo iniciado
- `ASSIGN_DRIVER` (ADR) - Entregador atribuído
- `DELIVERY_PICKUP_CODE_REQUESTED` - Código de coleta
- `ORDER_PATCHED` - Alteração parcial do pedido
- `CANCELLATION_REQUEST_FAILED` (CARF) - Falha no cancelamento
- Eventos de rota de devolução (DELIVERY_RETURNING_TO_ORIGIN, etc.)

### 5. Validação de Código de Coleta
**Requisito iFood:** Validar código do entregador na coleta.
- Endpoint: `POST /orders/{id}/validatePickupCode`
- Campo `pickupCode` nos detalhes do pedido

### 6. Tratamento de Pedidos Agendados (SCHEDULED)
**Requisito iFood:** Diferenciar pedidos imediatos de agendados.
- Campo `orderTiming` (IMMEDIATE/SCHEDULED)
- Campo `preparationStartDateTime` para início do preparo
- Prazo de confirmação: 8 minutos após `preparationStartDateTime`

### 7. Acknowledgment de Eventos
**Requisito iFood:** Confirmar recebimento de cada evento.
- Endpoint: `POST /events/acknowledgment`
- Necessário para não receber o mesmo evento repetidamente
- Já implementado no polling, mas precisa retry em caso de falha

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Pedidos iFood com Timer de 8min + Ações do Ciclo de Vida    │   │
│  │  [Aceitar] [Iniciar Preparo] [Pronto] [Despachar] [Cancelar] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Rastreio do Entregador (para logística iFood)               │   │
│  │  📍 Posição + ETA Coleta + ETA Entrega                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ ifood-auth  │  │ ifood-orders│  │ifood-webhook│                  │
│  │ (token/     │  │ (accept,    │  │ (eventos    │                  │
│  │  refresh)   │  │  prepare,   │  │  realtime)  │                  │
│  │             │  │  ready,     │  │             │                  │
│  │             │  │  dispatch,  │  │             │                  │
│  │             │  │  cancel,    │  │             │                  │
│  │             │  │  tracking)  │  │             │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementação Detalhada

### Fase 1: Edge Functions (Backend)

#### 1.1 Atualizar `ifood-orders/index.ts`
Adicionar novas ações:
- `startPreparation` - POST /orders/{id}/startPreparation
- `getCancellationReasons` - GET /orders/{id}/cancellationReasons
- `requestCancellation` - POST /orders/{id}/requestCancellation com código
- `getTracking` - GET /orders/{id}/tracking
- `validatePickupCode` - POST /orders/{id}/validatePickupCode

#### 1.2 Atualizar `ifood-webhook/index.ts`
Processar eventos adicionais:
- `PRS`/`PREPARATION_STARTED`
- `ADR`/`ASSIGN_DRIVER` - Salvar dados do entregador
- `PICKUP_CODE_REQUESTED`
- `ORDER_PATCHED` - Cancelamento parcial
- `CARF`/`CANCELLATION_REQUEST_FAILED`
- Eventos de devolução

#### 1.3 Migração de Banco de Dados
Adicionar colunas na tabela `ifood_orders`:
- `driver_name` (text)
- `driver_phone` (text)
- `pickup_code` (text)
- `tracking_available` (boolean)
- `order_timing` (text) - IMMEDIATE/SCHEDULED
- `preparation_start_at` (timestamptz)

### Fase 2: Frontend

#### 2.1 Hook `useIFoodIntegration.ts`
Adicionar métodos:
- `startPreparation(orderId)`
- `getCancellationReasons(orderId)`
- `requestCancellation(orderId, code, reason)`
- `getTracking(orderId)` - Com polling a cada 30s
- `validatePickupCode(orderId, code)`

#### 2.2 Componente `IFoodOrderCard.tsx`
Novo componente para pedidos iFood no dashboard:
- Timer visual de 8 minutos (barra de progresso)
- Badge de tipo (DELIVERY/TAKEOUT)
- Badge de timing (IMMEDIATE/SCHEDULED)
- Botões de ação contextual:
  - "Aceitar" → "Iniciar Preparo" → "Pronto"/"Despachar"
  - "Recusar" com seleção de motivo
- Dados do entregador (quando atribuído)
- Modal de rastreamento com mapa

#### 2.3 Modal `IFoodCancelModal.tsx`
- Lista motivos de cancelamento do endpoint
- Confirmação antes de enviar

#### 2.4 Modal `IFoodTrackingModal.tsx`
- Exibe posição do entregador
- ETA de coleta e entrega
- Atualização automática a cada 30s

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/ifood-orders/index.ts` | Modificar |
| `supabase/functions/ifood-webhook/index.ts` | Modificar |
| `src/hooks/useIFoodIntegration.ts` | Modificar |
| `src/components/ifood/IFoodOrderCard.tsx` | Criar |
| `src/components/ifood/IFoodCancelModal.tsx` | Criar |
| `src/components/ifood/IFoodTrackingModal.tsx` | Criar |
| `src/components/ifood/index.ts` | Criar |
| `src/pages/Dashboard.tsx` | Modificar |
| `supabase/migrations/xxx_ifood_homologation.sql` | Criar |

---

## Checklist de Homologação iFood

Após implementação, o sistema atenderá:

- [x] Recepção de pedidos (polling + webhook)
- [x] Consulta de detalhes do pedido
- [ ] **Confirmação dentro do prazo (8 min)**
- [ ] **Início de preparo**
- [ ] **Pedido pronto (readyToPickup)**
- [ ] **Despacho para entrega própria**
- [ ] **Cancelamento com motivo válido**
- [ ] **Tratamento de pedidos agendados**
- [ ] **Rastreamento de entregador (logística iFood)**
- [ ] **Validação de código de coleta**
- [ ] **Acknowledgment de eventos**
- [ ] **Tratamento de ORDER_PATCHED**

---

## Seção Técnica

### Endpoints iFood Utilizados

```text
# Autenticação
POST /authentication/v1.0/oauth/token

# Pedidos
GET  /order/v1.0/orders/{id}
POST /order/v1.0/orders/{id}/confirm
POST /order/v1.0/orders/{id}/startPreparation
POST /order/v1.0/orders/{id}/readyToPickup
POST /order/v1.0/orders/{id}/dispatch
GET  /order/v1.0/orders/{id}/cancellationReasons
POST /order/v1.0/orders/{id}/requestCancellation
POST /order/v1.0/orders/{id}/validatePickupCode
GET  /order/v1.0/orders/{id}/tracking

# Eventos
GET  /order/v1.0/events:polling
POST /order/v1.0/events/acknowledgment
```

### Migração SQL

```sql
-- Adicionar campos para rastreamento e ciclo de vida
ALTER TABLE ifood_orders 
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS pickup_code text,
  ADD COLUMN IF NOT EXISTS tracking_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_timing text DEFAULT 'IMMEDIATE',
  ADD COLUMN IF NOT EXISTS preparation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_by text; -- IFOOD ou MERCHANT
```

### Fluxo de Status do Pedido

```text
PLACED → CONFIRMED → PREPARATION_STARTED → READY_TO_PICKUP → DISPATCHED → CONCLUDED
   ↓                                                              ↓
CANCELLED ←─────────────────────────────────────────────────────────
```

---

## Estimativa de Esforço

| Fase | Descrição | Complexidade |
|------|-----------|--------------|
| 1.1 | Edge Functions - Novos endpoints | Média |
| 1.2 | Webhook - Eventos adicionais | Média |
| 1.3 | Migração de banco | Baixa |
| 2.1 | Hook atualizado | Média |
| 2.2-2.4 | Componentes de UI | Alta |

---

## Próximos Passos

1. Aprovar este plano
2. Executar migração de banco de dados
3. Atualizar Edge Functions com novos endpoints
4. Criar componentes de UI para gerenciamento de pedidos iFood
5. Integrar no Dashboard
6. Testar fluxo completo com pedidos de teste no Portal iFood
7. Solicitar homologação final ao iFood
