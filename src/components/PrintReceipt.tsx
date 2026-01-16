import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
}

interface PrintReceiptProps {
  order: {
    id: string;
    order_number?: number | null;
    order_type?: string | null;
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
    waiter_name?: string | null;
  };
  restaurantName?: string;
  onPrint?: () => void;
}

export function PrintReceipt({ order, onPrint }: PrintReceiptProps) {
  const { reprintOrder } = usePrintToElectron();

  const handlePrint = async () => {
    // Call onPrint callback to increment counter
    onPrint?.();
    
    // Send to Electron app for thermal printing
    await reprintOrder({
      orderId: order.id,
      orderNumber: order.order_number,
    });
  };

  const printCount = order.print_count ?? 0;
  
  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
      <Printer className="w-4 h-4" />
      <span>Imprimir</span>
      {printCount > 0 && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
          {printCount}x
        </span>
      )}
    </Button>
  );
}
