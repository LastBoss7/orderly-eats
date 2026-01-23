import { Restaurant, MenuSettings, isRestaurantOpen } from '../types';
import { ShoppingCart, Search, X, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      {/* Main Header Row */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-12 h-12 rounded-xl object-cover border border-border/50 flex-shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-background font-bold text-lg">
                {restaurant.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Restaurant Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">{restaurant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  openStatus.isOpen 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-zinc-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  openStatus.isOpen ? 'bg-emerald-500' : 'bg-zinc-400'
                }`} />
                {openStatus.isOpen ? 'Aberto' : 'Fechado'}
              </span>
              
              {menuSettings.digital_menu_delivery_enabled && (
                <span className="text-xs text-muted-foreground">• Delivery</span>
              )}
              {menuSettings.digital_menu_pickup_enabled && (
                <span className="text-xs text-muted-foreground">• Retirada</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </Button>

            <Button
              size="icon"
              className="h-10 w-10 rounded-xl relative"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Search Bar - Expandable */}
        {showSearch && (
          <div className="mt-3">
            <Input
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 text-sm rounded-xl bg-muted/50 border-transparent focus:border-border"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Info Bar - Minimal */}
      {(restaurant.phone || restaurant.address) && (
        <div className="px-4 py-2 bg-muted/30 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Phone className="w-3.5 h-3.5" />
              {restaurant.phone}
            </a>
          )}
          {restaurant.address && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{restaurant.address}</span>
            </span>
          )}
        </div>
      )}
    </header>
  );
}
