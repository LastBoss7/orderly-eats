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
  Mail,
  Share2,
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
  pin_hash: string | null;
  user_id: string | null;
}

interface WaiterInvite {
  id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
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
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteWaiter, setInviteWaiter] = useState<Waiter | null>(null);

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
      // First create the waiter without PIN
      const { data: insertedWaiter, error: insertError } = await supabase
        .from('waiters')
        .insert({
          restaurant_id: restaurant.id,
          name: newWaiter.name.trim(),
          email: newWaiter.email.trim() || null,
          phone: newWaiter.phone.trim() || null,
          status: 'active',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // If PIN is provided, set it using the edge function (hashed)
      if (newWaiter.pin && insertedWaiter) {
        const { data, error: pinError } = await supabase.functions.invoke('waiter-auth', {
          body: {
            action: 'set_pin',
            waiter_id: insertedWaiter.id,
            new_pin: newWaiter.pin.trim(),
          },
        });

        if (pinError || data?.error) {
          // Rollback: delete the waiter if PIN setting failed
          await supabase.from('waiters').delete().eq('id', insertedWaiter.id);
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: data?.error || 'Erro ao definir PIN.',
          });
          setSaving(false);
          return;
        }
      }

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
      if (editPin) {
        // Use Edge Function to set hashed PIN
        const { data, error: pinError } = await supabase.functions.invoke('waiter-auth', {
          body: {
            action: 'set_pin',
            waiter_id: editingWaiter.id,
            new_pin: editPin,
          },
        });

        if (pinError || data?.error) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: data?.error || 'Erro ao definir PIN.',
          });
          return;
        }
      } else {
        // Clear PIN (remove hash and salt)
        const { error } = await supabase
          .from('waiters')
          .update({ pin: null, pin_hash: null, pin_salt: null })
          .eq('id', editingWaiter.id);

        if (error) throw error;
      }
      
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

  const generateInviteLink = async (waiter: Waiter) => {
    if (!restaurant?.id) return;
    
    setGeneratingInvite(waiter.id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waiter-invite?action=generate`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            waiter_id: waiter.id,
            restaurant_id: restaurant.id,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar convite');
      }

      const link = `${window.location.origin}/garcom/registro?token=${data.invite.token}`;
      setInviteLink(link);
      setInviteWaiter(waiter);
      setShowInviteModal(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setGeneratingInvite(null);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link copiado!',
      description: 'O link de convite foi copiado para a área de transferência.',
    });
  };

  const shareInviteLink = async () => {
    if (!inviteLink || !inviteWaiter) return;
    
    const shareData = {
      title: `Convite - ${restaurant?.name}`,
      text: `Olá ${inviteWaiter.name}! Você foi convidado para criar sua conta de garçom em ${restaurant?.name}. Acesse o link para completar seu cadastro:`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      await copyInviteLink();
    }
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
                      {waiter.user_id && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Conta vinculada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {waiter.email || 'Sem e-mail'} • {waiter.phone || 'Sem telefone'}
                    </p>
                    {(waiter.pin || waiter.pin_hash) && (
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
                      {!waiter.user_id && (
                        <DropdownMenuItem 
                          onClick={() => generateInviteLink(waiter)}
                          disabled={generatingInvite === waiter.id}
                        >
                          {generatingInvite === waiter.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4 mr-2" />
                          )}
                          Gerar link de convite
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => {
                        setEditingWaiter(waiter);
                        setEditPin(waiter.pin || '');
                        setIsEditDialogOpen(true);
                      }}>
                        <KeyRound className="w-4 h-4 mr-2" />
                        {waiter.pin || waiter.pin_hash ? 'Editar PIN' : 'Criar PIN'}
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

        {/* Invite Link Dialog */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link de Convite Gerado</DialogTitle>
              <DialogDescription>
                Envie este link para {inviteWaiter?.name} criar sua conta de garçom.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg break-all text-sm">
                {inviteLink}
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias. O garçom poderá criar sua conta e definir um PIN de acesso rápido.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={copyInviteLink} className="gap-2">
                <Copy className="w-4 h-4" />
                Copiar Link
              </Button>
              <Button onClick={shareInviteLink} className="gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
