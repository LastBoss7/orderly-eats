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
import { Loader2, Save, RotateCcw, Eye, Printer } from 'lucide-react';

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
  customFooterLine1: string;
  customFooterLine2: string;
  customFooterLine3: string;
  showDefaultFooter: boolean;
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
  customFooterLine1: '',
  customFooterLine2: '',
  customFooterLine3: '',
  showDefaultFooter: true,
  fontSize: 'normal',
  boldItems: true,
  boldTotal: true,
};

// Sample order for preview
const sampleOrder = {
  id: 'ABC12345',
  order_number: 42,
  order_type: 'counter',
  table_id: null,
  table_number: null,
  waiter_name: null,
  customer_name: 'Teste',
  delivery_phone: '(99) 9 9999-9999',
  delivery_address: null,
  delivery_fee: 0,
  total: 200.00,
  payment_method: 'card',
  notes: null,
  created_at: new Date().toISOString(),
  order_items: [
    { 
      quantity: 1, 
      product_name: 'Item Teste', 
      product_price: 10.00, 
      product_size: null, 
      notes: 'Observação',
      subitems: [] 
    },
    { 
      quantity: 1, 
      product_name: 'Item Teste 2', 
      product_price: 20.00, 
      product_size: null, 
      notes: null,
      subitems: [] 
    },
    { 
      quantity: 1, 
      product_name: 'Item Teste 3', 
      product_price: 30.00, 
      product_size: null, 
      notes: null,
      subitems: [
        { quantity: 1, name: 'Adicional', price: 40.00 }
      ] 
    },
    { 
      quantity: 1, 
      product_name: 'Item Teste 4', 
      product_price: 40.00, 
      product_size: null, 
      notes: null,
      subitems: [
        { quantity: 1, name: 'Combo Teste 1', price: 5.00 },
        { quantity: 1, name: 'Combo Teste 2', price: 10.00 },
        { quantity: 1, name: 'Combo Teste 3', price: 25.00 },
      ] 
    },
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

  // Generate preview following new schema
  const generatePreview = () => {
    const width = layout.paperWidth;
    const thinDivider = '-'.repeat(width);
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

    // ============================================
    // HEADER - Date/Time + Restaurant Name (centered)
    // ============================================
    if (layout.showDateTime) {
      const now = new Date(sampleOrder.created_at);
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lines.push(center(`${dateStr} ${timeStr}`));
    }

    if (layout.showRestaurantName && restaurantInfo?.name) {
      lines.push(center(restaurantInfo.name));
    }

    lines.push(thinDivider);

    // ============================================
    // ORDER NUMBER (centered)
    // ============================================
    if (layout.showOrderNumber) {
      lines.push(center(`Pedido ${sampleOrder.order_number}`));
    }

    lines.push('');

    // ============================================
    // ITEMS SECTION
    // ============================================
    lines.push('Itens:');

    for (let i = 0; i < sampleOrder.order_items.length; i++) {
      const item = sampleOrder.order_items[i];
      const qty = item.quantity || 1;
      const name = item.product_name;
      const price = item.product_price || 0;

      // Main item line: (qty) Name                    R$ price
      const itemLeft = `(${qty}) ${name}`;
      const itemRight = layout.showItemPrices ? `R$ ${(price * qty).toFixed(2).replace('.', ',')}` : '';
      lines.push(alignBoth(itemLeft, itemRight));

      // Observation (OBS:)
      if (layout.showItemNotes && item.notes) {
        lines.push(`  OBS: ${item.notes}`);
      }

      // Sub-items / Additionals (indented)
      if (item.subitems && item.subitems.length > 0) {
        for (const subitem of item.subitems) {
          const subQty = subitem.quantity || 1;
          const subName = subitem.name;
          const subPrice = subitem.price || 0;
          const subLeft = `  (${subQty}) ${subName}`;
          const subRight = subPrice > 0 ? `R$ ${(subPrice * subQty).toFixed(2).replace('.', ',')}` : '';
          lines.push(alignBoth(subLeft, subRight));
        }
      }

      // Separator between items (except last)
      if (i < sampleOrder.order_items.length - 1) {
        lines.push(thinDivider);
      }
    }

    lines.push('');

    // ============================================
    // CUSTOMER INFO
    // ============================================
    if (layout.showCustomerName && sampleOrder.customer_name) {
      lines.push(`Cliente: ${sampleOrder.customer_name}`);
    }

    if (layout.showCustomerPhone && sampleOrder.delivery_phone) {
      lines.push(`Telefone: ${sampleOrder.delivery_phone}`);
    }

    if (layout.showOrderType) {
      const orderTypeLabels: Record<string, string> = {
        'counter': 'Vem buscar no local pra levar',
        'table': 'Consumo no local',
        'delivery': 'Entrega',
      };
      const typeLabel = orderTypeLabels[sampleOrder.order_type] || sampleOrder.order_type;

      if (sampleOrder.order_type === 'delivery' && sampleOrder.delivery_address) {
        lines.push(`Entrega: ${sampleOrder.delivery_address}`);
      } else {
        lines.push(`Entrega: ${typeLabel}`);
      }
    }

    lines.push('');

    // ============================================
    // PAYMENT METHOD
    // ============================================
    if (layout.showPaymentMethod && sampleOrder.payment_method) {
      lines.push(thinDivider);
      const paymentLabels: Record<string, string> = {
        'cash': 'Dinheiro',
        'credit': 'Cartão de Crédito',
        'debit': 'Cartão de Débito',
        'pix': 'PIX',
        'card': 'Cartão (Teste)',
      };
      lines.push(`Forma de Pagamento: ${paymentLabels[sampleOrder.payment_method] || sampleOrder.payment_method}`);
      lines.push('');
    }

    // ============================================
    // TOTALS
    // ============================================
    if (layout.showTotals) {
      lines.push(thinDivider);

      // Calculate subtotal
      let subtotal = 0;
      for (const item of sampleOrder.order_items) {
        subtotal += (item.product_price || 0) * (item.quantity || 1);
        if (item.subitems) {
          for (const sub of item.subitems) {
            subtotal += (sub.price || 0) * (sub.quantity || 1);
          }
        }
      }

      if (layout.showDeliveryFee && sampleOrder.delivery_fee > 0) {
        lines.push(alignBoth('Taxa de Entrega:', `R$ ${sampleOrder.delivery_fee.toFixed(2).replace('.', ',')}`));
      }

      lines.push(alignBoth('Subtotal:', `R$ ${subtotal.toFixed(2).replace('.', ',')}`));
      lines.push(alignBoth('Total:', `R$ ${sampleOrder.total.toFixed(2).replace('.', ',')}`));
    }

    lines.push('');
    lines.push(thinDivider);

    // ============================================
    // FOOTER - Custom lines
    // ============================================
    if (layout.footerMessage) {
      lines.push(center(layout.footerMessage));
    }

    // Custom footer lines
    if (layout.customFooterLine1) {
      lines.push(center(layout.customFooterLine1));
    }
    if (layout.customFooterLine2) {
      lines.push(center(layout.customFooterLine2));
    }
    if (layout.customFooterLine3) {
      lines.push(center(layout.customFooterLine3));
    }

    // Default footer (Powered By: Gamako)
    if (layout.showDefaultFooter) {
      if (layout.footerMessage || layout.customFooterLine1 || layout.customFooterLine2 || layout.customFooterLine3) {
        lines.push('');
      }
      lines.push(center('Powered By: Gamako'));
      lines.push(center('https://gamako.com.br'));
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
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rodapé personalizado</Label>
              <div className="space-y-2">
                <Input
                  value={layout.footerMessage}
                  onChange={(e) => updateLayout('footerMessage', e.target.value)}
                  placeholder="Mensagem principal (ex: Obrigado pela preferência!)"
                />
                <Input
                  value={layout.customFooterLine1}
                  onChange={(e) => updateLayout('customFooterLine1', e.target.value)}
                  placeholder="Linha adicional 1 (opcional)"
                />
                <Input
                  value={layout.customFooterLine2}
                  onChange={(e) => updateLayout('customFooterLine2', e.target.value)}
                  placeholder="Linha adicional 2 (opcional)"
                />
                <Input
                  value={layout.customFooterLine3}
                  onChange={(e) => updateLayout('customFooterLine3', e.target.value)}
                  placeholder="Linha adicional 3 (opcional)"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Adicione até 4 linhas de texto personalizado no rodapé do cupom
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showDefaultFooter" className="cursor-pointer">Mostrar "Powered By: Gamako"</Label>
                <p className="text-xs text-muted-foreground">Exibir créditos no final do cupom</p>
              </div>
              <Switch
                id="showDefaultFooter"
                checked={layout.showDefaultFooter}
                onCheckedChange={(checked) => updateLayout('showDefaultFooter', checked)}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview do Cupom
                </CardTitle>
                <CardDescription>
                  {layout.paperSize} • {layout.paperWidth} caracteres
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const printWindow = window.open('', '_blank', 'width=400,height=600');
                  if (printWindow) {
                    const content = generatePreview();
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Cupom de Teste</title>
                          <style>
                            @page { 
                              size: ${layout.paperSize === '58mm' ? '58mm' : '80mm'} auto;
                              margin: 0;
                            }
                            body {
                              margin: 0;
                              padding: 8px;
                              font-family: 'Courier New', Courier, monospace;
                              font-size: ${layout.fontSize === 'small' ? '10px' : layout.fontSize === 'large' ? '14px' : '12px'};
                              line-height: 1.3;
                              background: white;
                              color: black;
                            }
                            pre {
                              margin: 0;
                              white-space: pre-wrap;
                              word-wrap: break-word;
                            }
                          </style>
                        </head>
                        <body>
                          <pre>${content}</pre>
                          <script>
                            window.onload = function() {
                              window.print();
                              setTimeout(function() { window.close(); }, 500);
                            };
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Teste
              </Button>
            </div>
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
