import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface PrintOrderOptions {
  orderId: string;
  orderNumber?: number | string | null;
  showToast?: boolean;
}

interface ReprintOrderOptions {
  orderId: string;
  orderNumber?: number | string | null;
}

interface UsePrintToElectronOptions {
  restaurantId?: string;
  useEdgeFunction?: boolean; // When true, uses edge function instead of direct Supabase calls (for public access)
}

/**
 * Hook para enviar impressões para o app Electron
 * Em vez de usar window.print(), este hook marca o pedido como pendente
 * para que o app Electron possa buscá-lo e imprimir na impressora térmica
 * 
 * @param options - Opções do hook
 * @param options.restaurantId - ID do restaurante (opcional, usa o do auth se não fornecido)
 * @param options.useEdgeFunction - Se true, usa edge function para bypass RLS (para acesso público)
 */
export function usePrintToElectron(options?: UsePrintToElectronOptions) {
  const { restaurant } = useAuth();
  
  // Use provided restaurantId or fall back to auth restaurant
  const effectiveRestaurantId = options?.restaurantId || restaurant?.id;
  const useEdgeFunction = options?.useEdgeFunction || false;

  /**
   * Marca um pedido para impressão (print_status = 'pending')
   * O app Electron vai buscar e imprimir automaticamente
   */
  const printOrder = useCallback(async ({ orderId, orderNumber, showToast = true }: PrintOrderOptions) => {
    if (!effectiveRestaurantId) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Update order to pending print status
      const { error } = await supabase
        .from('orders')
        .update({ 
          print_status: 'pending',
          printed_at: null, // Reset printed time
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log the print request
      await supabase.from('print_logs').insert({
        restaurant_id: effectiveRestaurantId,
        order_id: orderId,
        order_number: orderNumber?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
      });

      if (showToast) {
        toast.success('Pedido enviado para impressão!', {
          description: 'O app Electron irá imprimir automaticamente.',
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error sending print to Electron:', error);
      toast.error('Erro ao enviar para impressão', {
        description: error.message,
      });
      return false;
    }
  }, [effectiveRestaurantId]);

  /**
   * Reimprime um pedido (marca novamente como pending)
   */
  const reprintOrder = useCallback(async ({ orderId, orderNumber }: ReprintOrderOptions) => {
    if (!effectiveRestaurantId) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Increment print count and set back to pending
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('print_count')
        .eq('id', orderId)
        .single();

      const newPrintCount = (currentOrder?.print_count || 0) + 1;

      const { error } = await supabase
        .from('orders')
        .update({ 
          print_status: 'pending',
          print_count: newPrintCount,
          printed_at: null,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log the reprint request
      await supabase.from('print_logs').insert({
        restaurant_id: effectiveRestaurantId,
        order_id: orderId,
        order_number: orderNumber?.toString() || null,
        event_type: 'reprint',
        status: 'pending',
        printer_name: 'Electron App',
      });

      toast.success('Reimpressão enviada!', {
        description: `Pedido será reimpresso (${newPrintCount}ª via)`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending reprint to Electron:', error);
      toast.error('Erro ao reimprimir', {
        description: error.message,
      });
      return false;
    }
  }, [effectiveRestaurantId]);

  /**
   * Imprime conferência/conta de mesa ou comanda
   * Cria um pedido temporário com type='conference' para impressão
   */
  const printConference = useCallback(async (params: {
    entityType: 'table' | 'tab';
    entityNumber: number;
    customerName?: string | null;
    items: Array<{
      product_name: string;
      quantity: number;
      product_price: number;
    }>;
    total: number;
    discount?: number;
    addition?: number;
    serviceCharge?: number;
    splitCount?: number;
    payments?: Array<{
      method: string;
      amount: number;
    }>;
    isFinalReceipt?: boolean;
  }) => {
    if (!effectiveRestaurantId) {
      toast.error('Restaurante não identificado');
      console.error('printConference: No restaurant ID available', { 
        optionsRestaurantId: options?.restaurantId,
        authRestaurantId: restaurant?.id 
      });
      return false;
    }

    try {
      // If using edge function (public access like waiter app), call edge function
      if (useEdgeFunction) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waiter-data?action=print-conference&restaurant_id=${effectiveRestaurantId}`,
          {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entity_type: params.entityType,
              entity_number: params.entityNumber,
              customer_name: params.customerName,
              total: params.total,
              service_charge: params.serviceCharge || null,
              discount: params.discount || 0,
              addition: params.addition || 0,
              split_count: params.splitCount || 1,
              is_final_receipt: params.isFinalReceipt || false,
              payments: params.payments || [],
              items: params.items,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao enviar conferência');
        }

        toast.success('Conferência enviada para impressão!');
        return true;
      }

      // Original direct Supabase call (for authenticated users)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: effectiveRestaurantId,
          order_type: 'conference',
          customer_name: params.customerName || `${params.entityType === 'table' ? 'Mesa' : 'Comanda'} ${params.entityNumber}`,
          total: params.total,
          service_charge: params.serviceCharge || null,
          status: 'conference', // Special status for conference prints
          print_status: 'pending',
          notes: JSON.stringify({
            entityType: params.entityType,
            entityNumber: params.entityNumber,
            discount: params.discount || 0,
            addition: params.addition || 0,
            serviceCharge: params.serviceCharge || 0,
            splitCount: params.splitCount || 1,
            isConference: !params.isFinalReceipt,
            isFinalReceipt: params.isFinalReceipt || false,
            payments: params.payments || [],
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Add items to the order
      if (params.items.length > 0) {
        const itemsToInsert = params.items.map(item => ({
          order_id: order.id,
          restaurant_id: effectiveRestaurantId,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Log the conference print
      await supabase.from('print_logs').insert({
        restaurant_id: effectiveRestaurantId,
        order_id: order.id,
        order_number: order.order_number?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
        items_count: params.items.length,
      });

      toast.success('Conferência enviada para impressão!');

      // Delete the temporary order after 60 seconds (Electron should have printed it)
      setTimeout(async () => {
        try {
          await supabase.from('order_items').delete().eq('order_id', order.id);
          await supabase.from('orders').delete().eq('id', order.id);
        } catch (e) {
          console.log('Conference order cleanup:', e);
        }
      }, 60000);

      return true;
    } catch (error: any) {
      console.error('Error sending conference to Electron:', error);
      toast.error('Erro ao enviar conferência', {
        description: error.message,
      });
      return false;
    }
  }, [effectiveRestaurantId, options?.restaurantId, restaurant?.id, useEdgeFunction]);

  /**
   * Imprime relatório de fechamento de caixa
   * Cria um pedido temporário com type='closing' para impressão
   */
  const printClosing = useCallback(async (params: {
    restaurantName: string;
    date: string;
    openedAt: string;
    closedAt: string;
    totalOrders: number;
    totalRevenue: number;
    averageTicket: number;
    paymentBreakdown: Array<{
      method: string;
      count: number;
      total: number;
    }>;
    orderTypeBreakdown: Array<{
      type: string;
      count: number;
      total: number;
    }>;
    cancelledOrders: number;
    receiptSettings?: {
      receiptHeader: string | null;
      receiptFooter: string | null;
      showAddress: boolean;
      showPhone: boolean;
      showCnpj: boolean;
      logoUrl: string | null;
      address: string | null;
      phone: string | null;
      cnpj: string | null;
    };
  }) => {
    if (!effectiveRestaurantId) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Create a temporary order for the closing print
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: effectiveRestaurantId,
          order_type: 'closing',
          customer_name: `Fechamento ${params.date}`,
          total: params.totalRevenue,
          status: 'closing', // Special status for closing prints
          print_status: 'pending',
          notes: JSON.stringify({
            type: 'closing_report',
            restaurantName: params.restaurantName,
            date: params.date,
            openedAt: params.openedAt,
            closedAt: params.closedAt,
            totalOrders: params.totalOrders,
            totalRevenue: params.totalRevenue,
            averageTicket: params.averageTicket,
            paymentBreakdown: params.paymentBreakdown,
            orderTypeBreakdown: params.orderTypeBreakdown,
            cancelledOrders: params.cancelledOrders,
            receiptSettings: params.receiptSettings || null,
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Log the closing print
      await supabase.from('print_logs').insert({
        restaurant_id: effectiveRestaurantId,
        order_id: order.id,
        order_number: order.order_number?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
      });

      toast.success('Relatório de fechamento enviado para impressão!');

      // Delete the temporary order after 60 seconds
      setTimeout(async () => {
        try {
          await supabase.from('orders').delete().eq('id', order.id);
        } catch (e) {
          console.log('Closing order cleanup:', e);
        }
      }, 60000);

      return true;
    } catch (error: any) {
      console.error('Error sending closing to Electron:', error);
      toast.error('Erro ao enviar relatório de fechamento', {
        description: error.message,
      });
      return false;
    }
  }, [effectiveRestaurantId]);

  /**
   * Imprime teste de categoria para validar separação de impressoras
   * Cria um pedido temporário com itens fictícios baseados nas categorias
   */
  const printCategoryTest = useCallback(async (params: {
    printerName: string;
    printerId: string;
    categories: Array<{ id: string; name: string }>;
    linkedCategories: string[] | null;
    orderTypes: string[];
  }) => {
    if (!effectiveRestaurantId) {
      toast.error('Restaurante não identificado');
      return false;
    }

    // Determine which categories will be printed
    const categoriesToPrint = params.linkedCategories === null || params.linkedCategories.length === 0
      ? params.categories // All categories if null/empty
      : params.categories.filter(c => params.linkedCategories!.includes(c.id));

    if (categoriesToPrint.length === 0) {
      toast.error('Nenhuma categoria configurada para esta impressora');
      return false;
    }

    try {
      // Create a temporary test order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: effectiveRestaurantId,
          order_type: params.orderTypes[0] || 'counter', // Use first linked order type
          customer_name: `TESTE - ${params.printerName}`,
          total: categoriesToPrint.length * 10, // Dummy total
          status: 'test',
          print_status: 'pending',
          notes: JSON.stringify({
            isTest: true,
            testType: 'category_validation',
            printerName: params.printerName,
            printerId: params.printerId,
            testedCategories: categoriesToPrint.map(c => c.name),
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Create test items for each category that should print
      const testItems = categoriesToPrint.map((category, index) => ({
        order_id: order.id,
        restaurant_id: effectiveRestaurantId,
        product_name: `[TESTE] Item ${category.name}`,
        product_price: 10,
        quantity: 1,
        notes: `Categoria: ${category.name}`,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(testItems);

      if (itemsError) throw itemsError;

      // Log the test print
      await supabase.from('print_logs').insert({
        restaurant_id: effectiveRestaurantId,
        order_id: order.id,
        order_number: order.order_number?.toString() || null,
        event_type: 'test',
        status: 'pending',
        printer_name: params.printerName,
        items_count: testItems.length,
      });

      toast.success('Teste de impressão enviado!', {
        description: `${categoriesToPrint.length} categoria(s) serão impressas em "${params.printerName}"`,
      });

      // Delete the test order after 60 seconds
      setTimeout(async () => {
        try {
          await supabase.from('order_items').delete().eq('order_id', order.id);
          await supabase.from('orders').delete().eq('id', order.id);
        } catch (e) {
          console.log('Test order cleanup:', e);
        }
      }, 60000);

      return true;
    } catch (error: any) {
      console.error('Error sending category test to Electron:', error);
      toast.error('Erro ao enviar teste', {
        description: error.message,
      });
      return false;
    }
  }, [effectiveRestaurantId]);

  /**
   * Imprime comanda de pedido iFood com template específico
   * Segue o padrão oficial do iFood com proteção de dados (LGPD)
   */
  const printIFoodOrder = useCallback(async (params: {
    ifoodOrderId: string;
    displayId: string;
    pickupCode?: string | null;
    localizer?: string | null;
    orderTiming: string;
    orderType: string;
    deliveredBy: string;
    scheduledTo?: string | null;
    customer: {
      name: string;
      phone?: string | null;
    };
    delivery?: {
      streetName?: string;
      streetNumber?: string;
      neighborhood?: string;
      complement?: string;
      reference?: string;
      city?: string;
      state?: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice?: number;
      options?: Array<{ name: string; quantity: number; unitPrice: number }>;
      observations?: string;
    }>;
    total: {
      subTotal: number;
      deliveryFee: number;
      benefits: number;
      orderAmount: number;
    };
    payments: Array<{
      method: string;
      value: number;
      prepaid: boolean;
    }>;
  }) => {
    if (!effectiveRestaurantId) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Mask phone number for privacy (LGPD)
      const maskPhone = (phone: string | null | undefined): string => {
        if (!phone) return '';
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10) {
          const ddd = digits.slice(0, 2);
          const prefix = digits.slice(2, -4);
          return `(${ddd}) ${prefix}-xxxx`;
        }
        return phone;
      };

      // Create temporary order with iFood type
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: effectiveRestaurantId,
          order_type: 'ifood',
          customer_name: params.customer.name,
          total: params.total.orderAmount,
          delivery_fee: params.total.deliveryFee,
          status: 'ifood_print',
          print_status: 'pending',
          notes: JSON.stringify({
            isIFoodPrint: true,
            displayId: params.displayId,
            pickupCode: params.pickupCode || null,
            localizer: params.localizer || null,
            orderTiming: params.orderTiming,
            orderType: params.orderType,
            deliveredBy: params.deliveredBy,
            scheduledTo: params.scheduledTo || null,
            customer: {
              name: params.customer.name,
              phone: maskPhone(params.customer.phone),
            },
            delivery: params.delivery || null,
            items: params.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice || (item.unitPrice * item.quantity),
              options: item.options || [],
              observations: item.observations || null,
            })),
            total: {
              subTotal: params.total.subTotal,
              deliveryFee: params.total.deliveryFee,
              benefits: params.total.benefits,
              orderAmount: params.total.orderAmount,
            },
            payments: params.payments.map(pay => ({
              method: pay.method,
              value: pay.value,
              prepaid: pay.prepaid,
            })),
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Create order items for the print
      if (params.items.length > 0) {
        const itemsToInsert = params.items.map(item => ({
          order_id: order.id,
          restaurant_id: effectiveRestaurantId,
          product_name: item.name,
          product_price: item.unitPrice,
          quantity: item.quantity,
          notes: item.observations || null,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Log the print request
      await supabase.from('print_logs').insert({
        restaurant_id: effectiveRestaurantId,
        order_id: order.id,
        order_number: params.displayId,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
        items_count: params.items.length,
      });

      toast.success('Comanda iFood enviada para impressão!');

      // Delete the temporary order after 120 seconds
      setTimeout(async () => {
        try {
          await supabase.from('order_items').delete().eq('order_id', order.id);
          await supabase.from('orders').delete().eq('id', order.id);
        } catch (e) {
          console.log('iFood order cleanup:', e);
        }
      }, 120000);

      return true;
    } catch (error: any) {
      console.error('Error sending iFood order to Electron:', error);
      toast.error('Erro ao enviar comanda iFood', {
        description: error.message,
      });
      return false;
    }
  }, [effectiveRestaurantId]);

  return {
    printOrder,
    reprintOrder,
    printConference,
    printClosing,
    printCategoryTest,
    printIFoodOrder,
  };
}
