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

// Revolut/Apple-inspired: Minimal, monochrome filter pills
const filters: { key: FilterType; icon: React.ReactNode; label: string }[] = [
  { 
    key: 'all', 
    icon: <ChefHat className="w-4 h-4" />, 
    label: 'Todos', 
  },
  { 
    key: 'table', 
    icon: <UtensilsCrossed className="w-4 h-4" />, 
    label: 'Mesa', 
  },
  { 
    key: 'tab', 
    icon: <User className="w-4 h-4" />, 
    label: 'Comanda', 
  },
  { 
    key: 'delivery', 
    icon: <Bike className="w-4 h-4" />, 
    label: 'Delivery', 
  },
  { 
    key: 'counter', 
    icon: <Package className="w-4 h-4" />, 
    label: 'Balcão', 
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
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Left Section: Menu + Store Status */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9" />
          
          <button
            onClick={onStoreControl}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isStoreOpen 
                ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700' 
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Store className="w-4 h-4" />
            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
            {isStoreOpen ? 'Aberto' : 'Fechado'}
          </button>
        </div>

        {/* Center Section: Minimal Filter Pills */}
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {filters.map((f) => {
              const count = orderCounts[f.key];
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => onFilterChange(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive 
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {f.icon}
                  <span className="hidden lg:inline">{f.label}</span>
                  {count > 0 && (
                    <Badge 
                      variant="secondary"
                      className={`h-5 min-w-[20px] px-1.5 text-[10px] font-semibold ml-0.5 border-0 ${
                        isActive 
                          ? 'bg-white/20 text-white dark:bg-zinc-900/30 dark:text-zinc-900' 
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
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
              className="pl-9 h-9 w-44 lg:w-56 bg-zinc-100 dark:bg-zinc-800 border-0 focus-visible:ring-1 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-600 rounded-lg"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* New Order Button */}
          <Button 
            size="sm" 
            className="h-9 gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-lg font-medium"
            onClick={onNewOrder}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
          </Button>

          {/* Icon Actions */}
          <div className="flex items-center border-l border-zinc-200 dark:border-zinc-700 ml-1 pl-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`h-9 w-9 rounded-lg ${isCompactMode ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-500 dark:text-zinc-400'}`}
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
                  className={`h-9 w-9 rounded-lg ${soundEnabled ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-500 dark:text-zinc-400'}`}
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
                  className="h-9 w-9 rounded-lg relative text-zinc-500 dark:text-zinc-400"
                >
                  <Bell className="w-4 h-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold rounded-full flex items-center justify-center">
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
                  className="h-9 w-9 rounded-lg text-zinc-500 dark:text-zinc-400"
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
