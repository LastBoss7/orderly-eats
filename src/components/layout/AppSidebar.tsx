import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChefHat,
  ShoppingCart,
  Grid3X3,
  Package,
  FolderOpen,
  LogOut,
  Search,
  ClipboardList,
  Calendar,
  Truck,
  BarChart3,
  UtensilsCrossed,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Image,
  Edit3,
  ExternalLink,
  Printer,
  Clock,
  History,
  Wallet,
  CirclePlus,
  UserCircle,
  Settings2,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  Volume2,
  MessageSquare,
} from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-white.png';
import logoGamakoIcon from '@/assets/logo-gamako-white-icon-new.png';

const mainMenuItems = [
  { title: 'Meus pedidos', url: '/dashboard', icon: ClipboardList, badge: 0 },
  { title: 'Pedidos balcão (PDV)', url: '/pos', icon: ShoppingCart },
  { title: 'Pedidos salão', url: '/tables', icon: Grid3X3 },
  { title: 'Pedidos agendados', url: '/scheduled', icon: Calendar, badge: 0 },
];

const cardapioSubmenu = [
  { title: 'Gestor', url: '/products', icon: Package },
  { title: 'Adicionais', url: '/addons', icon: CirclePlus },
  { title: 'Categorias', url: '/categories', icon: FolderOpen },
  { title: 'Imagens do cardápio', url: '/menu-images', icon: Image },
  { title: 'Edição em massa', url: '/bulk-edit', icon: Edit3 },
  { title: 'Cardápio Digital', url: '/digital-menu-settings', icon: ExternalLink },
];

