import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat } from 'lucide-react';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
  notes?: string | null;
}

interface PrintKitchenProps {
  order: {
    id: string;
    order_number?: number | null;
    order_type?: string | null;
    customer_name: string | null;
    created_at: string;
    notes: string | null;
    order_items?: OrderItem[];
  };
  orderNumber?: number;
}

export function PrintKitchen({ order, orderNumber }: PrintKitchenProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, restaurantInfo } = useReceiptSettings();

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getOrderTypeLabel = (type: string | null | undefined) => {
    const labels: Record<string, string> = {
      'counter': '🏪 BALCÃO',
      'table': '🍽️ MESA',
      'tab': '📋 COMANDA',
      'delivery': '🛵 ENTREGA',
      'takeaway': '🥡 RETIRADA',
    };
    return labels[type || ''] || '📋 PEDIDO';
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cozinha #${order.order_number || order.id.slice(0, 8)}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Courier New', 'Lucida Console', Monaco, monospace;
              font-size: 16px;
              font-weight: bold;
              line-height: 1.6;
              padding: 8px;
              max-width: 80mm;
              margin: 0 auto;
              color: #000 !important;
              background: #fff !important;
              -webkit-font-smoothing: none;
              text-rendering: geometricPrecision;
            }
            p, span, div {
              color: #000 !important;
              font-weight: bold !important;
            }
            .header {
              text-align: center;
              border-bottom: 4px solid #000;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: 900 !important;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .order-type {
              font-size: 22px;
              font-weight: 900 !important;
              background: #000 !important;
              color: #fff !important;
              padding: 8px 20px;
              display: inline-block;
              margin-bottom: 12px;
              letter-spacing: 2px;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              font-size: 20px;
              font-weight: 900 !important;
              align-items: center;
            }
            .order-number {
              font-size: 28px;
              font-weight: 900 !important;
            }
            .customer-name {
              font-size: 18px;
              font-weight: 900 !important;
              margin-top: 10px;
              padding: 8px;
              background: #d0d0d0 !important;
              text-align: center;
              border: 2px solid #000;
            }
            .items-section {
              margin: 16px 0;
            }
            .item {
              display: flex;
              align-items: flex-start;
              padding: 10px 0;
              border-bottom: 2px dashed #000;
            }
            .item:last-child {
              border-bottom: none;
            }
            .item-qty {
              font-size: 24px;
              font-weight: 900 !important;
              min-width: 50px;
              text-align: center;
              background: #000 !important;
              color: #fff !important;
              padding: 4px 10px;
              margin-right: 12px;
            }
            .item-name {
              font-size: 20px;
              font-weight: 900 !important;
              flex: 1;
            }
            .item-notes {
              font-size: 14px;
              font-weight: bold !important;
              font-style: italic;
              margin-top: 4px;
              padding-left: 62px;
              color: #333 !important;
            }
            .notes {
              background: #ffeb3b !important;
              border: 3px solid #000;
              padding: 12px;
              margin-top: 16px;
            }
            .notes-title {
              font-weight: 900 !important;
              font-size: 18px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .notes-content {
              font-size: 18px;
              font-weight: 900 !important;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 12px;
              border-top: 4px solid #000;
              font-size: 16px;
              font-weight: bold !important;
            }
            .time-stamp {
              font-size: 20px;
              font-weight: 900 !important;
            }
            @media print {
              body {
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                margin: 2mm;
                size: 80mm auto;
              }
              * {
                text-shadow: 0 0 0 #000 !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
        <ChefHat className="w-4 h-4" />
        Cozinha
      </Button>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <div className="header">
            {/* Restaurant name for kitchen */}
            {restaurantInfo?.name && (
              <div className="restaurant-name">{restaurantInfo.name}</div>
            )}
            
            <div className="order-type">{getOrderTypeLabel(order.order_type)}</div>
            <div className="order-info">
              <span className="order-number">
                #{order.order_number || orderNumber || order.id.slice(0, 6).toUpperCase()}
              </span>
              <span className="time-stamp">{formatTime(order.created_at)}</span>
            </div>
            {order.customer_name && (
              <div className="customer-name">
                👤 {order.customer_name}
              </div>
            )}
          </div>

          <div className="items-section">
            {order.order_items?.map((item, index) => (
              <div key={index}>
                <div className="item">
                  <span className="item-qty">{item.quantity}x</span>
                  <span className="item-name">{item.product_name}</span>
                </div>
                {item.notes && (
                  <div className="item-notes">→ {item.notes}</div>
                )}
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="notes">
              <div className="notes-title">⚠️ OBSERVAÇÕES:</div>
              <div className="notes-content">{order.notes}</div>
            </div>
          )}

          <div className="footer">
            <p>{formatDate(order.created_at)} - {formatTime(order.created_at)}</p>
          </div>
        </div>
      </div>
    </>
  );
}
