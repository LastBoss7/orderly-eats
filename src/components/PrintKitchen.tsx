import { Button } from '@/components/ui/button';
import { ChefHat } from 'lucide-react';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';

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
    waiter_name?: string | null;
  };
  orderNumber?: number;
}

export function PrintKitchen({ order }: PrintKitchenProps) {
  const { reprintOrder } = usePrintToElectron();

  const handlePrint = async () => {
    // Send to Electron app for thermal printing
    await reprintOrder({
      orderId: order.id,
      orderNumber: order.order_number,
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
      <ChefHat className="w-4 h-4" />
      Cozinha
    </Button>
  );
}
