import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronRight,
  User,
  Settings,
  Users,
  LayoutGrid,
  MapPin,
} from 'lucide-react';

const salonSubOptions = [
  {
    title: 'Dados do Salão',
    description: 'Configure informações gerais da operação do salão',
    icon: Settings,
    href: '/salon-settings/dados',
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'Gestão de Garçons',
    description: 'Gerencie sua equipe de garçons e atribuições',
    icon: Users,
    href: '/salon-settings/garcons',
    color: 'bg-success/10 text-success',
  },
  {
    title: 'Áreas do Salão',
    description: 'Defina as áreas e setores do seu estabelecimento',
    icon: MapPin,
    href: '/salon-settings/areas',
    color: 'bg-warning/10 text-warning',
  },
  {
    title: 'Layout de Mesas',
    description: 'Configure a disposição e organização das mesas',
    icon: LayoutGrid,
    href: '/salon-settings/layout',
    color: 'bg-destructive/10 text-destructive',
  },
];

export default function SalonSettings() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Gestão do Salão</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão do Salão</h1>
            <p className="text-muted-foreground mt-1">
              Configure todas as opções relacionadas ao seu salão
            </p>
          </div>
          <Button 
            onClick={() => navigate('/waiter')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            Acessar Garçom
          </Button>
        </div>

        {/* Sub-options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {salonSubOptions.map((option) => (
            <Link key={option.href} to={option.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className={`p-3 rounded-lg ${option.color}`}>
                    <option.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {option.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {option.description}
                    </CardDescription>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
