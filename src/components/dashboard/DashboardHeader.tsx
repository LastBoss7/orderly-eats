import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Search,
  Plus,
  Printer,
  Settings,
  Volume2,
  VolumeX,
  Bell,
  Keyboard,
  Maximize2,
  Minimize2,
  Store,
  Power,
  ChefHat,
  Bike,
  Package,
  UtensilsCrossed,
  User,
} from 'lucide-react';
import { SHORTCUT_DESCRIPTIONS } from '@/hooks/useKeyboardShortcuts';

type FilterType = 'all' | 'delivery' | 'counter' | 'table' | 'tab';

interface OrderCounts {
  all: number;
  delivery: number;
  counter: number;
  table: number;
  tab: number;
}

interface DashboardHeaderProps {
  isStoreOpen: boolean;
  restaurantName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  orderCounts: OrderCounts;
  isCompactMode: boolean;
  onCompactModeToggle: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  notificationCount: number;
  onNewOrder: () => void;
  onPrintSettings: () => void;
  onStoreControl: () => void;
}

export function DashboardHeader({
  isStoreOpen,
  restaurantName,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  orderCounts,
  isCompactMode,
  onCompactModeToggle,
  soundEnabled,
  onSoundToggle,
  notificationCount,
  onNewOrder,
  onPrintSettings,
  onStoreControl,
}: DashboardHeaderProps) {
  const filters: { key: FilterType; icon: React.ReactNode; label: string; color: string }[] = [
    { key: 'all', icon: <ChefHat className="w-4 h-4" />, label: 'Todos', color: 'text-foreground' },
    { key: 'table', icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Mesa', color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'tab', icon: <User className="w-4 h-4" />, label: 'Comanda', color: 'text-violet-600 dark:text-violet-400' },
    { key: 'delivery', icon: <Bike className="w-4 h-4" />, label: 'Delivery', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'counter', icon: <Package className="w-4 h-4" />, label: 'Balcão', color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <header className="bg-card/80 backdrop-blur-xl border-b sticky top-0 z-40">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: Menu + Store Status */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9" />
          
          <button
            onClick={onStoreControl}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isStoreOpen 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isStoreOpen ? 'Aberto' : 'Fechado'}
          </button>
        </div>

        {/* Center: Filters */}
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
            {filters.map((f) => {
              const count = orderCounts[f.key];
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => onFilterChange(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-card shadow-sm text-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  } ${f.color}`}
                >
                  {f.icon}
                  <span className="hidden md:inline">{f.label}</span>
                  {count > 0 && (
                    <Badge 
                      className={`h-5 min-w-[20px] px-1.5 text-xs font-bold ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..."
              className="pl-9 h-9 w-40 lg:w-52 bg-muted/50 border-0 focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* New Order Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                className="h-9 gap-1.5 bg-primary hover:bg-primary/90"
                onClick={onNewOrder}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">Novo Pedido</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium flex items-center gap-1 text-xs">
                  <Keyboard className="w-3 h-3" /> Atalhos
                </p>
                <div className="text-[10px] space-y-0.5">
                  {SHORTCUT_DESCRIPTIONS.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{s.keys}</span>
                      <span>{s.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Icon Actions */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`h-9 w-9 ${isCompactMode ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                  onClick={onCompactModeToggle}
                >
                  {isCompactMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{isCompactMode ? 'Modo expandido' : 'Modo compacto'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-9 w-9 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={onSoundToggle}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={onPrintSettings}
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
