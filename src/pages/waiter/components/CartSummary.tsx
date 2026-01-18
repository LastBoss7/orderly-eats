import { Button } from '@/components/ui/button';
import { ShoppingCart, Minus, Plus, Trash2, MessageSquare, Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { CartItem, ProductSize, formatCurrency, getSizeLabel } from '../types';
import { cn } from '@/lib/utils';

interface CartSummaryProps {
  cart: CartItem[];
  orderNotes: string;
  isSubmitting: boolean;
  onUpdateQuantity: (productId: string, size: ProductSize | null | undefined, delta: number) => void;
  onRemoveItem: (productId: string, size: ProductSize | null | undefined) => void;
  onUpdateNotes: (productId: string, size: ProductSize | null | undefined, notes: string) => void;
  onOrderNotesChange: (notes: string) => void;
  onSubmit: () => void;
  editingItemNotes: string | null;
  onSetEditingItemNotes: (id: string | null) => void;
}

export function CartSummary({
  cart,
  orderNotes,
  isSubmitting,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onOrderNotesChange,
  onSubmit,
  editingItemNotes,
  onSetEditingItemNotes,
}: CartSummaryProps) {
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="p-4 border-t bg-card">
        <div className="text-center py-6 text-muted-foreground">
          <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Carrinho vazio</p>
          <p className="text-xs">Toque nos produtos para adicionar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-card flex flex-col max-h-[50vh]">
      {/* Cart Items */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {cart.map((item) => {
            const itemKey = `${item.product.id}-${item.size || 'default'}`;
            const isEditingNotes = editingItemNotes === itemKey;
            
            return (
              <div
                key={itemKey}
                className="bg-muted/50 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {item.product.name}
                      {item.size && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({getSizeLabel(item.size)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.unitPrice)} cada
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.product.id, item.size, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.product.id, item.size, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.product.id, item.size)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Item Notes */}
                {isEditingNotes ? (
                  <Input
                    placeholder="Observação do item..."
                    value={item.notes}
                    onChange={(e) => onUpdateNotes(item.product.id, item.size, e.target.value)}
                    onBlur={() => onSetEditingItemNotes(null)}
                    className="h-8 text-xs"
                    autoFocus
                  />
                ) : item.notes ? (
                  <button
                    onClick={() => onSetEditingItemNotes(itemKey)}
                    className="w-full text-left text-xs text-muted-foreground bg-background rounded px-2 py-1"
                  >
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    {item.notes}
                  </button>
                ) : (
                  <button
                    onClick={() => onSetEditingItemNotes(itemKey)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Adicionar observação
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Order Notes */}
        <div className="mt-3 pt-3 border-t">
          <Input
            placeholder="Observações do pedido..."
            value={orderNotes}
            onChange={(e) => onOrderNotesChange(e.target.value)}
            className="h-10 text-sm"
          />
        </div>
      </ScrollArea>

      {/* Total & Submit */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{itemCount} itens</span>
          <span className="text-xl font-bold text-foreground">
            {formatCurrency(cartTotal)}
          </span>
        </div>
        
        <Button
          className="w-full h-14 text-lg"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Enviar Pedido
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
