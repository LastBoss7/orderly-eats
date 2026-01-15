import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Eye } from 'lucide-react';

export interface PrintLayout {
  paperSize: '58mm' | '80mm';
  paperWidth: number;
  showLogo: boolean;
  showRestaurantName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showCnpj: boolean;
  receiptTitle: string;
  showOrderNumber: boolean;
  showOrderType: boolean;
  showTable: boolean;
  showWaiter: boolean;
  showItemPrices: boolean;
  showItemNotes: boolean;
  showItemSize: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;
  showDeliveryAddress: boolean;
  showDateTime: boolean;
  showTotals: boolean;
  showDeliveryFee: boolean;
  showPaymentMethod: boolean;
  footerMessage: string;
  fontSize: 'small' | 'normal' | 'large';
  boldItems: boolean;
  boldTotal: boolean;
}

const defaultLayout: PrintLayout = {
  paperSize: '80mm',
  paperWidth: 48,
  showLogo: false,
  showRestaurantName: true,
  showAddress: false,
  showPhone: false,
  showCnpj: false,
  receiptTitle: '*** PEDIDO ***',
  showOrderNumber: true,
  showOrderType: true,
  showTable: true,
  showWaiter: true,
  showItemPrices: true,
  showItemNotes: true,
  showItemSize: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showDeliveryAddress: true,
  showDateTime: true,
  showTotals: true,
  showDeliveryFee: true,
  showPaymentMethod: true,
  footerMessage: 'Obrigado pela preferência!',
  fontSize: 'normal',
  boldItems: true,
  boldTotal: true,
};

// Sample order for preview
const sampleOrder = {
  id: 'ABC12345',
  order_number: 42,
  order_type: 'delivery',
  table_id: null,
  table_number: 5,
  waiter_name: 'João',
  customer_name: 'Maria Silva',
  delivery_phone: '(11) 98888-7777',
  delivery_address: 'Av. Brasil, 456, Ap 12 - Centro',
  delivery_fee: 8.00,
  total: 98.30,
  payment_method: 'pix',
  notes: 'Tocar campainha 2x',
  created_at: new Date().toISOString(),
  order_items: [
    { quantity: 2, product_name: 'X-Burguer Especial', product_price: 29.90, product_size: 'Grande', notes: null },
    { quantity: 1, product_name: 'Batata Frita', product_price: 18.50, product_size: 'Média', notes: 'Sem sal' },
    { quantity: 2, product_name: 'Refrigerante', product_price: 6.00, product_size: null, notes: null },
  ]
};

interface RestaurantInfo {
  name: string;
  phone: string | null;
  address: string | null;
  cnpj: string | null;
}

