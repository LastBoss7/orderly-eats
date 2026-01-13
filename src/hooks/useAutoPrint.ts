import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
  notes?: string | null;
}

interface PrintOrderData {
  id: string;
  order_type: 'table' | 'counter' | 'delivery';
  table_number?: number | null;
  customer_name?: string | null;
  created_at: string;
  total: number;
  notes?: string | null;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  delivery_fee?: number | null;
  items: OrderItem[];
}

export function useAutoPrint() {
  const { restaurant } = useAuth();

  const logPrintEvent = useCallback(async (
    orderId: string,
    status: 'success' | 'error' | 'pending',
    eventType: string = 'print',
    printerName?: string,
    errorMessage?: string,
    itemsCount?: number,
    orderNumber?: string
  ) => {
    if (!restaurant?.id) return;

    try {
      await supabase.from('print_logs').insert({
        restaurant_id: restaurant.id,
        order_id: orderId,
        order_number: orderNumber,
        status,
        event_type: eventType,
        printer_name: printerName,
        error_message: errorMessage,
        items_count: itemsCount,
      });
    } catch (err) {
      console.error('Error logging print event:', err);
    }
  }, [restaurant?.id]);

  const generateKitchenReceipt = useCallback((order: PrintOrderData): string => {
    const formatTime = (date: string) => 
      new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const formatDate = (date: string) => 
      new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const getOrderTypeLabel = (type: string, tableNumber?: number | null) => {
      if (type === 'table' && tableNumber) return `🍽️ MESA ${tableNumber}`;
      if (type === 'delivery') return '🛵 ENTREGA';
      return '🏪 BALCÃO';
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cozinha #${order.id.slice(0, 6)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.5;
              padding: 10px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .order-type {
              font-size: 18px;
              font-weight: bold;
              background: #000;
              color: #fff;
              padding: 5px 15px;
              display: inline-block;
              margin-bottom: 10px;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: bold;
            }
            .order-number {
              font-size: 24px;
              font-weight: bold;
            }
            .customer-name {
              font-size: 14px;
              margin-top: 5px;
              padding: 5px;
              background: #f0f0f0;
              text-align: center;
            }
            .items-section { margin: 15px 0; }
            .item {
              display: flex;
              align-items: flex-start;
              padding: 8px 0;
              border-bottom: 1px dashed #ccc;
            }
            .item:last-child { border-bottom: none; }
            .item-qty {
              font-size: 20px;
              font-weight: bold;
              min-width: 40px;
              text-align: center;
              background: #000;
              color: #fff;
              padding: 2px 8px;
              margin-right: 10px;
            }
            .item-name {
              font-size: 16px;
              font-weight: bold;
              flex: 1;
            }
            .item-notes {
              font-size: 12px;
              color: #666;
              margin-left: 50px;
              font-style: italic;
            }
            .notes {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 10px;
              margin-top: 15px;
            }
            .notes-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .notes-content {
              font-size: 14px;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #000;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 3mm; size: 80mm auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="order-type">${getOrderTypeLabel(order.order_type, order.table_number)}</div>
            <div class="order-info">
              <span class="order-number">#${order.id.slice(0, 6).toUpperCase()}</span>
              <span>${formatTime(order.created_at)}</span>
            </div>
            ${order.customer_name ? `<div class="customer-name">👤 ${order.customer_name}</div>` : ''}
          </div>

          <div class="items-section">
            ${order.items.map(item => `
              <div class="item">
                <span class="item-qty">${item.quantity}x</span>
                <span class="item-name">${item.product_name}</span>
              </div>
              ${item.notes ? `<div class="item-notes">⚠️ ${item.notes}</div>` : ''}
            `).join('')}
          </div>

          ${order.notes ? `
            <div class="notes">
              <div class="notes-title">⚠️ OBSERVAÇÕES:</div>
              <div class="notes-content">${order.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <p>${formatDate(order.created_at)} - ${formatTime(order.created_at)}</p>
          </div>
        </body>
      </html>
    `;
  }, []);

  const printOrder = useCallback(async (order: PrintOrderData): Promise<boolean> => {
    try {
      const receiptHtml = generateKitchenReceipt(order);
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        toast.error('Bloqueador de pop-up detectado. Permita pop-ups para imprimir.');
        await logPrintEvent(
          order.id, 
          'error', 
          'auto_print', 
          undefined, 
          'Pop-up blocked',
          order.items.length,
          order.id.slice(0, 6).toUpperCase()
        );
        return false;
      }

      printWindow.document.write(receiptHtml);
      printWindow.document.write(`
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      `);
      printWindow.document.close();

      // Log successful print
      await logPrintEvent(
        order.id,
        'success',
        'auto_print',
        'Browser Print',
        undefined,
        order.items.length,
        order.id.slice(0, 6).toUpperCase()
      );

      // Mark order as printed
      await supabase
        .from('orders')
        .update({
          print_status: 'printed',
          printed_at: new Date().toISOString(),
          print_count: 1,
        })
        .eq('id', order.id);

      return true;
    } catch (err: any) {
      console.error('Print error:', err);
      await logPrintEvent(
        order.id,
        'error',
        'auto_print',
        undefined,
        err.message,
        order.items.length,
        order.id.slice(0, 6).toUpperCase()
      );
      return false;
    }
  }, [generateKitchenReceipt, logPrintEvent]);

  const autoPrintTableOrder = useCallback(async (
    orderId: string,
    tableNumber: number,
    items: OrderItem[],
    total: number,
    customerName?: string | null,
    notes?: string | null
  ): Promise<boolean> => {
    const orderData: PrintOrderData = {
      id: orderId,
      order_type: 'table',
      table_number: tableNumber,
      customer_name: customerName,
      created_at: new Date().toISOString(),
      total,
      notes,
      items,
    };

    const success = await printOrder(orderData);
    
    if (success) {
      toast.success('Pedido enviado para impressão!', {
        description: `Mesa ${tableNumber} - ${items.length} item(s)`,
      });
    }

    return success;
  }, [printOrder]);

  return {
    printOrder,
    autoPrintTableOrder,
    logPrintEvent,
  };
}
