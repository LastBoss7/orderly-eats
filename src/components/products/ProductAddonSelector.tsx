import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface AddonGroup {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
}

interface Addon {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  groupId: string;
  groupName: string;
}

interface ProductAddonSelectorProps {
  productId: string;
  productCategoryId?: string | null;
  restaurantId: string;
  selectedAddons: SelectedAddon[];
  onSelectionChange: (addons: SelectedAddon[]) => void;
  /** Use edge function instead of direct supabase queries (for waiter app) */
  useEdgeFunction?: boolean;
}

export function ProductAddonSelector({
  productId,
  productCategoryId,
  restaurantId,
  selectedAddons,
  onSelectionChange,
  useEdgeFunction = false,
}: ProductAddonSelectorProps) {
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddons = async () => {
      if (!productId || !restaurantId) {
        setLoading(false);
        return;
      }

      try {
        // Use edge function for waiter app (bypasses RLS)
        if (useEdgeFunction) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          const params = new URLSearchParams({
            restaurant_id: restaurantId,
            action: 'product-addons',
            product_id: productId,
          });
          if (productCategoryId) {
            params.append('category_id', productCategoryId);
          }
          
          const response = await fetch(`${supabaseUrl}/functions/v1/waiter-data?${params}`, {
            headers: {
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            setAddonGroups(result.groups || []);
            setAddons(result.addons || []);
          } else {
            console.error('Failed to fetch addons via edge function');
            setAddonGroups([]);
            setAddons([]);
          }
          setLoading(false);
          return;
        }

        // Direct supabase queries (for dashboard with auth)
        // Get addon groups linked directly to this product
        const { data: productLinks, error: productLinksError } = await supabase
          .from('product_addon_groups')
          .select('addon_group_id')
          .eq('product_id', productId);

        if (productLinksError) throw productLinksError;

        // Get addon groups linked to the product's category
        let categoryGroupIds: string[] = [];
        if (productCategoryId) {
          const { data: categoryLinks, error: categoryLinksError } = await supabase
            .from('category_addon_groups')
            .select('addon_group_id')
            .eq('category_id', productCategoryId);

          if (categoryLinksError) throw categoryLinksError;
          categoryGroupIds = (categoryLinks || []).map(l => l.addon_group_id);
        }

        // Combine both sources (remove duplicates)
        const productGroupIds = (productLinks || []).map(l => l.addon_group_id);
        const allGroupIds = [...new Set([...productGroupIds, ...categoryGroupIds])];

        if (allGroupIds.length === 0) {
          setAddonGroups([]);
          setAddons([]);
          setLoading(false);
          return;
        }

        // Fetch the addon groups
        const { data: groups, error: groupsError } = await supabase
          .from('addon_groups')
          .select('id, name, description, is_required, min_selections, max_selections')
          .in('id', allGroupIds)
          .eq('is_active', true)
          .order('sort_order');

        if (groupsError) throw groupsError;

        // Fetch all addons for these groups
        const { data: addonItems, error: addonsError } = await supabase
          .from('addons')
          .select('id, group_id, name, price, is_available')
          .in('group_id', allGroupIds)
          .eq('is_available', true)
          .order('sort_order');

        if (addonsError) throw addonsError;

        setAddonGroups(groups || []);
        setAddons(addonItems || []);
      } catch (error) {
        console.error('Error fetching product addons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAddons();
  }, [productId, productCategoryId, restaurantId, useEdgeFunction]);

  const handleToggleAddon = (addon: Addon, group: AddonGroup) => {
    const isSelected = selectedAddons.some(a => a.id === addon.id);
    
    if (isSelected) {
      // Remove addon
      onSelectionChange(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      // Check max selections for this group
      const groupSelectedCount = selectedAddons.filter(a => a.groupId === group.id).length;
      
      if (groupSelectedCount >= group.max_selections) {
        // Replace the first selected addon in this group if max reached
        const newAddons = selectedAddons.filter(a => a.groupId !== group.id || groupSelectedCount < group.max_selections);
        if (groupSelectedCount >= group.max_selections) {
          // Remove oldest selection from this group
          const firstInGroup = selectedAddons.find(a => a.groupId === group.id);
          if (firstInGroup) {
            const filtered = selectedAddons.filter(a => a.id !== firstInGroup.id);
            onSelectionChange([...filtered, {
              id: addon.id,
              name: addon.name,
              price: addon.price,
              groupId: group.id,
              groupName: group.name,
            }]);
            return;
          }
        }
      }
      
      // Add addon
      onSelectionChange([...selectedAddons, {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        groupId: group.id,
        groupName: group.name,
      }]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getGroupAddons = (groupId: string) => {
    return addons.filter(a => a.group_id === groupId);
  };

  const getGroupSelectedCount = (groupId: string) => {
    return selectedAddons.filter(a => a.groupId === groupId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (addonGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {addonGroups.map((group) => {
        const groupAddons = getGroupAddons(group.id);
        const selectedCount = getGroupSelectedCount(group.id);
        
        if (groupAddons.length === 0) return null;
        
        return (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="font-medium text-sm">{group.name}</Label>
              {group.is_required && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  Obrigatório
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {selectedCount}/{group.max_selections}
              </span>
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground">{group.description}</p>
            )}
            <div className="space-y-1">
              {groupAddons.map((addon) => {
                const isSelected = selectedAddons.some(a => a.id === addon.id);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => handleToggleAddon(addon, group)}
                    className={`
                      w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <span className="text-sm">{addon.name}</span>
                    </div>
                    {addon.price > 0 && (
                      <span className="text-sm font-medium text-primary">
                        +{formatCurrency(addon.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
