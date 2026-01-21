import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight,
  ArrowLeft,
  Plus,
  MoreVertical,
  MapPin,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SalonArea {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

const areaColors = [
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Verde', value: 'bg-green-500' },
  { name: 'Amarelo', value: 'bg-yellow-500' },
  { name: 'Vermelho', value: 'bg-red-500' },
  { name: 'Roxo', value: 'bg-purple-500' },
  { name: 'Rosa', value: 'bg-pink-500' },
];

export default function SalonAreas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', description: '', color: 'bg-blue-500' });
  const [areas, setAreas] = useState<SalonArea[]>([]);

  useEffect(() => {
    fetchAreas();
  }, [restaurant?.id]);

  const fetchAreas = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('salon_areas')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = async () => {
    if (!newArea.name.trim()) {
      toast.error({
        title: 'Erro',
        description: 'Nome da área é obrigatório.',
      });
      return;
    }

    if (!restaurant?.id) return;

    setSaving(true);

    try {
      const nextSortOrder = areas.length > 0 
        ? Math.max(...areas.map(a => a.sort_order || 0)) + 1 
        : 0;

      const { error } = await supabase
        .from('salon_areas')
        .insert({
          restaurant_id: restaurant.id,
          name: newArea.name.trim(),
          description: newArea.description.trim() || null,
          color: newArea.color,
          sort_order: nextSortOrder,
        });

      if (error) throw error;

      setNewArea({ name: '', description: '', color: 'bg-blue-500' });
      setIsDialogOpen(false);
      fetchAreas();

      toast.success({
        title: 'Área adicionada',
        description: `${newArea.name} foi criada com sucesso.`,
      });
    } catch (error: any) {
      toast.error({
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const removeArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('salon_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAreas();

      toast.success({
        title: 'Área removida',
        description: 'A área foi removida do salão.',
      });
    } catch (error: any) {
      toast.error({
        title: 'Erro',
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span 
            className="cursor-pointer hover:text-foreground"
            onClick={() => navigate('/salon-settings')}
          >
            Gestão do Salão
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Áreas do Salão</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/salon-settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Áreas do Salão</h1>
            <p className="text-muted-foreground">
              Defina as áreas e setores do seu estabelecimento
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Área
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Área</DialogTitle>
                <DialogDescription>
                  Defina um novo setor para organizar seu salão.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="area-name">Nome da Área *</Label>
                  <Input
                    id="area-name"
                    placeholder="Ex: Área Externa, Mezanino, VIP"
                    value={newArea.name}
                    onChange={(e) => setNewArea(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area-desc">Descrição</Label>
                  <Input
                    id="area-desc"
                    placeholder="Descrição opcional da área"
                    value={newArea.description}
                    onChange={(e) => setNewArea(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor de Identificação</Label>
                  <div className="flex gap-2 flex-wrap">
                    {areaColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full ${color.value} transition-all ${
                          newArea.color === color.value 
                            ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                            : 'hover:scale-105'
                        }`}
                        onClick={() => setNewArea(prev => ({ ...prev, color: color.value }))}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddArea} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Área'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Areas Grid */}
        {areas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areas.map((area) => (
              <Card key={area.id} className="overflow-hidden">
                <div className={`h-2 ${area.color}`} />
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-3 rounded-lg ${area.color} bg-opacity-20`}>
                    <MapPin className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{area.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {area.description || 'Sem descrição'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => removeArea(area.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhuma área cadastrada</h3>
              <p className="text-muted-foreground mb-4">
                Organize seu salão criando diferentes áreas como: Área Externa, Mezanino, VIP, etc.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar primeira área
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
