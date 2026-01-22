import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, Copy, ExternalLink, QrCode, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function Coupons() {
  const { restaurant } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_value: '',
    max_uses: '',
    is_active: true,
    valid_until: '',
  });

  useEffect(() => {
    if (restaurant?.id) {
      fetchCoupons();
    }
  }, [restaurant?.id]);

  const fetchCoupons = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setSelectedCoupon(coupon);
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value.toString(),
        min_order_value: coupon.min_order_value?.toString() || '',
        max_uses: coupon.max_uses?.toString() || '',
        is_active: coupon.is_active,
        valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      });
    } else {
      setSelectedCoupon(null);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_order_value: '',
        max_uses: '',
        is_active: true,
        valid_until: '',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;
    if (!formData.code || !formData.discount_value) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        restaurant_id: restaurant.id,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        is_active: formData.is_active,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      };

      if (selectedCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', selectedCoupon.id);

        if (error) throw error;
        toast.success('Cupom atualizado!');
      } else {
        const { error } = await supabase.from('coupons').insert(couponData);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe um cupom com este código');
            return;
          }
          throw error;
        }
        toast.success('Cupom criado!');
      }

      setModalOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error('Error saving coupon:', err);
      toast.error('Erro ao salvar cupom');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCoupon) return;

    try {
      const { error } = await supabase.from('coupons').delete().eq('id', selectedCoupon.id);

      if (error) throw error;
      toast.success('Cupom excluído!');
      setDeleteDialogOpen(false);
      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      toast.error('Erro ao excluir cupom');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;
      toast.success(coupon.is_active ? 'Cupom desativado' : 'Cupom ativado');
      fetchCoupons();
    } catch (err) {
      console.error('Error toggling coupon:', err);
      toast.error('Erro ao atualizar cupom');
    }
  };

  const copyMenuLink = () => {
    if (!restaurant?.slug) return;
    const link = `${window.location.origin}/menu/${restaurant.slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const openMenuLink = () => {
    if (!restaurant?.slug) return;
    window.open(`/menu/${restaurant.slug}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tag className="w-6 h-6" />
              Cupons de Desconto
            </h1>
            <p className="text-muted-foreground">
              Gerencie os cupons do seu cardápio digital
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cupom
          </Button>
        </div>

        {/* Menu Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Link do Cardápio Digital
            </CardTitle>
            <CardDescription>
              Compartilhe este link com seus clientes para acessar o cardápio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                {window.location.origin}/menu/{restaurant?.slug || 'seu-restaurante'}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyMenuLink} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={openMenuLink} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Abrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupons Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meus Cupons</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Nenhum cupom cadastrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie cupons de desconto para seus clientes
                </p>
                <Button className="mt-4" onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Cupom
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Pedido Mínimo</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-bold font-mono">{coupon.code}</TableCell>
                      <TableCell>
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : formatCurrency(coupon.discount_value)}
                      </TableCell>
                      <TableCell>
                        {coupon.min_order_value
                          ? formatCurrency(coupon.min_order_value)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {coupon.current_uses}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                      </TableCell>
                      <TableCell>
                        {coupon.valid_until
                          ? format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Sem limite'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={() => handleToggleActive(coupon)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(coupon)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom *</Label>
              <Input
                id="code"
                placeholder="Ex: DESCONTO10"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_type: v as 'percentage' | 'fixed',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Valor *{' '}
                  {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, discount_value: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                <Input
                  id="min_order_value"
                  type="number"
                  placeholder="0.00"
                  value={formData.min_order_value}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, min_order_value: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">Limite de Usos</Label>
                <Input
                  id="max_uses"
                  type="number"
                  placeholder="Ilimitado"
                  value={formData.max_uses}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_uses: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Válido até</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, valid_until: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Cupom Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCoupon ? 'Salvar' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cupom "{selectedCoupon?.code}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
