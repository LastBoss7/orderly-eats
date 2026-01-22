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
    case 'delivery': return 'Delivery';
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
    case 'pending': return '⏳ Pendente';
    case 'preparing': return '👨‍🍳 Em preparo';
    case 'ready': return '✅ Pronto';
    case 'out_for_delivery': return '🚚 Saiu para entrega';
    case 'delivered': return '🎉 Entregue';
    case 'served': return '🍽️ Servido';
    case 'cancelled': return '❌ Cancelado';
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
 * Generate order message for WhatsApp
 */
export const generateOrderMessage = (order: OrderInfo): string => {
  const orderNum = getOrderDisplayNumber(order.orderNumber, order.orderId);
  const orderType = getOrderTypeLabel(order.orderType);
  const status = getStatusLabel(order.status);
  
  let message = `🍽️ *${order.restaurantName || 'Restaurante'}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `📋 *PEDIDO ${orderNum}*\n`;
  message += `Tipo: ${orderType}\n`;
  message += `Status: ${status}\n`;
  
  if (order.customerName) {
    message += `Cliente: ${order.customerName}\n`;
  }
  
  message += `\n`;
  
  // Items
  if (order.items && order.items.length > 0) {
    message += `📝 *ITENS DO PEDIDO:*\n`;
    message += `───────────────────\n`;
    
    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.quantity}x ${item.product_name}\n`;
      message += `   ${formatCurrency(item.product_price * item.quantity)}\n`;
      if (item.notes) {
        message += `   _📌 ${item.notes}_\n`;
      }
    });
    
    message += `───────────────────\n\n`;
  }
  
  // Totals
  const subtotal = order.items?.reduce(
    (acc, item) => acc + (item.product_price * item.quantity), 
    0
  ) || 0;
  
  if (order.deliveryFee && order.deliveryFee > 0) {
    message += `Subtotal: ${formatCurrency(subtotal)}\n`;
    message += `Taxa de entrega: ${formatCurrency(order.deliveryFee)}\n`;
  }
  
  message += `\n💰 *TOTAL: ${formatCurrency(order.total || subtotal)}*\n\n`;
  
  // Delivery address
  if (order.orderType === 'delivery' && order.deliveryAddress) {
    message += `📍 *ENDEREÇO DE ENTREGA:*\n`;
    message += `${order.deliveryAddress}\n\n`;
  }
  
  // Notes
  if (order.notes) {
    message += `📝 *Observações:*\n`;
    message += `${order.notes}\n\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Obrigado pela preferência! 🙏`;
  
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
  let message = `🍽️ *${restaurantName || 'Restaurante'}*\n\n`;
  message += `Olá! Atualização do seu pedido ${orderNumber}:\n\n`;
  message += `${getStatusLabel(status)}\n\n`;
  
  switch (status) {
    case 'preparing':
      message += `Seu pedido está sendo preparado com carinho! 👨‍🍳`;
      break;
    case 'ready':
      message += `Seu pedido está pronto! ✨`;
      break;
    case 'out_for_delivery':
      message += `Seu pedido saiu para entrega! 🏍️`;
      break;
    case 'delivered':
      message += `Pedido entregue! Bom apetite! 🎉`;
      break;
    default:
      message += `Obrigado pela preferência! 🙏`;
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
