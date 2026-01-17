import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';

interface AddonGroup {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
}

interface ProductAddonLinkerProps {
  productId: string | null;
  restaurantId: string;
  selectedGroups: string[];
  onSelectionChange: (groupIds: string[]) => void;
}

export function ProductAddonLinker({
  productId,
  restaurantId,
  selectedGroups,
  onSelectionChange,
}: ProductAddonLinkerProps) {
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddonGroups = async () => {
      if (!restaurantId) return;

      try {
        const { data, error } = await supabase
          .from('addon_groups')
          .select('id, name, description, is_required, min_selections, max_selections')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('sort_order');

        if (error) throw error;
        setAddonGroups(data || []);
      } catch (error) {
        console.error('Error fetching addon groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAddonGroups();
  }, [restaurantId]);

  // Load existing links when editing a product
  useEffect(() => {
    const fetchExistingLinks = async () => {
      if (!productId) return;

      try {
        const { data, error } = await supabase
          .from('product_addon_groups')
          .select('addon_group_id')
          .eq('product_id', productId);

        if (error) throw error;
        
        const linkedGroupIds = data?.map(link => link.addon_group_id) || [];
        onSelectionChange(linkedGroupIds);
      } catch (error) {
        console.error('Error fetching product addon links:', error);
      }
    };

    fetchExistingLinks();
  }, [productId]);

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      onSelectionChange(selectedGroups.filter(id => id !== groupId));
    } else {
      onSelectionChange([...selectedGroups, groupId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (addonGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
        <Package className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum grupo de adicional cadastrado</p>
        <p className="text-xs">Crie grupos em Cardápio → Adicionais</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addonGroups.map((group) => (
        <div
          key={group.id}
          className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <Checkbox
            id={`addon-group-${group.id}`}
            checked={selectedGroups.includes(group.id)}
            onCheckedChange={() => handleToggleGroup(group.id)}
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`addon-group-${group.id}`}
                className="font-medium cursor-pointer"
              >
                {group.name}
              </Label>
              {group.is_required && (
                <Badge variant="secondary" className="text-xs">
                  Obrigatório
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground">{group.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {group.min_selections === 0 && group.max_selections === 1
                ? 'Escolha até 1 opção'
                : group.min_selections > 0
                ? `Escolha de ${group.min_selections} a ${group.max_selections} opções`
                : `Escolha até ${group.max_selections} opções`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
