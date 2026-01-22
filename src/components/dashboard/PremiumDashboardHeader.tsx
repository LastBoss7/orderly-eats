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
  Volume2,
  VolumeX,
  Bell,
  ChefHat,
  Bike,
  Package,
  UtensilsCrossed,
  User,
  LayoutGrid,
  List,
  Store,
} from 'lucide-react';

type FilterType = 'all' | 'delivery' | 'counter' | 'table' | 'tab';

interface OrderCounts {
  all: number;
  delivery: number;
  counter: number;
  table: number;
  tab: number;
}

interface PremiumDashboardHeaderProps {
  isStoreOpen: boolean;
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

const filters: { key: FilterType; icon: React.ReactNode; label: string; color: string; activeColor: string }[] = [
  { 
    key: 'all', 
    icon: <ChefHat className="w-4 h-4" />, 
    label: 'Todos', 
    color: 'text-muted-foreground hover:text-foreground',
    activeColor: 'bg-primary text-primary-foreground shadow-sm',
  },
  { 
    key: 'table', 
    icon: <UtensilsCrossed className="w-4 h-4" />, 
    label: 'Mesa', 
    color: 'text-muted-foreground hover:text-emerald-600',
    activeColor: 'bg-emerald-500 text-white shadow-sm',
  },
  { 
    key: 'tab', 
    icon: <User className="w-4 h-4" />, 
    label: 'Comanda', 
    color: 'text-muted-foreground hover:text-violet-600',
    activeColor: 'bg-violet-500 text-white shadow-sm',
  },
  { 
    key: 'delivery', 
    icon: <Bike className="w-4 h-4" />, 
    label: 'Delivery', 
    color: 'text-muted-foreground hover:text-blue-600',
    activeColor: 'bg-blue-500 text-white shadow-sm',
  },
  { 
    key: 'counter', 
    icon: <Package className="w-4 h-4" />, 
    label: 'Balcão', 
    color: 'text-muted-foreground hover:text-amber-600',
    activeColor: 'bg-amber-500 text-white shadow-sm',
  },
];

export function PremiumDashboardHeader({
  isStoreOpen,
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
}: PremiumDashboardHeaderProps) {
  return (
    <header className="bg-card/95 backdrop-blur-xl border-b sticky top-0 z-40">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Left Section: Menu + Store Status */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9" />
          
          <button
            onClick={onStoreControl}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              isStoreOpen 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isStoreOpen ? 'Aberto' : 'Fechado'}
          </button>
        </div>

        {/* Center Section: Premium Filter Pills */}
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/50">
            {filters.map((f) => {
              const count = orderCounts[f.key];
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => onFilterChange(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? f.activeColor : f.color
                  }`}
                >
                  {f.icon}
                  <span className="hidden lg:inline">{f.label}</span>
                  {count > 0 && (
                    <Badge 
                      variant="secondary"
                      className={`h-5 min-w-[20px] px-1.5 text-[10px] font-bold ml-0.5 ${
                        isActive 
                          ? 'bg-white/25 text-inherit border-transparent' 
                          : 'bg-muted-foreground/15 text-muted-foreground'
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

        {/* Right Section: Search + Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar pedido..."
              className="pl-9 h-9 w-44 lg:w-56 bg-muted/50 border-border/50 focus-visible:ring-1 rounded-xl"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* New Order Button */}
          <Button 
            size="sm" 
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 rounded-xl font-semibold shadow-sm"
            onClick={onNewOrder}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
          </Button>

          {/* Icon Actions */}
          <div className="flex items-center border-l border-border/50 ml-1 pl-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`h-9 w-9 rounded-xl ${isCompactMode ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                  onClick={onCompactModeToggle}
                >
                  {isCompactMode ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{isCompactMode ? 'Modo detalhado' : 'Modo compacto'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`h-9 w-9 rounded-xl ${soundEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                  onClick={onSoundToggle}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{soundEnabled ? 'Som ativado' : 'Som desativado'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-xl relative text-muted-foreground"
                >
                  <Bell className="w-4 h-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Notificações</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9 rounded-xl text-muted-foreground"
                  onClick={onPrintSettings}
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Configurações de impressão</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
