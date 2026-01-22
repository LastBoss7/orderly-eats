import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Pencil, Trash2, Tag, Copy, Loader2, Sparkles, Percent, DollarSign } from 'lucide-react';
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

interface CouponManagerProps {
  restaurantId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Generate a random promotional code
const generatePromoCode = (prefix: string = ''): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomPart = Array.from({ length: 6 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return prefix ? `${prefix}${randomPart}` : randomPart;
};

// Suggested promo code prefixes based on common use cases
const suggestedPrefixes = [
  { label: 'Desconto', value: 'DESC' },
  { label: 'Primeira compra', value: 'BEMVINDO' },
  { label: 'Black Friday', value: 'BLACK' },
  { label: 'Natal', value: 'NATAL' },
  { label: 'Verão', value: 'VERAO' },
  { label: 'Aniversário', value: 'ANIVER' },
  { label: 'Frete Grátis', value: 'FRETE' },
  { label: 'VIP', value: 'VIP' },
];

export function CouponManager({ restaurantId }: CouponManagerProps) {
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
    if (restaurantId) {
      fetchCoupons();
    }
  }, [restaurantId]);

  const fetchCoupons = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurantId)
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
        code: generatePromoCode(),
        discount_type: 'percentage',
        discount_value: '10',
        min_order_value: '',
        max_uses: '',
        is_active: true,
        valid_until: '',
      });
    }
    setModalOpen(true);
  };

  const handleGenerateCode = (prefix?: string) => {
    setFormData(prev => ({ ...prev, code: generatePromoCode(prefix) }));
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    if (!formData.code || !formData.discount_value) {
      toast.error('Preencha o código e o valor do desconto');
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        restaurant_id: restaurantId,
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Cupons de Desconto
              </CardTitle>
              <CardDescription>
                Crie cupons promocionais para seus clientes usarem no cardápio digital
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Cupom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum cupom cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie cupons para atrair mais clientes
              </p>
              <Button className="mt-4" size="sm" onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Cupom
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead className="hidden sm:table-cell">Mínimo</TableHead>
                    <TableHead className="hidden sm:table-cell">Uso</TableHead>
                    <TableHead className="hidden md:table-cell">Validade</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-bold text-xs bg-muted px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(coupon.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-3 h-3" />
                              {coupon.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(coupon.discount_value)}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {coupon.min_order_value
                          ? formatCurrency(coupon.min_order_value)
                          : '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs">
                          {coupon.current_uses}
                          {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs">
                          {coupon.valid_until
                            ? format(new Date(coupon.valid_until), 'dd/MM/yy', { locale: ptBR })
                            : 'Sem limite'}
                        </span>
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
                            className="h-8 w-8"
                            onClick={() => handleOpenModal(coupon)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {selectedCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code Generator */}
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="Ex: DESCONTO10"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleGenerateCode()}
                  title="Gerar código aleatório"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Quick generate buttons */}
              {!selectedCoupon && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {suggestedPrefixes.slice(0, 4).map((prefix) => (
                    <Button
                      key={prefix.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => handleGenerateCode(prefix.value)}
                    >
                      {prefix.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Type and Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
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
                    <SelectItem value="percentage">
                      <span className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Porcentagem
                      </span>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Valor Fixo
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Valor {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, discount_value: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Min Order and Max Uses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_order_value">Pedido Mínimo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    id="min_order_value"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.min_order_value}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, min_order_value: e.target.value }))
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">Limite de Usos</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="0"
                  placeholder="Ilimitado"
                  value={formData.max_uses}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_uses: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Validity */}
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
              <p className="text-xs text-muted-foreground">
                Deixe em branco para não ter data de expiração
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="is_active">Cupom Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para impedir o uso do cupom
                </p>
              </div>
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
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
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
              Tem certeza que deseja excluir o cupom <strong>"{selectedCoupon?.code}"</strong>? 
              Esta ação não pode ser desfeita.
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
    </>
  );
}