const bottomMenuItems = [
  { title: 'Feedback Clientes', url: '/feedback', icon: MessageSquare },
  { title: 'iFood', url: '/ifood-settings', icon: ExternalLink },
  { title: 'Estoque', url: '/inventory', icon: Package },
  { title: 'Ficha Técnica', url: '/product-recipes', icon: ChefHat },
  { title: 'Consumo', url: '/consumption-report', icon: BarChart3 },
  { title: 'Entregas', url: '/deliveries', icon: Truck },
  { title: 'Config. Entregas', url: '/delivery-settings', icon: Settings2 },
  { title: 'Clientes', url: '/customers', icon: UserCircle },
  { title: 'Histórico Vendas', url: '/tab-history', icon: History },
  { title: 'Fechamentos', url: '/closing-history', icon: Wallet },
  { title: 'Tempo de Preparo', url: '/prep-time-report', icon: Clock },
  { title: 'Meu Desempenho', url: '/analytics', icon: BarChart3 },
  { title: 'Relatórios de Vendas', url: '/sales-reports', icon: Receipt },
  { title: 'Cozinha (KDS)', url: '/kitchen', icon: ChefHat },
  { title: 'Impressora', url: '/printers', icon: Printer },
  { title: 'Sons', url: '/sound-settings', icon: Volume2 },
  { title: 'Horário de Funcionamento', url: '/opening-hours', icon: Clock },
  { title: 'Meu Estabelecimento', url: '/restaurant-settings', icon: Settings2 },
  { title: 'NFC-e', url: '/nfce-settings', icon: Receipt },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, restaurant, signOut } = useAuth();
  
  const { newDeliveriesCount, markDeliveriesAsViewed } = useSidebarBadges();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [isTogglingStore, setIsTogglingStore] = useState(false);
  
  // Check if any cardapio route is active
  const isCardapioActive = cardapioSubmenu.some(item => location.pathname === item.url);
  const [cardapioOpen, setCardapioOpen] = useState(isCardapioActive);

  // Fetch store open status
  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchStoreStatus = async () => {
      const { data } = await supabase
        .from('salon_settings')
        .select('is_open')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();
      
      setIsOpen(data?.is_open ?? false);
    };

    fetchStoreStatus();

    // Subscribe to realtime changes (both INSERT and UPDATE)
    const channel = supabase
      .channel(`store-status-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'salon_settings',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.new && 'is_open' in payload.new) {
            setIsOpen(payload.new.is_open as boolean);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id]);

  // Toggle store open/closed status
  const handleToggleStore = async () => {
    if (!restaurant?.id || isTogglingStore) return;
    
    setIsTogglingStore(true);
    const newStatus = !isOpen;
    
    try {
      // Check if salon_settings exists
      const { data: existingSettings } = await supabase
        .from('salon_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from('salon_settings')
          .update({ 
            is_open: newStatus,
            last_opened_at: newStatus ? new Date().toISOString() : undefined,
          })
          .eq('restaurant_id', restaurant.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salon_settings')
          .insert({
            restaurant_id: restaurant.id,
            is_open: newStatus,
            last_opened_at: newStatus ? new Date().toISOString() : undefined,
          });
        
        if (error) throw error;
      }
      
      setIsOpen(newStatus);
      toast.success(newStatus ? 'Estabelecimento aberto!' : 'Estabelecimento fechado!');
    } catch (error) {
      console.error('Error toggling store status:', error);
      toast.error('Erro ao alterar status do estabelecimento');
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Mark deliveries as viewed when visiting deliveries page
  useEffect(() => {
    if (location.pathname === '/deliveries') {
      markDeliveriesAsViewed();
    }
  }, [location.pathname, markDeliveriesAsViewed]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (url: string) => location.pathname === url;

  // Render menu item with tooltip when collapsed
  const renderMenuItem = (item: { title: string; url: string; icon: any }, badgeCount?: number) => {
    const Icon = item.icon;
    const content = (
      <SidebarMenuButton
        asChild
        className={`sidebar-menu-item ${isActive(item.url) ? 'active' : ''}`}
      >
        <Link to={item.url}>
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="flex-1">{item.title}</span>}
          {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
            <span className="sidebar-menu-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
          )}
        </Link>
      </SidebarMenuButton>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover">
            <span>{item.title}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-[10px]">
                {badgeCount > 99 ? '99+' : badgeCount}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar-background">
      <SidebarHeader className={`border-b border-sidebar-border ${isCollapsed ? 'p-2' : 'p-5'}`}>
        {/* Logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} ${isCollapsed ? 'mb-0' : 'mb-4'}`}>
        <Link to="/dashboard" className="flex items-center">
            {isCollapsed ? (
              <img src={logoGamakoIcon} alt="Gamako" className="h-12 w-12 object-contain" />
            ) : (
              <img src={logoGamako} alt="Gamako" className="h-20 object-contain animate-fade-in-up" />
            )}
          </Link>
          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Recolher menu
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-2"
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Expandir menu
            </TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>

      <SidebarContent className={`${isCollapsed ? 'px-0' : 'px-3'} py-4`}>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2 px-3">
              Seu dia a dia
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? 'items-center' : ''}`}>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderMenuItem(item, item.badge)}
                </SidebarMenuItem>
              ))}

              {/* Gestor de cardápio - Collapsible (hidden when collapsed, show icon only) */}
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        className={`sidebar-menu-item ${isCardapioActive ? 'active' : ''}`}
                      >
                        <Link to="/products">
                          <UtensilsCrossed className="w-5 h-5 flex-shrink-0" />
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover">
                      Gestor de cardápio
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Collapsible open={cardapioOpen} onOpenChange={setCardapioOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`sidebar-menu-item w-full cursor-pointer ${isCardapioActive ? 'active' : ''}`}
                      >
                        <UtensilsCrossed className="w-5 h-5" />
                        <span className="flex-1">Gestor de cardápio</span>
                        {cardapioOpen ? (
                          <ChevronDown className="w-4 h-4 opacity-50 transition-transform" />
                        ) : (
                          <ChevronRight className="w-4 h-4 opacity-50 transition-transform" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      {cardapioSubmenu.map((subItem) => (
                        <SidebarMenuButton
                          key={subItem.title}
                          asChild
                          className={`sidebar-menu-item text-sm ${isActive(subItem.url) ? 'active' : ''}`}
                        >
                          <Link to={subItem.url} className="animate-fade-in">
                            <span className="flex-1 ml-5">{subItem.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </SidebarMenuItem>

              {bottomMenuItems.map((item) => {
                const isDeliveries = item.url === '/deliveries';
                const badgeCount = isDeliveries ? newDeliveriesCount : 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    {renderMenuItem(item, badgeCount)}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2 px-3">
              Meu Salão
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className={isCollapsed ? 'items-center' : ''}>
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        className={`sidebar-menu-item ${isActive('/salon-settings') ? 'active' : ''}`}
                      >
                        <Link to="/salon-settings">
                          <Settings className="w-5 h-5 flex-shrink-0" />
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover">
                      Gestão de salão
                      <Badge variant="outline" className="ml-2 text-[10px] border-success text-success">
                        Grátis
                      </Badge>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <SidebarMenuButton
                    asChild
                    className={`sidebar-menu-item ${isActive('/salon-settings') ? 'active' : ''}`}
                  >
                    <Link to="/salon-settings">
                      <Settings className="w-5 h-5" />
                      <span className="flex-1">Gestão de salão</span>
                      <Badge variant="outline" className="text-[10px] border-success text-success">
                        Grátis
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Panel - Only visible for super admins */}
      </SidebarContent>

      <SidebarFooter className={`border-t border-sidebar-border ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleStore}
                  disabled={isTogglingStore}
                  className="relative group focus:outline-none disabled:opacity-50"
                >
                  <Avatar className="w-10 h-10 border-2 border-sidebar-primary cursor-pointer transition-transform group-hover:scale-105">
                    <AvatarImage src={restaurant?.logo_url || undefined} alt={restaurant?.name} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar-background transition-colors ${
                      isOpen ? 'bg-success' : 'bg-destructive'
                    } ${isTogglingStore ? 'animate-pulse' : ''}`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover">
                <p className="font-medium">{restaurant?.name || 'Restaurante'}</p>
                <p className="text-xs text-muted-foreground">{profile?.full_name}</p>
                <Badge className={`mt-1 text-[10px] ${isOpen ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                  {isOpen ? 'ABERTO' : 'FECHADO'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Clique para {isOpen ? 'fechar' : 'abrir'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover">
                Sair
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleStore}
                  disabled={isTogglingStore}
                  className="relative group focus:outline-none disabled:opacity-50"
                >
                  <Avatar className="w-10 h-10 border-2 border-sidebar-primary cursor-pointer transition-transform group-hover:scale-105">
                    <AvatarImage src={restaurant?.logo_url || undefined} alt={restaurant?.name} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar-accent transition-colors ${
                      isOpen ? 'bg-success' : 'bg-destructive'
                    } ${isTogglingStore ? 'animate-pulse' : ''}`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover">
                <p className="text-xs">Clique para {isOpen ? 'fechar' : 'abrir'} o estabelecimento</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {restaurant?.name || 'Restaurante'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.full_name}
              </p>
              <Badge className={`text-[10px] px-1.5 py-0 mt-1 cursor-pointer ${isOpen ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                {isOpen ? 'ABERTO' : 'FECHADO'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
