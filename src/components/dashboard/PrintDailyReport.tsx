import { supabase } from '@/integrations/supabase/client';

interface DailyReportData {
  restaurantName: string;
  date: string;
  openedAt: string;
  closedAt: string;
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  paymentBreakdown: {
    method: string;
    count: number;
    total: number;
  }[];
  orderTypeBreakdown: {
    type: string;
    count: number;
    total: number;
  }[];
  cancelledOrders: number;
}

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  cash: 'Dinheiro',
  voucher: 'Vale Refeição',
};

const orderTypeLabels: Record<string, string> = {
  counter: 'Balcão',
  table: 'Mesa',
  delivery: 'Delivery',
  takeaway: 'Para Levar',
};

export async function fetchDailyReportData(
  restaurantId: string,
  restaurantName: string,
  openedAt: string | null
): Promise<DailyReportData> {
  const now = new Date();
  const startOfDay = openedAt ? new Date(openedAt) : new Date(now.setHours(0, 0, 0, 0));

  // Fetch orders for the day
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', new Date().toISOString());

  const allOrders = orders || [];
  const closedOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'pending');
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');

  // Calculate totals
  const totalRevenue = closedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const averageTicket = closedOrders.length > 0 ? totalRevenue / closedOrders.length : 0;

  // Payment breakdown
  const paymentMap = new Map<string, { count: number; total: number }>();
  closedOrders.forEach(order => {
    const method = order.payment_method || 'não informado';
    const current = paymentMap.get(method) || { count: 0, total: 0 };
    paymentMap.set(method, {
      count: current.count + 1,
      total: current.total + (order.total || 0),
    });
  });

  const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
    method: paymentMethodLabels[method] || method,
    count: data.count,
    total: data.total,
  }));

  // Order type breakdown
  const typeMap = new Map<string, { count: number; total: number }>();
  closedOrders.forEach(order => {
    const type = order.order_type || 'counter';
    const current = typeMap.get(type) || { count: 0, total: 0 };
    typeMap.set(type, {
      count: current.count + 1,
      total: current.total + (order.total || 0),
    });
  });

  const orderTypeBreakdown = Array.from(typeMap.entries()).map(([type, data]) => ({
    type: orderTypeLabels[type] || type,
    count: data.count,
    total: data.total,
  }));

  return {
    restaurantName,
    date: now.toLocaleDateString('pt-BR'),
    openedAt: openedAt ? new Date(openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
    closedAt: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    totalOrders: closedOrders.length,
    totalRevenue,
    averageTicket,
    paymentBreakdown,
    orderTypeBreakdown,
    cancelledOrders: cancelledOrders.length,
  };
}

export function printDailyReport(data: DailyReportData) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const printContent = `
    <div class="header">
      <div class="restaurant-name">${data.restaurantName}</div>
      <div class="report-title">RELATÓRIO DE FECHAMENTO</div>
      <div class="date">${data.date}</div>
    </div>

    <div class="section">
      <div class="section-title">⏰ PERÍODO</div>
      <div class="info-row">
        <span>Abertura:</span>
        <span>${data.openedAt}</span>
      </div>
      <div class="info-row">
        <span>Fechamento:</span>
        <span>${data.closedAt}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📊 RESUMO</div>
      <div class="info-row">
        <span>Total de Pedidos:</span>
        <span>${data.totalOrders}</span>
      </div>
      <div class="info-row">
        <span>Pedidos Cancelados:</span>
        <span>${data.cancelledOrders}</span>
      </div>
      <div class="info-row">
        <span>Ticket Médio:</span>
        <span>${formatCurrency(data.averageTicket)}</span>
      </div>
      <div class="info-row grand-total">
        <span>FATURAMENTO TOTAL:</span>
        <span>${formatCurrency(data.totalRevenue)}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💳 FORMAS DE PAGAMENTO</div>
      ${data.paymentBreakdown.length > 0 ? data.paymentBreakdown.map(p => `
        <div class="info-row">
          <span>${p.method} (${p.count}x):</span>
          <span>${formatCurrency(p.total)}</span>
        </div>
      `).join('') : '<div class="empty">Nenhum pagamento registrado</div>'}
    </div>

    <div class="section">
      <div class="section-title">🍽️ TIPOS DE PEDIDO</div>
      ${data.orderTypeBreakdown.length > 0 ? data.orderTypeBreakdown.map(t => `
        <div class="info-row">
          <span>${t.type} (${t.count}x):</span>
          <span>${formatCurrency(t.total)}</span>
        </div>
      `).join('') : '<div class="empty">Nenhum pedido registrado</div>'}
    </div>

    <div class="footer">
      <p>Relatório gerado automaticamente</p>
      <p>${new Date().toLocaleString('pt-BR')}</p>
    </div>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório de Fechamento - ${data.date}</title>
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
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 14px;
            font-weight: bold;
            background: #000;
            color: #fff;
            padding: 5px 10px;
            margin: 8px 0;
          }
          .date {
            font-size: 12px;
            margin-top: 5px;
          }
          .section {
            border-bottom: 1px dashed #000;
            padding: 10px 0;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-size: 11px;
            background: #f0f0f0;
            padding: 3px 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            padding: 2px 0;
          }
          .info-row.grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-top: 8px;
          }
          .empty {
            font-style: italic;
            color: #666;
            text-align: center;
            padding: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #000;
            font-size: 10px;
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
        ${printContent}
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
}
