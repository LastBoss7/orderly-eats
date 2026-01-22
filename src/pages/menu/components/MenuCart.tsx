import { CartItem, formatCurrency, getSizeLabel } from '../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, ShoppingBag, Tag, X, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface MenuCartProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
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
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Seu Carrinho
            {items.length > 0 && (
              <Badge variant="secondary">{items.length} {items.length === 1 ? 'item' : 'itens'}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Carrinho vazio</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione produtos do cardápio para começar
            </p>
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Continuar comprando
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item, index) => (
                  <div
                    key={`${item.product.id}-${item.size}-${index}`}
                    className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    {/* Product Image */}
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-2xl opacity-30">🍽️</span>
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm line-clamp-1">
                            {item.product.name}
                          </h4>
                          {item.size && (
                            <span className="text-xs text-muted-foreground">
                              {getSizeLabel(item.size)}
                            </span>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(index, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(index, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <span className="font-bold text-sm">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Coupon Section */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Cupom de desconto
              </Label>
              
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {appliedCoupon.code}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {appliedCoupon.discount_type === 'percentage'
                        ? `${appliedCoupon.discount_value}% OFF`
                        : `${formatCurrency(appliedCoupon.discount_value)} OFF`}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
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
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
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
                <p className="text-sm text-destructive">{couponError}</p>
              )}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
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
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <SheetFooter className="mt-4">
              <Button
                size="lg"
                className="w-full"
                onClick={onCheckout}
              >
                Finalizar Pedido
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
