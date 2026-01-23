import { CartItem, formatCurrency, getSizeLabel } from '../types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, ShoppingBag, Tag, X, Check, Loader2 } from 'lucide-react';

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
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg flex flex-col max-h-[85vh]">
          <DrawerHeader className="pb-2 flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="w-5 h-5" />
              Seu Carrinho
              {items.length > 0 && (
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              )}
            </DrawerTitle>
          </DrawerHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
              <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione produtos para começar
              </p>
              <Button variant="outline" className="mt-6" onClick={onClose}>
                Ver cardápio
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 py-2">
                  {items.map((item, index) => (
                    <div
                      key={`${item.product.id}-${item.size}-${index}`}
                      className="flex gap-3 p-2.5 bg-muted/50 rounded-xl"
                    >
                      {/* Product Image */}
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xl opacity-30">🍽️</span>
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
                              <span className="text-[11px] text-muted-foreground">
                                {getSizeLabel(item.size)}
                              </span>
                            )}
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                📝 {item.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => onRemoveItem(index)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              onClick={() => onUpdateQuantity(index, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-7 text-center font-medium text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
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

              <div className="px-4 pt-3 pb-4 border-t space-y-3 flex-shrink-0">
                {/* Coupon Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Cupom de desconto
                  </Label>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-300 text-sm">
                          {appliedCoupon.code}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {appliedCoupon.discount_type === 'percentage'
                            ? `${appliedCoupon.discount_value}% OFF`
                            : `${formatCurrency(appliedCoupon.discount_value)} OFF`}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
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
                        className="flex-1 h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
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
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto</span>
                      <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-1">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  size="lg"
                  className="w-full h-12"
                  onClick={onCheckout}
                >
                  Finalizar Pedido
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
