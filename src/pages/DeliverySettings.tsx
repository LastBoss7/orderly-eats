import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Bike,
  Car,
  DollarSign,
  Clock,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeliveryFee {
  id: string;
  neighborhood: string;
  city: string | null;
  fee: number;
  min_order_value: number | null;
  estimated_time: string | null;
  is_active: boolean | null;
}

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  license_plate: string | null;
  status: string | null;
  created_at: string;
}

export default function DeliverySettings() {
  const { restaurant } = useAuth();
  const [activeTab, setActiveTab] = useState('fees');
  const [isLoading, setIsLoading] = useState(true);
  
  // Delivery Fees State
  const [fees, setFees] = useState<DeliveryFee[]>([]);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<DeliveryFee | null>(null);
  const [feeForm, setFeeForm] = useState({
    neighborhood: '',
    city: '',
    fee: '',
    min_order_value: '',
    estimated_time: '',
    is_active: true,
  });

  // Drivers State
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    vehicle_type: 'moto',
    license_plate: '',
    status: 'active',
  });

  // Delete state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'fee' | 'driver'; item: any }>({
    open: false,
    type: 'fee',
    item: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;
    setIsLoading(true);
    try {
      const [feesResult, driversResult] = await Promise.all([
        supabase
          .from('delivery_fees')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('neighborhood', { ascending: true }),
        supabase
          .from('delivery_drivers')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('name', { ascending: true }),
      ]);

      if (feesResult.error) throw feesResult.error;
      if (driversResult.error) throw driversResult.error;

      setFees(feesResult.data || []);
      setDrivers(driversResult.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Fee Functions
  const resetFeeForm = () => {
    setFeeForm({
      neighborhood: '',
      city: '',
      fee: '',
      min_order_value: '',
      estimated_time: '',
      is_active: true,
    });
    setEditingFee(null);
  };

  const openEditFee = (fee: DeliveryFee) => {
    setEditingFee(fee);
    setFeeForm({
      neighborhood: fee.neighborhood,
      city: fee.city || '',
      fee: fee.fee.toString(),
      min_order_value: fee.min_order_value?.toString() || '',
      estimated_time: fee.estimated_time || '',
      is_active: fee.is_active ?? true,
    });
    setIsFeeDialogOpen(true);
  };

  const handleSaveFee = async () => {
    if (!restaurant?.id) return;
    if (!feeForm.neighborhood.trim()) {
      toast.error('Bairro é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const feeData = {
        restaurant_id: restaurant.id,
        neighborhood: feeForm.neighborhood.trim(),
        city: feeForm.city.trim() || null,
        fee: parseFloat(feeForm.fee) || 0,
        min_order_value: feeForm.min_order_value ? parseFloat(feeForm.min_order_value) : null,
        estimated_time: feeForm.estimated_time.trim() || null,
        is_active: feeForm.is_active,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('delivery_fees')
          .update(feeData)
          .eq('id', editingFee.id);
        if (error) throw error;
        toast.success('Taxa atualizada!');
      } else {
        const { error } = await supabase.from('delivery_fees').insert(feeData);
        if (error) throw error;
        toast.success('Taxa cadastrada!');
      }

      setIsFeeDialogOpen(false);
      resetFeeForm();
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar taxa', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeeStatus = async (fee: DeliveryFee) => {
    try {
      const { error } = await supabase
        .from('delivery_fees')
        .update({ is_active: !fee.is_active })
        .eq('id', fee.id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao alterar status', { description: error.message });
    }
  };

  // Driver Functions
  const resetDriverForm = () => {
    setDriverForm({
      name: '',
      phone: '',
      vehicle_type: 'moto',
      license_plate: '',
      status: 'active',
    });
    setEditingDriver(null);
  };

  const openEditDriver = (driver: DeliveryDriver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      phone: driver.phone || '',
      vehicle_type: driver.vehicle_type || 'moto',
      license_plate: driver.license_plate || '',
      status: driver.status || 'active',
    });
    setIsDriverDialogOpen(true);
  };

  const handleSaveDriver = async () => {
    if (!restaurant?.id) return;
    if (!driverForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const driverData = {
        restaurant_id: restaurant.id,
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim() || null,
        vehicle_type: driverForm.vehicle_type,
        license_plate: driverForm.license_plate.trim() || null,
        status: driverForm.status,
      };

      if (editingDriver) {
        const { error } = await supabase
          .from('delivery_drivers')
          .update(driverData)
          .eq('id', editingDriver.id);
        if (error) throw error;
        toast.success('Motoboy atualizado!');
      } else {
        const { error } = await supabase.from('delivery_drivers').insert(driverData);
        if (error) throw error;
        toast.success('Motoboy cadastrado!');
      }

      setIsDriverDialogOpen(false);
      resetDriverForm();
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao salvar motoboy', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Functions
  const handleDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      const table = deleteDialog.type === 'fee' ? 'delivery_fees' : 'delivery_drivers';
      const { error } = await supabase.from(table).delete().eq('id', deleteDialog.item.id);
      if (error) throw error;
      toast.success(deleteDialog.type === 'fee' ? 'Taxa removida!' : 'Motoboy removido!');
      setDeleteDialog({ open: false, type: 'fee', item: null });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao remover', { description: error.message });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getVehicleIcon = (type: string | null) => {
    return type === 'car' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'active') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações de Entrega</h1>
            <p className="text-muted-foreground">
              Gerencie taxas de entrega por bairro e motoboys
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bairros Cadastrados</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bairros Ativos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fees.filter(f => f.is_active).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Motoboys</CardTitle>
              <Bike className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drivers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Motoboys Ativos</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drivers.filter(d => d.status === 'active').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="fees" className="gap-2">
              <MapPin className="w-4 h-4" />
              Taxas por Bairro
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2">
              <Bike className="w-4 h-4" />
              Motoboys
            </TabsTrigger>
          </TabsList>

          {/* Fees Tab */}
          <TabsContent value="fees" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetFeeForm(); setIsFeeDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Taxa
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead className="hidden md:table-cell">Pedido Mínimo</TableHead>
                      <TableHead className="hidden md:table-cell">Tempo Est.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : fees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma taxa cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      fees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">{fee.neighborhood}</TableCell>
                          <TableCell>{fee.city || '-'}</TableCell>
                          <TableCell className="font-semibold text-primary">
                            {formatCurrency(fee.fee)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {fee.min_order_value ? formatCurrency(fee.min_order_value) : '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {fee.estimated_time || '-'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={fee.is_active ?? true}
                              onCheckedChange={() => toggleFeeStatus(fee)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditFee(fee)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, type: 'fee', item: fee })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetDriverForm(); setIsDriverDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Motoboy
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="hidden md:table-cell">Placa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum motoboy cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      drivers.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>{driver.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getVehicleIcon(driver.vehicle_type)}
                              <span className="capitalize">{driver.vehicle_type === 'car' ? 'Carro' : 'Moto'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {driver.license_plate || '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(driver.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDriver(driver)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, type: 'driver', item: driver })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fee Dialog */}
      <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Editar Taxa' : 'Nova Taxa de Entrega'}</DialogTitle>
            <DialogDescription>
              Configure a taxa de entrega para um bairro específico
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={feeForm.neighborhood}
                  onChange={(e) => setFeeForm({ ...feeForm, neighborhood: e.target.value })}
                  placeholder="Nome do bairro"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={feeForm.city}
                  onChange={(e) => setFeeForm({ ...feeForm, city: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fee">Taxa (R$) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  value={feeForm.fee}
                  onChange={(e) => setFeeForm({ ...feeForm, fee: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="min_order">Pedido Mín.</Label>
                <Input
                  id="min_order"
                  type="number"
                  step="0.01"
                  value={feeForm.min_order_value}
                  onChange={(e) => setFeeForm({ ...feeForm, min_order_value: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="time">Tempo Est.</Label>
                <Input
                  id="time"
                  value={feeForm.estimated_time}
                  onChange={(e) => setFeeForm({ ...feeForm, estimated_time: e.target.value })}
                  placeholder="30-45 min"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={feeForm.is_active}
                onCheckedChange={(checked) => setFeeForm({ ...feeForm, is_active: checked })}
              />
              <Label htmlFor="is_active">Taxa ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFee} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingFee ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver Dialog */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Motoboy' : 'Novo Motoboy'}</DialogTitle>
            <DialogDescription>
              Cadastre os dados do entregador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="driver_name">Nome *</Label>
              <Input
                id="driver_name"
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driver_phone">Telefone</Label>
                <Input
                  id="driver_phone"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="license_plate">Placa</Label>
                <Input
                  id="license_plate"
                  value={driverForm.license_plate}
                  onChange={(e) => setDriverForm({ ...driverForm, license_plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_type">Tipo de Veículo</Label>
                <Select
                  value={driverForm.vehicle_type}
                  onValueChange={(value) => setDriverForm({ ...driverForm, vehicle_type: value })}
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4" /> Moto
                      </div>
                    </SelectItem>
                    <SelectItem value="car">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" /> Carro
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="driver_status">Status</Label>
                <Select
                  value={driverForm.status}
                  onValueChange={(value) => setDriverForm({ ...driverForm, status: value })}
                >
                  <SelectTrigger id="driver_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDriverDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDriver} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingDriver ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>
                {deleteDialog.type === 'fee' 
                  ? deleteDialog.item?.neighborhood 
                  : deleteDialog.item?.name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
