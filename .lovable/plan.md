
# Plano: Implementar Impressão de Comanda iFood

## Resumo

Implementar a impressão de comanda específica para pedidos iFood, seguindo o template oficial do iFood com:
- displayId grande e visível
- pickupCode em destaque para entregador
- Telefone parcialmente mascarado (LGPD)
- Itens com options (adicionais) indentados
- Totais detalhados (subtotal, taxa, descontos)
- Indicação de pagamento online/offline

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePrintToElectron.ts` | Adicionar função `printIFoodOrder()` |
| `src/components/ifood/IFoodOrderCard.tsx` | Adicionar botão "Imprimir" e handler |
| `electron-printer/src/services/printer.js` | Adicionar `formatIFoodReceipt()` e detectar order_type='ifood' |

---

## Detalhes da Implementação

### 1. `usePrintToElectron.ts` - Nova função `printIFoodOrder`

Adicionar método que:
- Recebe dados do pedido iFood (order_data, displayId, pickupCode, etc.)
- Cria order temporário com `order_type: 'ifood'`
- Salva metadados no campo `notes` em JSON
- Limpa o registro após 120 segundos

```typescript
const printIFoodOrder = useCallback(async (params: {
  ifoodOrderId: string;
  displayId: string;
  pickupCode?: string | null;
  localizer?: string | null;
  orderTiming: string;
  orderType: string;
  deliveredBy: string;
  customer: {
    name: string;
    phone?: string | null;
  };
  delivery?: {
    streetName?: string;
    streetNumber?: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
    city?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    options?: Array<{ name: string; quantity: number; unitPrice: number }>;
    observations?: string;
  }>;
  total: {
    subTotal: number;
    deliveryFee: number;
    benefits: number;
    orderAmount: number;
  };
  payments: Array<{
    method: string;
    value: number;
    prepaid: boolean;
  }>;
}) => {
  // Criar order temporário com order_type='ifood'
  // Electron detecta e usa formatIFoodReceipt()
})
```

### 2. `IFoodOrderCard.tsx` - Botão de Impressão

Adicionar:
- Import do hook `usePrintToElectron`
- Import do ícone `Printer`
- Prop `onPrint` para callback
- Botão "Imprimir" nos pedidos confirmados+

```tsx
// Após os botões de ação existentes
{order.status !== 'pending' && (
  <Button 
    onClick={handlePrint} 
    variant="outline"
    size="sm"
  >
    <Printer className="h-4 w-4 mr-1" />
    Imprimir
  </Button>
)}
```

### 3. `printer.js` - Formatação do Recibo iFood

#### 3.1 Modificar `printOrder()` para detectar iFood:

```javascript
async printOrder(order, options = {}) {
  const { layout = {}, restaurantInfo = {}, printerName = '' } = options;
  const isConference = order.order_type === 'conference';
  const isClosing = order.order_type === 'closing';
  const isIFood = order.order_type === 'ifood';
  
  let receipt;
  if (isClosing) {
    receipt = this.formatClosingReceipt(order, layout, restaurantInfo);
  } else if (isConference) {
    receipt = this.formatConferenceReceipt(order, layout, restaurantInfo);
  } else if (isIFood) {
    receipt = this.formatIFoodReceipt(order, layout, restaurantInfo);
  } else {
    receipt = this.formatReceipt(order, layout, restaurantInfo);
  }
  
  return this.printText(receipt, printerName, layout);
}
```

#### 3.2 Nova função `formatIFoodReceipt()`:

Template seguindo padrão oficial iFood:

```text
================================================
         [NOME RESTAURANTE]
        PEDIDO IFOOD - DELIVERY
================================================

       *** PEDIDO #XPTO ***

Data/Hora: 17/02/2025 15:30

------------------------------------------------
       CODIGO DE COLETA: 1234
------------------------------------------------

CLIENTE: Joao da Silva
TEL: (11) 98765-xxxx
LOCALIZADOR: 12345678
------------------------------------------------
ENDERECO:
Rua Example, 1234
Centro - Sao Paulo/SP
Complemento: Apt. 1234
Referencia: perto da praca
------------------------------------------------

ITENS:
------------------------------------------------
(2) X-Burguer                         R$ 59,80
      (1) - Bacon extra
      (1) - Queijo cheddar
   OBS: Sem cebola

