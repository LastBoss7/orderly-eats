import { supabase } from '@/integrations/supabase/client';

interface ReceiptSettings {
  receiptHeader: string | null;
  receiptFooter: string | null;
  showAddress: boolean;
  showPhone: boolean;
  showCnpj: boolean;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  cnpj: string | null;
}

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
  receiptSettings?: ReceiptSettings;
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

  // Fetch receipt settings
  const { data: salonSettings } = await supabase
    .from('salon_settings')
    .select('receipt_header, receipt_footer, show_address_on_receipt, show_phone_on_receipt, show_cnpj_on_receipt')
    .eq('restaurant_id', restaurantId)
    .single();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('logo_url, address, phone, cnpj')
    .eq('id', restaurantId)
    .single();

  const receiptSettings: ReceiptSettings = {
    receiptHeader: salonSettings?.receipt_header || null,
    receiptFooter: salonSettings?.receipt_footer || null,
    showAddress: salonSettings?.show_address_on_receipt ?? true,
    showPhone: salonSettings?.show_phone_on_receipt ?? true,
    showCnpj: salonSettings?.show_cnpj_on_receipt ?? true,
    logoUrl: restaurant?.logo_url || null,
    address: restaurant?.address || null,
    phone: restaurant?.phone || null,
    cnpj: restaurant?.cnpj || null,
  };

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
    receiptSettings,
  };
}

export function printDailyReport(data: DailyReportData) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const settings = data.receiptSettings;

  const logoHtml = settings?.logoUrl 
    ? `<img src="${settings.logoUrl}" alt="Logo" class="logo" />`
    : '';

  const headerHtml = settings?.receiptHeader 
    ? `<div class="custom-header">${settings.receiptHeader}</div>`
    : '';

  const restaurantInfoHtml = `
    ${settings?.showAddress && settings?.address ? `<div class="info-text">${settings.address}</div>` : ''}
    ${settings?.showPhone && settings?.phone ? `<div class="info-text">Tel: ${settings.phone}</div>` : ''}
    ${settings?.showCnpj && settings?.cnpj ? `<div class="info-text">CNPJ: ${settings.cnpj}</div>` : ''}
  `;

  const footerHtml = settings?.receiptFooter 
    ? `<div class="custom-footer">${settings.receiptFooter}</div>`
    : '';

  const printContent = `
    <div class="header">
      ${logoHtml}
      <div class="restaurant-name">${data.restaurantName}</div>
      ${headerHtml}
      ${restaurantInfoHtml}
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
      ${footerHtml}
      <p>Relatório gerado automaticamente</p>
      <p>${new Date().toLocaleString('pt-BR')}</p>
      <p style="margin-top: 10px; font-weight: bold;">Powered By: Gamako</p>
      <p>Cadastre já: gamako.com.br</p>
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
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            padding: 10px;
            max-width: 80mm;
            margin: 0 auto;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .logo {
            max-width: 120px;
            max-height: 60px;
            margin: 0 auto 10px;
            display: block;
          }
          .restaurant-name {
            font-size: 20px;
            font-weight: 900;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .custom-header {
            font-size: 12px;
            margin-bottom: 6px;
            white-space: pre-line;
          }
          .info-text {
            font-size: 11px;
            color: #333;
            margin: 2px 0;
          }
          .report-title {
            font-size: 16px;
            font-weight: 900;
            background: #000;
            color: #fff;
            padding: 8px 12px;
            margin: 10px 0;
            letter-spacing: 1px;
          }
          .date {
            font-size: 14px;
            font-weight: 700;
            margin-top: 8px;
          }
          .custom-footer {
            font-size: 12px;
            margin-bottom: 8px;
            white-space: pre-line;
            font-style: italic;
          }
          .section {
            border-bottom: 2px dashed #000;
            padding: 12px 0;
          }
          .section-title {
            font-weight: 900;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-size: 13px;
            background: #e0e0e0;
            padding: 6px 8px;
            border: 1px solid #000;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            padding: 4px 0;
            font-weight: 600;
          }
          .info-row span:first-child {
            font-weight: 600;
          }
          .info-row span:last-child {
            font-weight: 800;
          }
          .info-row.grand-total {
            font-size: 18px;
            font-weight: 900;
            border-top: 3px solid #000;
            padding-top: 12px;
            margin-top: 12px;
            background: #f5f5f5;
            padding: 12px 8px;
            border: 2px solid #000;
          }
          .empty {
            font-style: italic;
            color: #444;
            text-align: center;
            padding: 8px;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 3px solid #000;
            font-size: 12px;
            font-weight: 600;
          }
          .footer p {
            margin: 4px 0;
          }
          @media print {
            body {
              padding: 0;
              font-size: 14px;
            }
            @page {
              margin: 3mm;
              size: 80mm auto;
            }
            .report-title {
              background: #000 !important;
              color: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section-title {
              background: #e0e0e0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              try {
                window.print();
              } catch(e) {
                console.error('Print error:', e);
              }
              setTimeout(function() {
                window.close();
              }, 1000);
            }, 300);
          };
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
