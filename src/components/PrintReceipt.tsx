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
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Courier New', 'Lucida Console', Monaco, monospace;
              font-size: 14px;
              font-weight: bold;
              line-height: 1.5;
              padding: 8px;
              max-width: 80mm;
              margin: 0 auto;
              color: #000 !important;
              background: #fff !important;
              -webkit-font-smoothing: none;
              text-rendering: geometricPrecision;
            }
            /* Force all text to be bold and black for thermal printers */
            p, span, div {
              color: #000 !important;
              font-weight: bold !important;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .restaurant-name {
              font-size: 20px;
              font-weight: 900 !important;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .order-type {
              font-size: 18px;
              font-weight: 900 !important;
              background: #000 !important;
              color: #fff !important;
              padding: 6px 16px;
              display: inline-block;
              margin: 8px 0;
              letter-spacing: 1px;
            }
            .order-number {
              font-size: 18px;
              font-weight: 900 !important;
              margin-top: 8px;
            }
            .section {
              border-bottom: 2px dashed #000;
              padding: 12px 0;
            }
            .section-title {
              font-weight: 900 !important;
              margin-bottom: 8px;
              text-transform: uppercase;
              font-size: 14px;
              letter-spacing: 0.5px;
            }
            .customer-info p {
              margin: 4px 0;
              font-size: 14px;
            }
            .customer-name {
              font-weight: 900 !important;
              font-size: 18px;
            }
            .items-table {
              width: 100%;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 14px;
            }
            .item-qty {
              min-width: 35px;
              text-align: left;
              font-weight: 900 !important;
              font-size: 16px;
            }
            .item-name {
              flex: 1;
              font-size: 14px;
              font-weight: bold !important;
            }
            .item-price {
              text-align: right;
              min-width: 70px;
              font-weight: bold !important;
            }
            .totals {
              padding: 12px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 14px;
            }
            .total-row.grand-total {
              font-size: 20px;
              font-weight: 900 !important;
              border-top: 3px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            .total-row.grand-total span {
              font-weight: 900 !important;
            }
            .notes {
              background: #e0e0e0 !important;
              padding: 10px;
              margin-top: 12px;
              border: 2px solid #000;
            }
            .notes-title {
              font-weight: 900 !important;
              margin-bottom: 6px;
              font-size: 14px;
            }
            .notes p {
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 16px;
              padding-top: 12px;
              border-top: 3px dashed #000;
              font-size: 14px;
            }
            .datetime {
              margin-top: 8px;
              font-size: 14px;
            }
            @media print {
              body {
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                margin: 3mm;
                size: 80mm auto;
              }
              /* Extra bold for thermal printers */
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
