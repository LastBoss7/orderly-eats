import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, FolderOpen, Pencil, Trash2, Tag, ArrowUpDown } from 'lucide-react';
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

  const fetchCategories = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
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
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSortOrder(category.sort_order.toString());
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
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <CardContent className="p-4 flex items-center justify-between">
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
                      className="hover:bg-primary/10 hover:text-primary"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
