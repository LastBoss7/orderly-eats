import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Pencil, Trash2, Package, GripVertical } from 'lucide-react';
import { CategoryAddonLinker } from '@/components/products/CategoryAddonLinker';

interface AddonGroup {
  id: string;
  name: string;
  description: string | null;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Addon {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export default function Addons() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Group dialog state
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [minSelections, setMinSelections] = useState('0');
  const [maxSelections, setMaxSelections] = useState('1');
  const [isRequired, setIsRequired] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  
  // Addon dialog state
  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [addonGroupId, setAddonGroupId] = useState<string>('');
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('');
  const [savingAddon, setSavingAddon] = useState(false);

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      const [groupsRes, addonsRes] = await Promise.all([
        supabase.from('addon_groups').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
        supabase.from('addons').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
      ]);

      setGroups(groupsRes.data || []);
      setAddons(addonsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurant?.id]);

  const resetGroupForm = () => {
    setGroupName('');
    setGroupDescription('');
    setMinSelections('0');
    setMaxSelections('1');
    setIsRequired(false);
    setEditingGroup(null);
  };

  const resetAddonForm = () => {
    setAddonName('');
    setAddonPrice('');
    setEditingAddon(null);
    setAddonGroupId('');
  };

  const openEditGroupDialog = (group: AddonGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setMinSelections(group.min_selections.toString());
    setMaxSelections(group.max_selections.toString());
    setIsRequired(group.is_required);
    setShowGroupDialog(true);
  };

  const openAddAddonDialog = (groupId: string) => {
    resetAddonForm();
    setAddonGroupId(groupId);
    setShowAddonDialog(true);
  };

  const openEditAddonDialog = (addon: Addon) => {
    setEditingAddon(addon);
    setAddonGroupId(addon.group_id);
    setAddonName(addon.name);
    setAddonPrice(addon.price.toString());
    setShowAddonDialog(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Preencha o nome do grupo.',
      });
      return;
    }

    setSavingGroup(true);

    try {
      const groupData = {
        restaurant_id: restaurant?.id,
        name: groupName,
        description: groupDescription || null,
        min_selections: parseInt(minSelections) || 0,
        max_selections: parseInt(maxSelections) || 1,
        is_required: isRequired,
      };

      if (editingGroup) {
        const { error } = await supabase
          .from('addon_groups')
          .update(groupData)
          .eq('id', editingGroup.id);

        if (error) throw error;
        toast({ title: 'Grupo atualizado!' });
      } else {
        const { error } = await supabase.from('addon_groups').insert(groupData);
        if (error) throw error;
        toast({ title: 'Grupo criado!' });
      }

      setShowGroupDialog(false);
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleSaveAddon = async () => {
    if (!addonName || !addonGroupId) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Preencha o nome do adicional.',
      });
      return;
    }

    setSavingAddon(true);

    try {
      const addonData = {
        restaurant_id: restaurant?.id,
        group_id: addonGroupId,
        name: addonName,
        price: parseFloat(addonPrice) || 0,
      };

      if (editingAddon) {
        const { error } = await supabase
          .from('addons')
          .update(addonData)
          .eq('id', editingAddon.id);

        if (error) throw error;
        toast({ title: 'Adicional atualizado!' });
      } else {
        const { error } = await supabase.from('addons').insert(addonData);
        if (error) throw error;
        toast({ title: 'Adicional criado!' });
      }

      setShowAddonDialog(false);
      resetAddonForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setSavingAddon(false);
    }
  };

  const toggleGroupActive = async (group: AddonGroup) => {
    try {
      const { error } = await supabase
        .from('addon_groups')
        .update({ is_active: !group.is_active })
        .eq('id', group.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    }
  };

  const toggleAddonAvailable = async (addon: Addon) => {
    try {
      const { error } = await supabase
        .from('addons')
        .update({ is_available: !addon.is_available })
        .eq('id', addon.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    }
  };

  const deleteGroup = async (group: AddonGroup) => {
    if (!confirm(`Excluir o grupo "${group.name}" e todos os seus adicionais?`)) return;

    try {
      const { error } = await supabase
        .from('addon_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;
      toast({ title: 'Grupo excluído!' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  };

  const deleteAddon = async (addon: Addon) => {
    if (!confirm(`Excluir o adicional "${addon.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('addons')
        .delete()
        .eq('id', addon.id);

      if (error) throw error;
      toast({ title: 'Adicional excluído!' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
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

  return (
    <DashboardLayout>
      <div className="p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Adicionais</h1>
            <p className="text-muted-foreground">
              Gerencie grupos de adicionais e extras do cardápio
            </p>
          </div>
          <Dialog
            open={showGroupDialog}
            onOpenChange={(open) => {
              setShowGroupDialog(open);
              if (!open) resetGroupForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo de Adicionais'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do Grupo *</Label>
                  <Input
                    placeholder="Ex: Molhos, Extras, Acompanhamentos"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Descrição opcional"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mínimo de seleções</Label>
                    <Input
                      type="number"
                      min="0"
                      value={minSelections}
                      onChange={(e) => setMinSelections(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máximo de seleções</Label>
                    <Input
                      type="number"
                      min="1"
                      value={maxSelections}
                      onChange={(e) => setMaxSelections(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="font-medium">Obrigatório</Label>
                    <p className="text-xs text-muted-foreground">
                      Cliente deve escolher pelo menos uma opção
                    </p>
                  </div>
                  <Switch
                    checked={isRequired}
                    onCheckedChange={setIsRequired}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSaveGroup}
                  disabled={savingGroup}
                >
                  {savingGroup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingGroup ? (
                    'Salvar Alterações'
                  ) : (
                    'Criar Grupo'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Addon Dialog */}
        <Dialog
          open={showAddonDialog}
          onOpenChange={(open) => {
            setShowAddonDialog(open);
            if (!open) resetAddonForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAddon ? 'Editar Adicional' : 'Novo Adicional'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Bacon, Queijo extra, Molho especial"
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe 0 para adicionais gratuitos
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleSaveAddon}
                disabled={savingAddon}
              >
                {savingAddon ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingAddon ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Adicional'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum grupo de adicionais</h3>
              <p className="text-muted-foreground mb-4">
                Crie grupos para organizar os adicionais do seu cardápio
              </p>
              <Button onClick={() => setShowGroupDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro grupo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const groupAddons = getGroupAddons(group.id);
              return (
                <Card key={group.id} className={!group.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {group.is_required && (
                            <Badge variant="secondary" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                          {!group.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        {group.description && (
                          <CardDescription>{group.description}</CardDescription>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Seleção: {group.min_selections} - {group.max_selections} itens
                        </p>
                        {/* Category Links */}
                        <div className="mt-2">
                          <CategoryAddonLinker 
                            groupId={group.id} 
                            restaurantId={restaurant?.id || ''} 
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={group.is_active}
                          onCheckedChange={() => toggleGroupActive(group)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditGroupDialog(group)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteGroup(group)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {groupAddons.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhum adicional neste grupo
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupAddons.map((addon) => (
                          <div
                            key={addon.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              !addon.is_available ? 'opacity-50 bg-muted/30' : 'bg-muted/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{addon.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {addon.price > 0 ? `+ ${formatCurrency(addon.price)}` : 'Grátis'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={addon.is_available}
                                onCheckedChange={() => toggleAddonAvailable(addon)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditAddonDialog(addon)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteAddon(addon)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => openAddAddonDialog(group.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar item
                    </Button>
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
