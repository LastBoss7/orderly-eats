import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Printer,
  Clock,
  History,
  Wallet,
  UserCircle,
  Settings2,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
} from 'lucide-react';
import logoGamako from '@/assets/logo-gamako.png';
import logoGamakoIcon from '@/assets/logo-gamako-icon.png';

const mainMenuItems = [
  { title: 'Meus pedidos', url: '/dashboard', icon: ClipboardList, badge: 0 },
  { title: 'Pedidos balcão (PDV)', url: '/pos', icon: ShoppingCart },
  { title: 'Pedidos salão', url: '/tables', icon: Grid3X3 },
  { title: 'Pedidos agendados', url: '/scheduled', icon: Calendar, badge: 0 },
];

const cardapioSubmenu = [
  { title: 'Gestor', url: '/products', icon: Package },
  { title: 'Categorias', url: '/categories', icon: FolderOpen },
  { title: 'Imagens do cardápio', url: '/menu-images', icon: Image },
  { title: 'Edição em massa', url: '/bulk-edit', icon: Edit3 },
];

const bottomMenuItems = [
  { title: 'Entregas', url: '/deliveries', icon: Truck },
  { title: 'Config. Entregas', url: '/delivery-settings', icon: Settings2 },
  { title: 'Clientes', url: '/customers', icon: UserCircle },
  { title: 'Histórico Vendas', url: '/tab-history', icon: History },
  { title: 'Fechamentos', url: '/closing-history', icon: Wallet },
  { title: 'Tempo de Preparo', url: '/prep-time-report', icon: Clock },
  { title: 'Meu Desempenho', url: '/analytics', icon: BarChart3 },
  { title: 'Cozinha (KDS)', url: '/kitchen', icon: ChefHat },
  { title: 'Impressora', url: '/printers', icon: Printer },
  { title: 'Meu Estabelecimento', url: '/restaurant-settings', icon: Settings2 },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, restaurant, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const { newDeliveriesCount, markDeliveriesAsViewed } = useSidebarBadges();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';
  
  // Check if any cardapio route is active
  const isCardapioActive = cardapioSubmenu.some(item => location.pathname === item.url);
  const [cardapioOpen, setCardapioOpen] = useState(isCardapioActive);

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
      <SidebarHeader className={`border-b border-sidebar-border ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {/* Logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-3`}>
          <Link to="/dashboard" className="flex items-center">
            {isCollapsed ? (
              <img src={logoGamakoIcon} alt="Gamako" className="h-8 w-8 object-contain" />
            ) : (
              <img src={logoGamako} alt="Gamako" className="h-10 object-contain" />
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

        {/* Caixa status - hidden when collapsed */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-sidebar-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sidebar-foreground text-sm">Caixa</span>
                <Badge className="bg-success text-success-foreground text-[10px] px-1.5 py-0">
                  Aberto
                </Badge>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-sidebar-foreground/50" />
          </div>
        )}

        {/* Search - hidden when collapsed */}
        {!isCollapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
            <Input 
              placeholder="Procurando por algo?" 
              className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 h-9"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={`${isCollapsed ? 'px-1' : 'px-3'} py-4`}>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2 px-3">
              Seu dia a dia
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
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
            <SidebarMenu>
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
        {isAdmin && (
          <SidebarGroup className="mt-6">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2 px-3">
                Administração
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          className={`sidebar-menu-item ${isActive('/admin') ? 'active' : ''}`}
                        >
                          <Link to="/admin">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover">
                        Painel Admin
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      className={`sidebar-menu-item ${isActive('/admin') ? 'active' : ''}`}
                    >
                      <Link to="/admin">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="flex-1">Painel Admin</span>
                        <Badge variant="outline" className="text-[10px] border-primary text-primary">
                          Super
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className={`border-t border-sidebar-border ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-10 h-10 border-2 border-sidebar-primary cursor-pointer">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover">
                <p className="font-medium">{restaurant?.name || 'Restaurante'}</p>
                <p className="text-xs text-muted-foreground">{profile?.full_name}</p>
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
            <Avatar className="w-10 h-10 border-2 border-sidebar-primary">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {restaurant?.name || 'Restaurante'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.full_name}
              </p>
              <Badge className="bg-success text-success-foreground text-[10px] px-1.5 py-0 mt-1">
                ABERTO
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
