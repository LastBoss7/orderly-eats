import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderOpen } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface CategoryAddonLinkerProps {
  groupId: string;
  restaurantId: string;
}

export function CategoryAddonLinker({ groupId, restaurantId }: CategoryAddonLinkerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [linkedCategories, setLinkedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId || !groupId) return;

      try {
        const [categoriesRes, linksRes] = await Promise.all([
          supabase
            .from('categories')
            .select('id, name')
            .eq('restaurant_id', restaurantId)
            .order('name'),
          supabase
            .from('category_addon_groups')
            .select('category_id')
            .eq('addon_group_id', groupId),
        ]);

        setCategories(categoriesRes.data || []);
        setLinkedCategories((linksRes.data || []).map(l => l.category_id));
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, restaurantId]);

  const handleToggleCategory = async (categoryId: string) => {
    setSaving(true);
    const isLinked = linkedCategories.includes(categoryId);

    try {
      if (isLinked) {
        // Remove link
        await supabase
          .from('category_addon_groups')
          .delete()
          .eq('addon_group_id', groupId)
          .eq('category_id', categoryId);

        setLinkedCategories(prev => prev.filter(id => id !== categoryId));
      } else {
        // Add link
        await supabase
          .from('category_addon_groups')
          .insert({
            addon_group_id: groupId,
            category_id: categoryId,
          });

        setLinkedCategories(prev => [...prev, categoryId]);
      }
    } catch (error) {
      console.error('Error updating category link:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FolderOpen className="w-3 h-3" />
        <span>Vincular a categorias:</span>
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isLinked = linkedCategories.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleToggleCategory(category.id)}
              disabled={saving}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all
                ${isLinked 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }
              `}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
