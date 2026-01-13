import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
}

interface PrintReceiptProps {
  order: {
    id: string;
    customer_name: string | null;
    delivery_phone: string | null;
    delivery_address: string | null;
    delivery_fee: number | null;
    total: number | null;
    notes: string | null;
    created_at: string;
    payment_method?: string | null;
    print_count?: number | null;
    order_items?: OrderItem[];
  };
  restaurantName?: string;
  onPrint?: () => void;
}

export function PrintReceipt({ order, restaurantName, onPrint }: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateSubtotal = () => {
    if (!order.order_items) return 0;
    return order.order_items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Call onPrint callback to increment counter
    onPrint?.();

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comanda #${order.id.slice(0, 8)}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              padding: 10px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .order-type {
              font-size: 14px;
              font-weight: bold;
              background: #000;
              color: #fff;
              padding: 3px 10px;
              display: inline-block;
              margin: 5px 0;
            }
            .order-number {
              font-size: 14px;
              margin-top: 5px;
            }
            .section {
              border-bottom: 1px dashed #000;
              padding: 10px 0;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-size: 11px;
            }
            .customer-info p {
              margin: 2px 0;
            }
            .customer-name {
              font-weight: bold;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .item-qty {
              width: 25px;
              text-align: right;
              margin-right: 5px;
            }
            .item-name {
              flex: 1;
            }
            .item-price {
              text-align: right;
              min-width: 60px;
            }
            .totals {
              padding: 10px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .total-row.grand-total {
              font-size: 16px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .notes {
              background: #f0f0f0;
              padding: 8px;
              margin-top: 10px;
              border-radius: 4px;
            }
            .notes-title {
              font-weight: bold;
              margin-bottom: 3px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 10px;
            }
            .datetime {
              margin-top: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
              @page {
                margin: 5mm;
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
        <Printer className="w-4 h-4" />
        Imprimir
        {order.print_count && order.print_count > 0 && (
          <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
            {order.print_count}x
          </span>
        )}
      </Button>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <div className="header">
            <div className="restaurant-name">{restaurantName || 'Restaurante'}</div>
            <div className="order-type">🛵 ENTREGA</div>
            <div className="order-number">Pedido #{order.id.slice(0, 8).toUpperCase()}</div>
            <div className="datetime">{formatDate(order.created_at)}</div>
          </div>

          <div className="section customer-info">
            <div className="section-title">📋 Cliente</div>
            <p className="customer-name">{order.customer_name}</p>
            {order.delivery_phone && <p>📞 {order.delivery_phone}</p>}
          </div>

          {order.delivery_address && (
            <div className="section">
              <div className="section-title">📍 Endereço de Entrega</div>
              <p>{order.delivery_address}</p>
            </div>
          )}

          <div className="section">
            <div className="section-title">🍽️ Itens do Pedido</div>
            <div className="items-table">
              {order.order_items?.map((item, index) => (
                <div className="item-row" key={index}>
                  <span className="item-qty">{item.quantity}x</span>
                  <span className="item-name">{item.product_name}</span>
                  <span className="item-price">
                    {formatCurrency(item.product_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="total-row">
              <span>Taxa de Entrega:</span>
              <span>{formatCurrency(order.delivery_fee || 0)}</span>
            </div>
            <div className="total-row grand-total">
              <span>TOTAL:</span>
              <span>{formatCurrency(order.total || 0)}</span>
            </div>
            {order.payment_method && (
              <div className="total-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #000' }}>
                <span>💳 Pagamento:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {order.payment_method === 'pix' && 'PIX'}
                  {order.payment_method === 'cash' && 'DINHEIRO'}
                  {order.payment_method === 'credit' && 'CRÉDITO'}
                  {order.payment_method === 'debit' && 'DÉBITO'}
                  {order.payment_method === 'voucher' && 'VALE REFEIÇÃO'}
                </span>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="notes">
              <div className="notes-title">📝 Observações:</div>
              <p>{order.notes}</p>
            </div>
          )}

          <div className="footer">
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre 😊</p>
          </div>
        </div>
      </div>
    </>
  );
}