export function ReceiptLayoutEditor() {
  const { restaurant } = useAuth();
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;
    
    setLoading(true);
    try {
      // Fetch restaurant info
      const { data: restData } = await supabase
        .from('restaurants')
        .select('name, phone, address, cnpj')
        .eq('id', restaurant.id)
        .single();

      if (restData) {
        setRestaurantInfo(restData);
      }

      // Fetch print layout
      const { data: salonData } = await supabase
        .from('salon_settings')
        .select('print_layout')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (salonData?.print_layout) {
        const savedLayout = salonData.print_layout as unknown as Partial<PrintLayout>;
        setLayout({ ...defaultLayout, ...savedLayout });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;
    
    setSaving(true);
    try {
      // First check if a record exists
      const { data: existingRecord } = await supabase
        .from('salon_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      let error;
      if (existingRecord) {
        // Update existing record
        const result = await supabase
          .from('salon_settings')
          .update({ print_layout: JSON.parse(JSON.stringify(layout)) })
          .eq('restaurant_id', restaurant.id);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('salon_settings')
          .insert([{ 
            restaurant_id: restaurant.id, 
            print_layout: JSON.parse(JSON.stringify(layout))
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast.success('Layout salvo com sucesso!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Erro ao salvar layout');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLayout(defaultLayout);
    setHasChanges(true);
  };

  const updateLayout = (key: keyof PrintLayout, value: any) => {
    setLayout(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handlePaperSizeChange = (size: '58mm' | '80mm') => {
    setLayout(prev => ({
      ...prev,
      paperSize: size,
      paperWidth: size === '58mm' ? 32 : 48,
    }));
    setHasChanges(true);
  };

  // Generate preview
  const generatePreview = () => {
    const width = layout.paperWidth;
    const divider = '═'.repeat(width);
    const thinDivider = '─'.repeat(width);
    const lines: string[] = [];

    const center = (text: string) => {
      if (text.length >= width) return text.slice(0, width);
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(padding) + text;
    };

    const alignBoth = (left: string, right: string) => {
      const totalLen = left.length + right.length;
      if (totalLen >= width) return left + right;
      const padding = width - totalLen;
      return left + ' '.repeat(padding) + right;
    };

    // Header
    if (layout.showRestaurantName && restaurantInfo?.name) {
      lines.push(center(restaurantInfo.name.toUpperCase()));
    }

    if (layout.showAddress && restaurantInfo?.address) {
      lines.push(center(restaurantInfo.address));
    }

    if (layout.showPhone && restaurantInfo?.phone) {
      lines.push(center(`Tel: ${restaurantInfo.phone}`));
    }

    if (layout.showCnpj && restaurantInfo?.cnpj) {
      lines.push(center(`CNPJ: ${restaurantInfo.cnpj}`));
    }

    if (layout.showRestaurantName || layout.showAddress || layout.showPhone || layout.showCnpj) {
      lines.push('');
    }

    // Title
    lines.push(center(layout.receiptTitle || '*** PEDIDO ***'));
    lines.push('');
    lines.push(divider);

    // Order number
    if (layout.showOrderNumber) {
      const orderNum = sampleOrder.order_number || sampleOrder.id.slice(0, 8).toUpperCase();
      lines.push(center(`#${orderNum}`));
      lines.push('');
    }

    // Order info
    if (layout.showOrderType) {
      const orderTypeLabels: Record<string, string> = {
        'counter': 'BALCÃO',
        'table': 'MESA',
        'delivery': 'ENTREGA'
      };
      lines.push(`Tipo: ${orderTypeLabels[sampleOrder.order_type] || sampleOrder.order_type}`);
    }

    if (layout.showTable && sampleOrder.table_number) {
      lines.push(`Mesa: ${sampleOrder.table_number}`);
    }

    if (layout.showWaiter && sampleOrder.waiter_name) {
      lines.push(`Garçom: ${sampleOrder.waiter_name}`);
    }

    // Customer info
    if (layout.showCustomerName && sampleOrder.customer_name) {
      lines.push(`Cliente: ${sampleOrder.customer_name}`);
    }

    if (layout.showCustomerPhone && sampleOrder.delivery_phone) {
      lines.push(`Tel: ${sampleOrder.delivery_phone}`);
    }

    if (layout.showDeliveryAddress && sampleOrder.delivery_address) {
      // Wrap long address
      const addr = sampleOrder.delivery_address;
      if (addr.length > width - 5) {
        lines.push(`End: ${addr.slice(0, width - 5)}`);
        lines.push(`     ${addr.slice(width - 5)}`);
      } else {
        lines.push(`End: ${addr}`);
      }
    }

    lines.push('');
    lines.push(divider);
    lines.push('');

    // Items header
    lines.push('ITENS:');
    lines.push(thinDivider);

    // Items
    for (const item of sampleOrder.order_items) {
      const qty = item.quantity || 1;
      let itemLine = `${qty}x ${item.product_name}`;
      
      if (layout.showItemSize && item.product_size) {
        itemLine += ` (${item.product_size})`;
      }

      // Truncate if too long
      if (itemLine.length > width) {
        itemLine = itemLine.slice(0, width - 1) + '…';
      }
      
      lines.push(itemLine);

      if (layout.showItemPrices) {
        const price = (item.product_price * qty).toFixed(2);
        lines.push(alignBoth('', `R$ ${price}`));
      }

      if (layout.showItemNotes && item.notes) {
        lines.push(`   ↳ ${item.notes}`);
      }
    }

    lines.push('');
    lines.push(thinDivider);

    // Notes
    if (sampleOrder.notes) {
      lines.push('');
      lines.push('OBS: ' + sampleOrder.notes);
      lines.push('');
    }

    // Totals
    if (layout.showTotals) {
      if (layout.showDeliveryFee && sampleOrder.delivery_fee > 0) {
        lines.push(alignBoth('Taxa entrega:', `R$ ${sampleOrder.delivery_fee.toFixed(2)}`));
      }

      lines.push('');
      lines.push(alignBoth('TOTAL:', `R$ ${sampleOrder.total.toFixed(2)}`));
    }

    if (layout.showPaymentMethod && sampleOrder.payment_method) {
      const paymentLabels: Record<string, string> = {
        'cash': 'Dinheiro',
        'credit': 'Crédito',
        'debit': 'Débito',
        'pix': 'PIX',
      };
      lines.push(alignBoth('Pagamento:', paymentLabels[sampleOrder.payment_method] || sampleOrder.payment_method));
    }

    lines.push('');
    lines.push(divider);

    // Footer
    if (layout.showDateTime) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lines.push(center(`${dateStr} ${timeStr}`));
    }

    if (layout.footerMessage) {
      lines.push('');
      lines.push(center(layout.footerMessage));
    }

    return lines.join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Settings Panel */}
      <div className="space-y-6">
        {/* Paper Size */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tamanho do Papel</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={layout.paperSize}
              onValueChange={(val) => handlePaperSizeChange(val as '58mm' | '80mm')}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem value="58mm" id="paper-58" className="peer sr-only" />
                <Label
                  htmlFor="paper-58"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <span className="text-lg font-semibold">58mm</span>
                  <span className="text-xs text-muted-foreground">32 caracteres</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="80mm" id="paper-80" className="peer sr-only" />
                <Label
                  htmlFor="paper-80"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <span className="text-lg font-semibold">80mm</span>
                  <span className="text-xs text-muted-foreground">48 caracteres</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Header Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cabeçalho</CardTitle>
            <CardDescription>Informações do estabelecimento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showRestaurantName" className="cursor-pointer">Nome do restaurante</Label>
              <Switch
                id="showRestaurantName"
                checked={layout.showRestaurantName}
                onCheckedChange={(checked) => updateLayout('showRestaurantName', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showAddress" className="cursor-pointer">Endereço</Label>
              <Switch
                id="showAddress"
                checked={layout.showAddress}
                onCheckedChange={(checked) => updateLayout('showAddress', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showPhone" className="cursor-pointer">Telefone</Label>
              <Switch
                id="showPhone"
                checked={layout.showPhone}
                onCheckedChange={(checked) => updateLayout('showPhone', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showCnpj" className="cursor-pointer">CNPJ</Label>
              <Switch
                id="showCnpj"
                checked={layout.showCnpj}
                onCheckedChange={(checked) => updateLayout('showCnpj', checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="receiptTitle">Título do cupom</Label>
              <Input
                id="receiptTitle"
                value={layout.receiptTitle}
                onChange={(e) => updateLayout('receiptTitle', e.target.value)}
                placeholder="*** PEDIDO ***"
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showOrderNumber" className="cursor-pointer">Número do pedido</Label>
              <Switch
                id="showOrderNumber"
                checked={layout.showOrderNumber}
                onCheckedChange={(checked) => updateLayout('showOrderNumber', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showOrderType" className="cursor-pointer">Tipo de pedido</Label>
              <Switch
                id="showOrderType"
                checked={layout.showOrderType}
                onCheckedChange={(checked) => updateLayout('showOrderType', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showTable" className="cursor-pointer">Número da mesa</Label>
              <Switch
                id="showTable"
                checked={layout.showTable}
                onCheckedChange={(checked) => updateLayout('showTable', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showWaiter" className="cursor-pointer">Nome do garçom</Label>
              <Switch
                id="showWaiter"
                checked={layout.showWaiter}
                onCheckedChange={(checked) => updateLayout('showWaiter', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showDateTime" className="cursor-pointer">Data e hora</Label>
              <Switch
                id="showDateTime"
                checked={layout.showDateTime}
                onCheckedChange={(checked) => updateLayout('showDateTime', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showCustomerName" className="cursor-pointer">Nome do cliente</Label>
              <Switch
                id="showCustomerName"
                checked={layout.showCustomerName}
                onCheckedChange={(checked) => updateLayout('showCustomerName', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showCustomerPhone" className="cursor-pointer">Telefone do cliente</Label>
              <Switch
                id="showCustomerPhone"
                checked={layout.showCustomerPhone}
                onCheckedChange={(checked) => updateLayout('showCustomerPhone', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showDeliveryAddress" className="cursor-pointer">Endereço de entrega</Label>
              <Switch
                id="showDeliveryAddress"
                checked={layout.showDeliveryAddress}
                onCheckedChange={(checked) => updateLayout('showDeliveryAddress', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showItemPrices" className="cursor-pointer">Mostrar preços</Label>
              <Switch
                id="showItemPrices"
                checked={layout.showItemPrices}
                onCheckedChange={(checked) => updateLayout('showItemPrices', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showItemSize" className="cursor-pointer">Mostrar tamanho</Label>
              <Switch
                id="showItemSize"
                checked={layout.showItemSize}
                onCheckedChange={(checked) => updateLayout('showItemSize', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showItemNotes" className="cursor-pointer">Mostrar observações</Label>
              <Switch
                id="showItemNotes"
                checked={layout.showItemNotes}
                onCheckedChange={(checked) => updateLayout('showItemNotes', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="boldItems" className="cursor-pointer">Itens em negrito</Label>
              <Switch
                id="boldItems"
                checked={layout.boldItems}
                onCheckedChange={(checked) => updateLayout('boldItems', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals & Footer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totais e Rodapé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showTotals" className="cursor-pointer">Mostrar total</Label>
              <Switch
                id="showTotals"
                checked={layout.showTotals}
                onCheckedChange={(checked) => updateLayout('showTotals', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showDeliveryFee" className="cursor-pointer">Taxa de entrega</Label>
              <Switch
                id="showDeliveryFee"
                checked={layout.showDeliveryFee}
                onCheckedChange={(checked) => updateLayout('showDeliveryFee', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showPaymentMethod" className="cursor-pointer">Forma de pagamento</Label>
              <Switch
                id="showPaymentMethod"
                checked={layout.showPaymentMethod}
                onCheckedChange={(checked) => updateLayout('showPaymentMethod', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="boldTotal" className="cursor-pointer">Total em negrito</Label>
              <Switch
                id="boldTotal"
                checked={layout.boldTotal}
                onCheckedChange={(checked) => updateLayout('boldTotal', checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="footerMessage">Mensagem do rodapé</Label>
              <Textarea
                id="footerMessage"
                value={layout.footerMessage}
                onChange={(e) => updateLayout('footerMessage', e.target.value)}
                placeholder="Obrigado pela preferência!"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar padrão
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar layout
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:sticky lg:top-6 h-fit">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 bg-muted/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview do Cupom
            </CardTitle>
            <CardDescription>
              {layout.paperSize} • {layout.paperWidth} caracteres
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex justify-center bg-gradient-to-b from-muted/30 to-muted/50 p-6">
              {/* Receipt paper simulation */}
              <div
                className="bg-white text-black rounded-sm shadow-xl relative"
                style={{
                  width: layout.paperSize === '58mm' ? '200px' : '280px',
                  minHeight: '350px',
                }}
              >
                {/* Torn paper effect top */}
                <div className="absolute -top-2 left-0 right-0 h-4 bg-white" 
                  style={{
                    maskImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10 Q5 0 10 10 Q15 0 20 10 Q25 0 30 10 Q35 0 40 10 Q45 0 50 10 Q55 0 60 10 Q65 0 70 10 Q75 0 80 10 Q85 0 90 10 Q95 0 100 10 L100 10 L0 10 Z\' fill=\'white\'/%3E%3C/svg%3E")',
                    WebkitMaskImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10 Q5 0 10 10 Q15 0 20 10 Q25 0 30 10 Q35 0 40 10 Q45 0 50 10 Q55 0 60 10 Q65 0 70 10 Q75 0 80 10 Q85 0 90 10 Q95 0 100 10 L100 10 L0 10 Z\' fill=\'white\'/%3E%3C/svg%3E")',
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                  }}
                />
                <ScrollArea className="h-[400px]">
                  <pre 
                    className="whitespace-pre-wrap break-all p-4 font-mono leading-relaxed" 
                    style={{ 
                      fontSize: layout.fontSize === 'small' ? '9px' : layout.fontSize === 'large' ? '13px' : '11px',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                    }}
                  >
                    {generatePreview()}
                  </pre>
                </ScrollArea>
                {/* Torn paper effect bottom */}
                <div className="absolute -bottom-2 left-0 right-0 h-4 bg-white rotate-180" 
                  style={{
                    maskImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10 Q5 0 10 10 Q15 0 20 10 Q25 0 30 10 Q35 0 40 10 Q45 0 50 10 Q55 0 60 10 Q65 0 70 10 Q75 0 80 10 Q85 0 90 10 Q95 0 100 10 L100 10 L0 10 Z\' fill=\'white\'/%3E%3C/svg%3E")',
                    WebkitMaskImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10 Q5 0 10 10 Q15 0 20 10 Q25 0 30 10 Q35 0 40 10 Q45 0 50 10 Q55 0 60 10 Q65 0 70 10 Q75 0 80 10 Q85 0 90 10 Q95 0 100 10 L100 10 L0 10 Z\' fill=\'white\'/%3E%3C/svg%3E")',
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center py-3 border-t">
              Preview com dados de exemplo
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
