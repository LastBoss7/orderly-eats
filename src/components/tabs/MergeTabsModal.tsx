import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Loader2, 
  Merge,
  Receipt,
  User,
  ArrowRight,
} from 'lucide-react';

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
  status: string;
}

interface Order {
  id: string;
  total: number;
}

interface MergeTabsModalProps {
  open: boolean;
  onClose: () => void;
  targetTab: Tab | null;
  onMergeComplete: () => void;
}

export function MergeTabsModal({ 
  open, 
  onClose, 
  targetTab,
  onMergeComplete,
}: MergeTabsModalProps) {
  const { restaurant } = useAuth();
  const [availableTabs, setAvailableTabs] = useState<Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [tabOrderCounts, setTabOrderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);

  // Fetch available tabs to merge
  useEffect(() => {
    if (!open || !restaurant?.id || !targetTab) return;

    const fetchTabs = async () => {
      setLoading(true);
      try {
        // Get occupied tabs except the target
        const { data: tabs, error: tabsError } = await supabase
          .from('tabs')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('status', 'occupied')
          .neq('id', targetTab.id)
          .order('number');

        if (tabsError) throw tabsError;

        // Get order counts for each tab
        const counts: Record<string, number> = {};
        for (const tab of tabs || []) {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('tab_id', tab.id)
            .in('status', ['pending', 'preparing', 'ready', 'served']);
          
          counts[tab.id] = count || 0;
        }

        setAvailableTabs((tabs || []) as Tab[]);
        setTabOrderCounts(counts);
      } catch (error) {
        console.error('Error fetching tabs:', error);
        toast.error('Erro ao carregar comandas');
      } finally {
        setLoading(false);
      }
    };

    fetchTabs();
    setSelectedTabs([]);
  }, [open, restaurant?.id, targetTab]);

  const toggleTabSelection = (tabId: string) => {
    setSelectedTabs(prev => 
      prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );
  };

  const handleMerge = async () => {
    if (!targetTab || selectedTabs.length === 0) return;

    setMerging(true);
    try {
      // Move all orders from selected tabs to target tab
      for (const sourceTabId of selectedTabs) {
        await supabase
          .from('orders')
          .update({ tab_id: targetTab.id })
          .eq('tab_id', sourceTabId)
          .in('status', ['pending', 'preparing', 'ready', 'served']);

        // Free up the source tab
        await supabase
          .from('tabs')
          .update({ status: 'available', customer_name: null })
          .eq('id', sourceTabId);
      }

      const tabNumbers = availableTabs
        .filter(t => selectedTabs.includes(t.id))
        .map(t => t.number)
        .join(', ');

      toast.success(`Comandas #${tabNumbers} fundidas com #${targetTab.number}`);
      onMergeComplete();
      onClose();
    } catch (error: any) {
      console.error('Error merging tabs:', error);
      toast.error('Erro ao fundir comandas: ' + error.message);
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Merge className="w-5 h-5 text-primary" />
            Fundir Comandas
          </DialogTitle>
        </DialogHeader>

        {/* Target Tab Info */}
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Destino</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">#{targetTab?.number}</span>
            {targetTab?.customer_name && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {targetTab.customer_name}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">
            Selecione as comandas para fundir:
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : availableTabs.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                Nenhuma outra comanda ocupada
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {availableTabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${selectedTabs.includes(tab.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                    onClick={() => toggleTabSelection(tab.id)}
                  >
                    <Checkbox 
                      checked={selectedTabs.includes(tab.id)}
                      onCheckedChange={() => toggleTabSelection(tab.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">#{tab.number}</span>
                        {tab.customer_name && (
                          <span className="text-sm text-muted-foreground">
                            {tab.customer_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tabOrderCounts[tab.id] || 0} pedido(s) ativo(s)
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={merging}>
            Cancelar
          </Button>
          <Button 
            onClick={handleMerge} 
            disabled={selectedTabs.length === 0 || merging}
            className="gap-2"
          >
            {merging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Merge className="w-4 h-4" />
            )}
            Fundir {selectedTabs.length > 0 && `(${selectedTabs.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
