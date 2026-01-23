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
    <>
      {/* Banner */}
      {menuSettings.digital_menu_banner_url && (
        <div className="relative w-full h-36 sm:h-48 overflow-hidden">
          <img
            src={menuSettings.digital_menu_banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Name */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-border/50 shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-primary font-bold text-base sm:text-lg">
                    {restaurant.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-base sm:text-lg leading-tight truncate">{restaurant.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {/* Open/Closed Status */}
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0 gap-0.5 ${
                      openStatus.isOpen 
                        ? 'border-success text-success bg-success/10' 
                        : 'border-destructive text-destructive bg-destructive/10'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {openStatus.isOpen ? 'Aberto' : 'Fechado'}
                  </Badge>
                  {menuSettings.digital_menu_delivery_enabled && (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 gap-0.5 hidden xs:flex">
                      <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Delivery
                    </Badge>
                  )}
                  {menuSettings.digital_menu_pickup_enabled && (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 gap-0.5 hidden xs:flex">
                      <ShoppingBag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Retirada
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Search & Cart */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {showSearch ? (
                <div className="flex items-center gap-1.5 animate-in slide-in-from-right">
                  <Input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-32 sm:w-48 md:w-64 h-8 sm:h-9 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
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
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                className="relative gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3"
                onClick={onCartClick}
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-sm">Carrinho</span>
                {cartCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] sm:text-xs">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Restaurant Info Bar */}
        <div className="bg-muted/50 border-t">
          <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {/* Opening Hours Message */}
            {menuSettings.use_opening_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {openStatus.message}
              </span>
            )}
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
      </header>
    </>
  );
}