(1) Batata Frita (G)                  R$ 18,90
   OBS: Bem crocante

(1) Refrigerante 350ml                 R$ 6,00
------------------------------------------------

Subtotal:                             R$ 84,70
Taxa de entrega:                       R$ 5,99
Desconto:                             -R$ 5,00
------------------------------------------------
TOTAL:                                R$ 85,69
------------------------------------------------

PAGAMENTO:
Cartao Credito (Online) - R$ 35,69 [PAGO]
Dinheiro (na entrega) - R$ 50,00 [A PAGAR]

------------------------------------------------
           Entrega: iFood
       Previsao: 40-50 min
------------------------------------------------

          Powered By: Gamako
================================================
```

---

## Considerações de Privacidade (LGPD)

Conforme requisito do iFood:

1. **Telefone mascarado**: Últimos 4 dígitos substituídos por "xxxx"
   - Exemplo: `(11) 98765-xxxx`
   
2. **CPF não impresso**: Campo `documentNumber` não é exibido

3. **Endereço completo**: Apenas na comanda interna, não na via do entregador

---

## Fluxo de Impressão

```text
1. Usuário clica "Imprimir" no IFoodOrderCard
         ↓
2. handlePrint() extrai dados do order_data
         ↓
3. printIFoodOrder() cria order temporário no Supabase
   - order_type: 'ifood'
   - status: 'ifood_print'
   - notes: JSON com todos os dados formatados
         ↓
4. Electron busca orders com print_status='pending'
         ↓
5. printOrder() detecta order_type='ifood'
         ↓
6. formatIFoodReceipt() gera o texto
         ↓
7. printText() envia para impressora
         ↓
8. Após 120s, order temporário é deletado
```

---

## Seção Técnica

### Estrutura do JSON no campo `notes`:

```json
{
  "isIFoodPrint": true,
  "displayId": "XPTO",
  "pickupCode": "1234",
  "localizer": "12345678",
  "orderTiming": "IMMEDIATE",
  "orderType": "DELIVERY",
  "deliveredBy": "IFOOD",
  "customer": {
    "name": "João da Silva",
    "phone": "(11) 98765-xxxx"
  },
  "delivery": {
    "streetName": "Rua Example",
    "streetNumber": "1234",
    "neighborhood": "Centro",
    "complement": "Apt. 1234",
    "reference": "perto da praça",
    "city": "São Paulo",
    "state": "SP"
  },
  "items": [
    {
      "name": "X-Burguer",
      "quantity": 2,
      "unitPrice": 29.90,
      "totalPrice": 59.80,
      "options": [
        { "name": "Bacon extra", "quantity": 1, "unitPrice": 3.00 },
        { "name": "Queijo cheddar", "quantity": 1, "unitPrice": 2.00 }
      ],
      "observations": "Sem cebola"
    }
  ],
  "total": {
    "subTotal": 84.70,
    "deliveryFee": 5.99,
    "benefits": 5.00,
    "orderAmount": 85.69
  },
  "payments": [
    { "method": "CREDIT", "value": 35.69, "prepaid": true },
    { "method": "CASH", "value": 50.00, "prepaid": false }
  ]
}
```

### Função de Mascarar Telefone:

```javascript
maskPhone(phone) {
  if (!phone) return '';
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    // Format: (XX) XXXXX-xxxx
    const ddd = digits.slice(0, 2);
    const prefix = digits.slice(2, -4);
    return '(' + ddd + ') ' + prefix + '-xxxx';
  }
  return phone;
}
```

### Labels de Pagamento:

```javascript
const paymentLabels = {
  'CREDIT': 'Cartao Credito',
  'DEBIT': 'Cartao Debito',
  'MEAL_VOUCHER': 'Vale Refeicao',
  'FOOD_VOUCHER': 'Vale Alimentacao',
  'CASH': 'Dinheiro',
  'PIX': 'PIX',
};
```

---

## Resultado Esperado

1. Botão "Imprimir" visível em pedidos iFood confirmados
2. Comanda formatada seguindo template oficial iFood
3. Código de coleta em destaque para entregador
4. Telefone mascarado para proteção de dados
5. Adicionais (options) indentados sob cada item
6. Indicação clara de pagamentos online vs na entrega
7. Compatível com impressoras térmicas 48/58/80mm
