// WhatsApp utilities for sending order information to customers

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
  notes?: string | null;
}

interface OrderInfo {
  orderNumber?: number | null;
  orderId: string;
  customerName?: string | null;
  orderType?: string | null;
  items?: OrderItem[];
  total?: number | null;
  deliveryFee?: number | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  status?: string | null;
  restaurantName?: string;
  paymentMethod?: 'cash' | 'credit' | 'debit' | 'pix';
  needsChange?: boolean;
  changeFor?: number | null;
}

/**
 * Format currency in BRL
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Get order type label in Portuguese
 */
const getOrderTypeLabel = (type: string | null): string => {
  switch (type) {
    case 'delivery': return 'Entrega';
    case 'takeaway': return 'Retirada';
    case 'counter': return 'Balcão';
    case 'table': return 'Mesa';
    case 'tab': return 'Comanda';
    default: return 'Pedido';
  }
};

/**
 * Get status label in Portuguese
 */
const getStatusLabel = (status: string | null): string => {
  switch (status) {
    case 'pending': return 'Aguardando confirmação';
    case 'preparing': return 'Em preparo';
    case 'ready': return 'Pronto';
    case 'out_for_delivery': return 'Saiu para entrega';
    case 'delivered': return 'Entregue';
    case 'served': return 'Servido';
    case 'cancelled': return 'Cancelado';
    default: return status || 'Desconhecido';
  }
};

/**
 * Get order display number
 */
const getOrderDisplayNumber = (orderNumber: number | null | undefined, orderId: string): string => {
  if (orderNumber) {
    return `#${orderNumber}`;
  }
  return `#${orderId.slice(0, 6).toUpperCase()}`;
};

/**
 * Format phone number to WhatsApp format (Brazil)
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If number doesn't start with country code, add Brazil's code
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  // If it already has country code
  if (cleaned.length === 12 || cleaned.length === 13) {
    return cleaned;
  }
  
  return cleaned;
};

/**
 * Get payment method label in Portuguese
 */
const getPaymentMethodLabel = (method: string | undefined): string => {
  switch (method) {
    case 'pix': return 'PIX';
    case 'cash': return 'Dinheiro';
    case 'credit': return 'Cartão de Crédito';
    case 'debit': return 'Cartão de Débito';
    default: return 'Não informado';
  }
};

/**
 * Generate clean, professional order message for WhatsApp
 */
export const generateOrderMessage = (order: OrderInfo): string => {
  const orderNum = getOrderDisplayNumber(order.orderNumber, order.orderId);
  const orderType = getOrderTypeLabel(order.orderType);
  
  let message = '';
  
  // Header - Restaurant name
  message += `*${order.restaurantName || 'Restaurante'}*\n\n`;
  
  // Order info
  message += `Pedido ${orderNum}\n`;
  message += `Tipo: ${orderType}\n`;
  
  if (order.customerName) {
    message += `Cliente: ${order.customerName}\n`;
  }
  
  message += `\n`;
  
  // Items - Clean list format
  if (order.items && order.items.length > 0) {
    message += `*Itens:*\n`;
    
    order.items.forEach((item) => {
      const itemTotal = formatCurrency(item.product_price * item.quantity);
      message += `• ${item.quantity}x ${item.product_name} — ${itemTotal}\n`;
      if (item.notes) {
        message += `  _${item.notes}_\n`;
      }
    });
    
    message += `\n`;
  }
  
  // Totals section
  const subtotal = order.items?.reduce(
    (acc, item) => acc + (item.product_price * item.quantity), 
    0
  ) || 0;
  
  if (order.deliveryFee && order.deliveryFee > 0) {
    message += `Subtotal: ${formatCurrency(subtotal)}\n`;
    message += `Taxa de entrega: ${formatCurrency(order.deliveryFee)}\n`;
  }
  
  message += `*Total: ${formatCurrency(order.total || subtotal)}*\n`;
  
  // Payment method section
  message += `\n*Pagamento:* ${getPaymentMethodLabel(order.paymentMethod)}\n`;
  
  if (order.paymentMethod === 'cash' && order.needsChange && order.changeFor) {
    message += `Troco para: ${formatCurrency(order.changeFor)}\n`;
    const changeAmount = order.changeFor - (order.total || subtotal);
    if (changeAmount > 0) {
      message += `_Troco: ${formatCurrency(changeAmount)}_\n`;
    }
  } else if (order.paymentMethod === 'cash' && !order.needsChange) {
    message += `_Sem troco necessário_\n`;
  }
  
  // Delivery address - Clean format
  if (order.orderType === 'delivery' && order.deliveryAddress) {
    message += `\n*Endereço:*\n`;
    message += `${order.deliveryAddress}\n`;
  }
  
  // Notes
  if (order.notes) {
    message += `\n*Obs:* ${order.notes}\n`;
  }
  
  return message;
};

/**
 * Generate WhatsApp link with order details
 */
export const generateWhatsAppOrderLink = (phone: string, order: OrderInfo): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const message = generateOrderMessage(order);
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

/**
 * Generate simple status update message
 */
export const generateStatusUpdateMessage = (
  orderNumber: string,
  status: string,
  restaurantName?: string
): string => {
  let message = `*${restaurantName || 'Restaurante'}*\n\n`;
  message += `Atualização do pedido ${orderNumber}:\n\n`;
  
  const statusLabel = getStatusLabel(status);
  
  switch (status) {
    case 'preparing':
      message += `Status: ${statusLabel}\n`;
      message += `Seu pedido está sendo preparado!`;
      break;
    case 'ready':
      message += `Status: ${statusLabel}\n`;
      message += `Seu pedido está pronto!`;
      break;
    case 'out_for_delivery':
      message += `Status: ${statusLabel}\n`;
      message += `Seu pedido saiu para entrega!`;
      break;
    case 'delivered':
      message += `Status: ${statusLabel}\n`;
      message += `Pedido entregue. Bom apetite!`;
      break;
    default:
      message += `Status: ${statusLabel}`;
  }
  
  return message;
};

/**
 * Generate WhatsApp link for status update
 */
export const generateWhatsAppStatusLink = (
  phone: string, 
  orderNumber: string, 
  status: string,
  restaurantName?: string
): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const message = generateStatusUpdateMessage(orderNumber, status, restaurantName);
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};
