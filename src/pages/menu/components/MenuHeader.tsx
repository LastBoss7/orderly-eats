import { Restaurant, MenuSettings } from '../types';
import { ShoppingCart, Search, X, Phone, MapPin, Truck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface MenuHeaderProps {
  restaurant: Restaurant;
  menuSettings: MenuSettings;
  cartCount: number;
  onCartClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MenuHeader({
  restaurant,
  menuSettings,
  cartCount,
  onCartClick,
  searchQuery,
  onSearchChange,
}: MenuHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      {/* Banner */}
      {menuSettings.digital_menu_banner_url && (
        <div className="relative w-full h-32 sm:h-48 overflow-hidden">
          <img
            src={menuSettings.digital_menu_banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Name */}
            <div className="flex items-center gap-3">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-full object-cover border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">
                    {restaurant.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg leading-tight">{restaurant.name}</h1>
                <div className="flex items-center gap-2">
                  {menuSettings.digital_menu_delivery_enabled && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      <Truck className="w-3 h-3" />
                      Delivery
                    </Badge>
                  )}
                  {menuSettings.digital_menu_pickup_enabled && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      Retirada
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Search & Cart */}
            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className="flex items-center gap-2 animate-in slide-in-from-right">
                  <Input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-48 sm:w-64 h-9"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setShowSearch(false);
                      onSearchChange('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                className="relative gap-2"
                onClick={onCartClick}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">Carrinho</span>
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Restaurant Info Bar */}
        {(restaurant.phone || restaurant.address) && (
          <div className="bg-muted/50 border-t">
            <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Phone className="w-3 h-3" />
                  {restaurant.phone}
                </a>
              )}
              {restaurant.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {restaurant.address}
                </span>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
