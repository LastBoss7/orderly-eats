import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat } from 'lucide-react';

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
}

interface PrintKitchenProps {
  order: {
    id: string;
    customer_name: string | null;
    created_at: string;
    notes: string | null;
    order_items?: OrderItem[];
  };
  orderNumber?: number;
}

export function PrintKitchen({ order, orderNumber }: PrintKitchenProps) {
  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cozinha #${order.id.slice(0, 8)}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
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
            .items-section {
              margin: 15px 0;
            }
            .item {
              display: flex;
              align-items: flex-start;
              padding: 8px 0;
              border-bottom: 1px dashed #ccc;
            }
            .item:last-child {
              border-bottom: none;
            }
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
            .time-stamp {
              font-size: 16px;
              font-weight: bold;
            }
            @media print {
              body {
                padding: 0;
              }
              @page {
                margin: 3mm;
                size: 80mm auto;
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
            <div className="order-type">🛵 ENTREGA</div>
            <div className="order-info">
              <span className="order-number">#{order.id.slice(0, 6).toUpperCase()}</span>
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
              <div className="item" key={index}>
                <span className="item-qty">{item.quantity}x</span>
                <span className="item-name">{item.product_name}</span>
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
