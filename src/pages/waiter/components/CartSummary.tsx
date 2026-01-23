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
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-card z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="text-center py-4 text-muted-foreground">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Carrinho vazio</p>
          <p className="text-xs">Toque nos produtos para adicionar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-card flex flex-col max-h-[45vh] z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
      {/* Cart Header - Collapsible toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{itemCount} itens</span>
        </div>
        <span className="font-bold text-primary">
          {formatCurrency(cartTotal)}
        </span>
      </div>

      {/* Cart Items - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
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
          
          {/* Order Notes */}
          <div className="pt-2 border-t">
            <Input
              placeholder="Observações do pedido..."
              value={orderNotes}
              onChange={(e) => onOrderNotesChange(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Submit Button - Fixed at bottom */}
      <div className="p-3 border-t bg-card shrink-0">
        <Button
          className="w-full h-12 text-base font-semibold"
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
