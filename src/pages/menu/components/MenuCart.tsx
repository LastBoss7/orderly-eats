import { CartItem, formatCurrency, getSizeLabel } from '../types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, ShoppingBag, Tag, X, Check, Loader2, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface MenuCartProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItemNotes: (index: number, notes: string) => void;
  onCheckout: () => void;
  couponCode: string;
  onCouponChange: (code: string) => void;
  onApplyCoupon: () => void;
  couponDiscount: number;
  couponError: string | null;
  couponLoading: boolean;
  appliedCoupon: { code: string; discount_type: string; discount_value: number } | null;
  onRemoveCoupon: () => void;
}

export function MenuCart({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemNotes,
  onCheckout,
  couponCode,
  onCouponChange,
  onApplyCoupon,
  couponDiscount,
  couponError,
  couponLoading,
  appliedCoupon,
  onRemoveCoupon,
}: MenuCartProps) {
  const [editingNotesIndex, setEditingNotesIndex] = useState<number | null>(null);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  // Handle input focus for mobile keyboard
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85dvh] flex flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 min-h-0 overflow-hidden">
          <DrawerHeader className="pb-3 flex-shrink-0 border-b border-border/50">
            <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingBag className="w-5 h-5" />
              Carrinho
              {items.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{items.length} {items.length === 1 ? 'item' : 'itens'}</Badge>
              )}
            </DrawerTitle>
          </DrawerHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione produtos do cardápio
              </p>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={onClose}>
                Explorar cardápio
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="space-y-2 py-4">
                  {items.map((item, index) => (
                    <div
                      key={`${item.product.id}-${item.size}-${index}`}
                      className="flex gap-3 p-3 bg-muted/30 rounded-xl"
                    >
                      {/* Product Image */}
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xl opacity-20">🍽️</span>
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm leading-tight line-clamp-1">
                              {item.product.name}
                            </h4>
                            {item.size && (
                              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded inline-block mt-0.5">
                                {getSizeLabel(item.size)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => onRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Item Notes */}
                        <div className="mt-2">
                          {editingNotesIndex === index ? (
                            <Input
                              placeholder="Ex: Sem cebola, bem passado..."
                              value={item.notes}
                              onChange={(e) => onUpdateItemNotes(index, e.target.value)}
                              onBlur={() => setEditingNotesIndex(null)}
                              className="h-9 text-xs"
                              autoFocus
                              onFocus={handleInputFocus}
                            />
                          ) : item.notes ? (
                            <button
                              onClick={() => setEditingNotesIndex(index)}
                              className="w-full text-left text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{item.notes}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingNotesIndex(index)}
                              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Adicionar observação
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md hover:bg-background"
                              onClick={() => onUpdateQuantity(index, -1)}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md hover:bg-background"
                              onClick={() => onUpdateQuantity(index, 1)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <span className="font-semibold text-sm">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="px-4 pt-4 pb-6 border-t space-y-4 flex-shrink-0 bg-background">
                {/* Coupon Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="w-3.5 h-3.5" />
                    Cupom de desconto
                  </Label>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-medium text-emerald-700 dark:text-emerald-300 text-sm">
                          {appliedCoupon.code}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          {appliedCoupon.discount_type === 'percentage'
                            ? `${appliedCoupon.discount_value}% OFF`
                            : `${formatCurrency(appliedCoupon.discount_value)} OFF`}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        onClick={onRemoveCoupon}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite o código"
                        value={couponCode}
                        onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                        className="flex-1 h-11 text-sm rounded-xl bg-muted/50 border-transparent"
                        onFocus={handleInputFocus}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-11 px-4 rounded-xl"
                        onClick={onApplyCoupon}
                        disabled={!couponCode || couponLoading}
                      >
                        {couponLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Aplicar'
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {couponError && (
                    <p className="text-xs text-destructive">{couponError}</p>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-3 border-t border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Desconto</span>
                      <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  size="lg"
                  className="w-full h-14 rounded-xl text-base font-semibold shadow-lg"
                  onClick={onCheckout}
                >
                  Continuar
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
