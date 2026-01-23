import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, FolderOpen, Pencil, Trash2, Tag, ArrowUpDown, Smartphone, Globe, Monitor } from 'lucide-react';
import { 
  PremiumDialog, 
  PremiumFormSection, 
  PremiumInputGroup 
} from '@/components/ui/premium-dialog';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  visible_digital_menu: boolean;
  visible_waiter_app: boolean;
  visible_pos: boolean;
}

export default function Categories() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [visibleDigitalMenu, setVisibleDigitalMenu] = useState(true);
  const [visibleWaiterApp, setVisibleWaiterApp] = useState(true);
  const [visiblePos, setVisiblePos] = useState(true);

  const fetchCategories = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('sort_order');

      if (error) throw error;
      setCategories((data || []).map(cat => ({
        ...cat,
        visible_digital_menu: cat.visible_digital_menu ?? true,
        visible_waiter_app: cat.visible_waiter_app ?? true,
        visible_pos: cat.visible_pos ?? true,
      })));
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [restaurant?.id]);

  const resetForm = () => {
    setName('');
    setSortOrder('0');
    setVisibleDigitalMenu(true);
    setVisibleWaiterApp(true);
    setVisiblePos(true);
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSortOrder(category.sort_order.toString());
    setVisibleDigitalMenu(category.visible_digital_menu);
    setVisibleWaiterApp(category.visible_waiter_app);
    setVisiblePos(category.visible_pos);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name) {
      toast.error({
        title: 'Campo obrigatório',
        description: 'Preencha o nome da categoria.',
      });
      return;
    }

    setSaving(true);

    try {
      const categoryData = {
        restaurant_id: restaurant?.id,
        name,
        sort_order: parseInt(sortOrder) || 0,
        visible_digital_menu: visibleDigitalMenu,
        visible_waiter_app: visibleWaiterApp,
        visible_pos: visiblePos,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success({ title: 'Categoria atualizada!' });
      } else {
        const { error } = await supabase.from('categories').insert(categoryData);
        if (error) throw error;
        toast.success({ title: 'Categoria criada!' });
      }

      setShowDialog(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error({
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast.success({ title: 'Categoria excluída!' });
      fetchCategories();
    } catch (error: any) {
      toast.error({
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  };

  const getVisibilityBadges = (category: Category) => {
    const badges = [];
    if (category.visible_digital_menu) badges.push({ label: 'Menu Digital', icon: Globe, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' });
    if (category.visible_waiter_app) badges.push({ label: 'Garçom', icon: Smartphone, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' });
    if (category.visible_pos) badges.push({ label: 'PDV', icon: Monitor, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' });
    return badges;
  };

  return (
    <DashboardLayout>
      <div className="p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
            <p className="text-muted-foreground">
              Organize os produtos em categorias
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        {/* Premium Dialog */}
        <PremiumDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) resetForm();
          }}
          title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          description={editingCategory 
            ? 'Atualize as informações da categoria'
            : 'Crie uma nova categoria para organizar seus produtos'
          }
          icon={<Tag className="w-6 h-6" />}
        >
          <div className="space-y-5 pt-4">
            <PremiumFormSection>
              <PremiumInputGroup 
                label="Nome da categoria" 
                required
                hint="Ex: Bebidas, Lanches, Sobremesas"
              >
                <Input
                  placeholder="Digite o nome..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </PremiumInputGroup>
            </PremiumFormSection>

            <PremiumFormSection 
              variant="highlighted"
              title="Ordenação"
              description="Defina a posição desta categoria no menu"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <Input
                  type="number"
                  placeholder="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="flex-1 h-11"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Números menores aparecem primeiro no cardápio
              </p>
            </PremiumFormSection>

            <PremiumFormSection 
              variant="highlighted"
              title="Visibilidade"
              description="Escolha onde esta categoria aparece"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="visible_digital_menu"
                    checked={visibleDigitalMenu}
                    onCheckedChange={(checked) => setVisibleDigitalMenu(!!checked)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <Label htmlFor="visible_digital_menu" className="font-medium cursor-pointer">
                        Cardápio Digital
                      </Label>
                      <p className="text-xs text-muted-foreground">Visível para clientes no menu online</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="visible_waiter_app"
                    checked={visibleWaiterApp}
                    onCheckedChange={(checked) => setVisibleWaiterApp(!!checked)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <Label htmlFor="visible_waiter_app" className="font-medium cursor-pointer">
                        App do Garçom
                      </Label>
                      <p className="text-xs text-muted-foreground">Visível para garçons no aplicativo</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="visible_pos"
                    checked={visiblePos}
                    onCheckedChange={(checked) => setVisiblePos(!!checked)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Monitor className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <Label htmlFor="visible_pos" className="font-medium cursor-pointer">
                        PDV / Dashboard
                      </Label>
                      <p className="text-xs text-muted-foreground">Visível no sistema interno</p>
                    </div>
                  </div>
                </div>
              </div>
            </PremiumFormSection>

            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingCategory ? (
                <>
                  <Pencil className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Categoria
                </>
              )}
            </Button>
          </div>
        </PremiumDialog>

        {/* Categories Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-muted-foreground animate-pulse">Carregando categorias...</p>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 opacity-50" />
            </div>
            <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
            <p className="text-sm">Clique em "Nova Categoria" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const visibilityBadges = getVisibilityBadges(category);
              return (
                <Card 
                  key={category.id} 
                  className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FolderOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{category.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <ArrowUpDown className="w-3 h-3" />
                            Ordem: {category.sort_order}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Visibility Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {visibilityBadges.length > 0 ? (
                        visibilityBadges.map((badge, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className={`text-[10px] px-2 py-0.5 gap-1 ${badge.color}`}
                          >
                            <badge.icon className="w-3 h-3" />
                            {badge.label}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                          Oculta em todos
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
