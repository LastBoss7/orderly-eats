import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { 
  ChefHat,
  Construction,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Kitchen() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-muted/30">
        {/* Top Bar */}
        <div className="bg-card border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Cozinha (KDS)</h1>
                <p className="text-sm text-muted-foreground">Kitchen Display System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-24 h-24 rounded-2xl bg-warning/10 border-2 border-warning/30 flex items-center justify-center">
              <Construction className="w-12 h-12 text-warning" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Em Desenvolvimento
              </h2>
              <p className="text-muted-foreground">
                O KDS (Kitchen Display System) está em fase de desenvolvimento e será lançado em breve com recursos incríveis para otimizar a gestão da sua cozinha.
              </p>
            </div>

            {/* Features coming */}
            <div className="bg-card rounded-xl border p-6 text-left space-y-3">
              <p className="font-semibold text-foreground text-sm">Recursos em breve:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Visualização de pedidos em tempo real
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Controle de tempo de preparo
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Alertas de pedidos atrasados
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Organização por estações de preparo
                </li>
              </ul>
            </div>

            {/* Back button */}
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
