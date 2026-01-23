import { Restaurant, MenuSettings, isRestaurantOpen } from '../types';
import { ShoppingCart, Search, X, Phone, MapPin, Truck, ShoppingBag, Clock } from 'lucide-react';
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
  const openStatus = isRestaurantOpen(menuSettings.opening_hours, menuSettings.use_opening_hours);

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      {/* Main Header Row */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-11 h-11 rounded-full object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-lg">
                {restaurant.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Restaurant Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm leading-tight line-clamp-2">{restaurant.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0.5 h-5 gap-1 font-medium ${
                  openStatus.isOpen 
                    ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/50' 
                    : 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/50'
                }`}
              >
                <Clock className="w-3 h-3" />
                {openStatus.isOpen ? 'Aberto' : 'Fechado'}
              </Badge>
              {menuSettings.digital_menu_delivery_enabled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 gap-1 font-medium">
                  <Truck className="w-3 h-3" />
                  Delivery
                </Badge>
              )}
              {menuSettings.digital_menu_pickup_enabled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5 gap-1 font-medium">
                  <ShoppingBag className="w-3 h-3" />
                  Retirada
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </Button>

            <Button
              variant="default"
              size="icon"
              className="h-9 w-9 relative"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-2.5">
            <Input
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="px-3 py-2 bg-muted/50 border-t flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
        {restaurant.phone && (
          <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1 hover:text-foreground">
            <Phone className="w-3 h-3" />
            {restaurant.phone}
          </a>
        )}
        {restaurant.address && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{restaurant.address}</span>
          </span>
        )}
      </div>
    </header>
  );
}
