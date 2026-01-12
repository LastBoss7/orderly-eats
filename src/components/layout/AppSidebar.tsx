import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  LayoutDashboard,
  ShoppingCart,
  Grid3X3,
  Package,
  FolderOpen,
  LogOut,
  User,
  Search,
  ClipboardList,
  Calendar,
  Truck,
  BarChart3,
  UtensilsCrossed,
  Bot,
  Settings,
  ChevronRight,
} from 'lucide-react';

const mainMenuItems = [
  { title: 'Meus pedidos', url: '/dashboard', icon: ClipboardList, badge: 0 },
  { title: 'Pedidos balcão (PDV)', url: '/pos', icon: ShoppingCart },
  { title: 'Pedidos salão', url: '/tables', icon: Grid3X3 },
  { title: 'Pedidos agendados', url: '/scheduled', icon: Calendar, badge: 0 },
  { title: 'Gestor de cardápio', url: '/products', icon: UtensilsCrossed, hasSubmenu: true },
  { title: 'Categorias', url: '/categories', icon: FolderOpen },
  { title: 'Entregas', url: '/deliveries', icon: Truck, badge: 3 },
  { title: 'Meu Desempenho', url: '/analytics', icon: BarChart3 },
  { title: 'Cozinha (KDS)', url: '/kitchen', icon: ChefHat },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, profile, restaurant, signOut } = useAuth();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar className="border-r-0 bg-sidebar-background">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {/* Caixa status */}
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
          <Input 
            placeholder="Procurando por algo?" 
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 h-9"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2 px-3">
            Seu dia a dia
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`sidebar-menu-item ${isActive(item.url) ? 'active' : ''}`}
                  >
                    <Link to={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="sidebar-menu-badge">{item.badge}</span>
                      )}
                      {item.hasSubmenu && (
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2 px-3">
            Meu Salão
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={`sidebar-menu-item ${isActive('/waiter') ? 'active' : ''}`}
                >
                  <Link to="/waiter">
                    <User className="w-5 h-5" />
                    <span className="flex-1">Gestão de salão</span>
                    <Badge variant="outline" className="text-[10px] border-success text-success">
                      Grátis
                    </Badge>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
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
      </SidebarFooter>
    </Sidebar>
  );
}
