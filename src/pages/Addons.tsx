import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Pencil, Trash2, Package, GripVertical, Layers, CirclePlus, Hash, CheckCircle } from 'lucide-react';
import { CategoryAddonLinker } from '@/components/products/CategoryAddonLinker';
import { 
  PremiumDialog, 
  PremiumFormSection, 
  PremiumInputGroup,
  PremiumToggleRow 
} from '@/components/ui/premium-dialog';

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
      toast.error({
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
        toast.success({ title: 'Grupo atualizado!' });
      } else {
        const { error } = await supabase.from('addon_groups').insert(groupData);
        if (error) throw error;
        toast.success({ title: 'Grupo criado!' });
      }

      setShowGroupDialog(false);
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast.error({
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleSaveAddon = async () => {
    if (!addonName || !addonGroupId) {
      toast.error({
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
        toast.success({ title: 'Adicional atualizado!' });
      } else {
        const { error } = await supabase.from('addons').insert(addonData);
        if (error) throw error;
        toast.success({ title: 'Adicional criado!' });
      }

      setShowAddonDialog(false);
      resetAddonForm();
      fetchData();
    } catch (error: any) {
      toast.error({
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
      toast.error({
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
      toast.error({
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
      toast.success({ title: 'Grupo excluído!' });
      fetchData();
    } catch (error: any) {
      toast.error({
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
      toast.success({ title: 'Adicional excluído!' });
      fetchData();
    } catch (error: any) {
      toast.error({
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
          <Button onClick={() => setShowGroupDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Button>
        </div>

        {/* Premium Group Dialog */}
        <PremiumDialog
          open={showGroupDialog}
          onOpenChange={(open) => {
            setShowGroupDialog(open);
            if (!open) resetGroupForm();
          }}
          title={editingGroup ? 'Editar Grupo' : 'Novo Grupo de Adicionais'}
          description={editingGroup 
            ? 'Atualize as configurações do grupo de adicionais'
            : 'Crie um grupo para organizar adicionais semelhantes'
          }
          icon={<Layers className="w-6 h-6" />}
        >
          <div className="space-y-5 pt-4">
            <PremiumFormSection>
              <PremiumInputGroup 
                label="Nome do grupo" 
                required
                hint="Ex: Molhos, Extras, Acompanhamentos"
              >
                <Input
                  placeholder="Digite o nome..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-11"
                />
              </PremiumInputGroup>

              <PremiumInputGroup 
                label="Descrição" 
                hint="Opcional - ajuda o cliente a entender as opções"
              >
                <Input
                  placeholder="Descrição breve..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="h-11"
                />
              </PremiumInputGroup>
            </PremiumFormSection>

            <PremiumFormSection 
              variant="highlighted"
              title="Regras de seleção"
              description="Quantos itens o cliente pode escolher"
            >
              <div className="grid grid-cols-2 gap-4">
                <PremiumInputGroup label="Mínimo">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Hash className="w-4 h-4" />
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={minSelections}
                      onChange={(e) => setMinSelections(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </PremiumInputGroup>
                <PremiumInputGroup label="Máximo">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      <Hash className="w-4 h-4" />
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={maxSelections}
                      onChange={(e) => setMaxSelections(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </PremiumInputGroup>
              </div>
            </PremiumFormSection>

            <PremiumToggleRow
              label="Obrigatório"
              description="Cliente deve escolher pelo menos uma opção"
              icon={<CheckCircle className="w-5 h-5" />}
            >
              <Switch
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </PremiumToggleRow>

            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={handleSaveGroup}
              disabled={savingGroup}
            >
              {savingGroup ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingGroup ? (
                <>
                  <Pencil className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Grupo
                </>
              )}
            </Button>
          </div>
        </PremiumDialog>

        {/* Premium Addon Dialog */}
        <PremiumDialog
          open={showAddonDialog}
          onOpenChange={(open) => {
            setShowAddonDialog(open);
            if (!open) resetAddonForm();
          }}
          title={editingAddon ? 'Editar Adicional' : 'Novo Adicional'}
          description={editingAddon 
            ? 'Atualize as informações do adicional'
            : 'Adicione uma nova opção ao grupo'
          }
          icon={<CirclePlus className="w-6 h-6" />}
        >
          <div className="space-y-5 pt-4">
            <PremiumFormSection>
              <PremiumInputGroup 
                label="Nome do adicional" 
                required
                hint="Ex: Bacon, Queijo extra, Molho especial"
              >
                <Input
                  placeholder="Digite o nome..."
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                  className="h-11"
                />
              </PremiumInputGroup>

              <PremiumInputGroup 
                label="Preço adicional" 
                hint="Deixe 0 para adicionais gratuitos"
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addonPrice}
                    onChange={(e) => setAddonPrice(e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>
              </PremiumInputGroup>
            </PremiumFormSection>

            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={handleSaveAddon}
              disabled={savingAddon}
            >
              {savingAddon ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingAddon ? (
                <>
                  <Pencil className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Adicional
                </>
              )}
            </Button>
          </div>
        </PremiumDialog>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-muted-foreground animate-pulse">Carregando adicionais...</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum grupo de adicionais</h3>
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
                <Card 
                  key={group.id} 
                  className={`transition-all duration-300 hover:shadow-lg ${!group.is_active ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{group.name}</CardTitle>
                              {group.is_required && (
                                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
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
                          </div>
                        </div>
                        {/* Category Links */}
                        <div className="mt-3 ml-12">
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
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() => openEditGroupDialog(group)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10"
                          onClick={() => deleteGroup(group)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {groupAddons.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                        Nenhum adicional neste grupo
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupAddons.map((addon) => (
                          <div
                            key={addon.id}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all hover:border-primary/30 hover:shadow-sm ${
                              !addon.is_available ? 'opacity-50 bg-muted/30' : 'bg-muted/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground cursor-grab" />
                              <div>
                                <p className="font-medium">{addon.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {addon.price > 0 ? (
                                    <span className="text-success font-medium">+ {formatCurrency(addon.price)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Grátis</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Switch
                                checked={addon.is_available}
                                onCheckedChange={() => toggleAddonAvailable(addon)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-primary/10 hover:text-primary"
                                onClick={() => openEditAddonDialog(addon)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-destructive/10"
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
                      className="w-full mt-4 h-11 border-dashed hover:border-primary hover:bg-primary/5"
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
