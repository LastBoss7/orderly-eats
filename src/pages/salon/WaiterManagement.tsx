import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronRight,
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  UserPlus,
  Users,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Link,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Waiter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  pin: string | null;
}

export default function WaiterManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWaiter, setNewWaiter] = useState({ name: '', email: '', phone: '', pin: '' });
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editPin, setEditPin] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchWaiters();
  }, [restaurant?.id]);

  const fetchWaiters = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .order('name');

      if (error) throw error;
      setWaiters(data || []);
    } catch (error) {
      console.error('Error fetching waiters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWaiters = waiters.filter(waiter =>
    waiter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (waiter.email && waiter.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddWaiter = async () => {
    if (!newWaiter.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do garçom é obrigatório.',
      });
      return;
    }

    if (!restaurant?.id) return;

    setSaving(true);

    try {
      // Check if PIN is unique
      if (newWaiter.pin) {
        const { data: existingPin } = await supabase
          .from('waiters')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('pin', newWaiter.pin)
          .single();

        if (existingPin) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Este PIN já está em uso por outro garçom.',
          });
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('waiters')
        .insert({
          restaurant_id: restaurant.id,
          name: newWaiter.name.trim(),
          email: newWaiter.email.trim() || null,
          phone: newWaiter.phone.trim() || null,
          pin: newWaiter.pin.trim() || null,
          status: 'active',
        });

      if (error) throw error;

      setNewWaiter({ name: '', email: '', phone: '', pin: '' });
      setIsDialogOpen(false);
      fetchWaiters();

      toast({
        title: 'Garçom adicionado',
        description: `${newWaiter.name} foi adicionado à equipe.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleWaiterStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      const { error } = await supabase
        .from('waiters')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchWaiters();

      toast({
        title: 'Status atualizado',
        description: `Garçom ${newStatus === 'active' ? 'ativado' : 'desativado'}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  const handleEditPin = async () => {
    if (!editingWaiter) return;

    try {
      // Check if PIN is unique
      if (editPin) {
        const { data: existingPin } = await supabase
          .from('waiters')
          .select('id')
          .eq('restaurant_id', restaurant?.id)
          .eq('pin', editPin)
          .neq('id', editingWaiter.id)
          .single();

        if (existingPin) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Este PIN já está em uso por outro garçom.',
          });
          return;
        }
      }

      const { error } = await supabase
        .from('waiters')
        .update({ pin: editPin || null })
        .eq('id', editingWaiter.id);

      if (error) throw error;
      
      fetchWaiters();
      setIsEditDialogOpen(false);
      setEditingWaiter(null);
      setEditPin('');

      toast({
        title: 'PIN atualizado',
        description: 'O PIN do garçom foi atualizado com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    return pin;
  };

  const copyWaiterLink = async () => {
    const link = `${window.location.origin}/garcom/${restaurant?.slug}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({
      title: 'Link copiado!',
      description: 'O link de acesso foi copiado para a área de transferência.',
    });
  };

  const removeWaiter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waiters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchWaiters();

      toast({
        title: 'Garçom removido',
        description: 'O garçom foi removido da equipe.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span 
            className="cursor-pointer hover:text-foreground"
            onClick={() => navigate('/salon-settings')}
          >
            Gestão do Salão
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Gestão de Garçons</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/salon-settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Gestão de Garçons</h1>
            <p className="text-muted-foreground">
              Gerencie sua equipe de garçons e atribuições
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Adicionar Garçom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Garçom</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo membro da equipe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    value={newWaiter.name}
                    onChange={(e) => setNewWaiter(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newWaiter.email}
                    onChange={(e) => setNewWaiter(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={newWaiter.phone}
                    onChange={(e) => setNewWaiter(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin" className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    PIN de Acesso
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="pin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="4 a 6 dígitos"
                      value={newWaiter.pin}
                      onChange={(e) => setNewWaiter(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewWaiter(prev => ({ ...prev, pin: generateRandomPin() }))}
                    >
                      Gerar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O garçom usará este PIN para acessar o aplicativo
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddWaiter} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Waiter Link */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Link className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Link de Acesso dos Garçons</p>
              <p className="text-sm text-muted-foreground">
                {window.location.origin}/garcom/{restaurant?.slug}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copyWaiterLink} className="gap-2">
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Copiado!' : 'Copiar'}
            </Button>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar garçons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Waiters List */}
        {filteredWaiters.length > 0 ? (
          <div className="space-y-3">
            {filteredWaiters.map((waiter) => (
              <Card key={waiter.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(waiter.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{waiter.name}</h3>
                      <Badge variant={waiter.status === 'active' ? 'default' : 'secondary'}>
                        {waiter.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {waiter.email || 'Sem e-mail'} • {waiter.phone || 'Sem telefone'}
                    </p>
                    {waiter.pin && (
                      <p className="text-xs text-primary flex items-center gap-1 mt-1">
                        <KeyRound className="w-3 h-3" />
                        PIN configurado
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingWaiter(waiter);
                        setEditPin(waiter.pin || '');
                        setIsEditDialogOpen(true);
                      }}>
                        <KeyRound className="w-4 h-4 mr-2" />
                        {waiter.pin ? 'Editar PIN' : 'Criar PIN'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleWaiterStatus(waiter.id, waiter.status)}>
                        {waiter.status === 'active' ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => removeWaiter(waiter.id)}
                      >
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhum garçom cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione garçons para gerenciar sua equipe de atendimento.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar primeiro garçom
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit PIN Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar PIN</DialogTitle>
              <DialogDescription>
                {editingWaiter?.name} - Digite um PIN de 4 a 6 dígitos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pin" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  PIN de Acesso
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-pin"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="4 a 6 dígitos"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditPin(generateRandomPin())}
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O garçom usará este PIN para acessar o aplicativo
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingWaiter(null);
                setEditPin('');
              }}>
                Cancelar
              </Button>
              <Button onClick={handleEditPin} disabled={editPin.length < 4}>
                Salvar PIN
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
