import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Phone, 
  MapPin,
  RefreshCw,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  name: string;
  phone: string;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export default function Customers() {
  const { restaurant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    if (restaurant?.id) {
      fetchCustomers();
    }
  }, [restaurant?.id]);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    if (!restaurant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.neighborhood?.toLowerCase().includes(term) ||
        c.city?.toLowerCase().includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const fetchAddressFromCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          address: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      cep: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    });
    setEditingCustomer(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      cep: customer.cep || '',
      address: customer.address || '',
      number: customer.number || '',
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '',
      city: customer.city || '',
      state: customer.state || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const customerData = {
        restaurant_id: restaurant.id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        cep: formData.cep.trim() || null,
        address: formData.address.trim() || null,
        number: formData.number.trim() || null,
        complement: formData.complement.trim() || null,
        neighborhood: formData.neighborhood.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);
        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('customers').insert(customerData);
        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast.error('Erro ao salvar cliente', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);

      if (error) throw error;
      toast.success('Cliente removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (error: any) {
      toast.error('Erro ao remover cliente', { description: error.message });
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatAddress = (customer: Customer) => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.number) parts.push(customer.number);
    if (customer.complement) parts.push(customer.complement);
    if (customer.neighborhood) parts.push(customer.neighborhood);
    if (customer.city && customer.state) parts.push(`${customer.city}/${customer.state}`);
    return parts.join(', ') || '-';
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie os clientes cadastrados no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchCustomers} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Telefone</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers.filter((c) => c.phone).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Endereço</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers.filter((c) => c.address).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, bairro ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="hidden md:table-cell">Endereço</TableHead>
                  <TableHead className="hidden lg:table-cell">Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? 'Nenhum cliente encontrado com essa busca'
                        : 'Nenhum cliente cadastrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{formatPhone(customer.phone)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {formatAddress(customer)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {format(new Date(customer.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setCustomerToDelete(customer);
                              setIsDeleteDialogOpen(true);
                            }}
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

        {/* Results count */}
        {searchTerm && (
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} resultado(s) encontrado(s)
          </p>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? 'Atualize as informações do cliente'
                : 'Preencha os dados para cadastrar um novo cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, cep: value });
                    if (value.replace(/\D/g, '').length === 8) {
                      fetchAddressFromCep(value);
                    }
                  }}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="number">Nº</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                placeholder="Apto, Bloco, Referência..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 sm:col-span-1">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Bairro"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="state">UF</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingCustomer ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cliente{' '}
              <strong>{customerToDelete?.name}</strong>? Esta ação não pode ser desfeita.
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
