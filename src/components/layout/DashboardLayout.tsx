import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Loader2, Bell, Settings, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { usePrintNotifications } from '@/hooks/usePrintNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function DashboardLayout({ children, showHeader = false }: DashboardLayoutProps) {
  const { user, profile, restaurant, loading, signOut } = useAuth();
  
  // Subscribe to print notifications
  usePrintNotifications(profile?.restaurant_id ?? null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block access if profile or restaurant is incomplete
  if (!profile || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 text-center border border-border/50">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Acesso Incompleto</h1>
          <p className="text-muted-foreground mb-6">
            Seu cadastro não foi finalizado corretamente. Por favor, complete o processo de registro ou entre em contato com o suporte.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }}
              className="w-full h-12"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
            <a 
              href="https://wa.me/5511997150342?text=Olá! Preciso de ajuda com meu cadastro no Gamako."
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="outline" className="w-full h-11">
                Falar com Suporte
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {showHeader && (
            <header className="h-14 border-b bg-card flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </header>
          )}
          <div className="flex-1 overflow-hidden flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
