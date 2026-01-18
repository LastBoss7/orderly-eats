import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waiter-invite`;

// Schema for existing waiter invite
const existingWaiterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  pin: z.string().length(4, 'PIN deve ter 4 dígitos').regex(/^\d+$/, 'PIN deve conter apenas números'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

// Schema for generic invite (waiter self-registration)
const genericInviteSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  pin: z.string().length(4, 'PIN deve ter 4 dígitos').regex(/^\d+$/, 'PIN deve conter apenas números'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

interface InviteData {
  id: string;
  isGenericInvite: boolean;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  waiter: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export default function WaiterRegister() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token de convite não fornecido');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${FUNCTION_URL}?action=validate&token=${token}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError(data.error || 'Convite inválido ou expirado');
          return;
        }

        setInviteData(data.invite);
        // Pre-fill email if waiter exists
        if (data.invite.waiter?.email) {
          setForm(prev => ({ ...prev, email: data.invite.waiter.email }));
        }
        // Pre-fill name and phone if waiter exists
        if (data.invite.waiter?.name) {
          setForm(prev => ({ ...prev, name: data.invite.waiter.name }));
        }
        if (data.invite.waiter?.phone) {
          setForm(prev => ({ ...prev, phone: data.invite.waiter.phone }));
        }
      } catch (err) {
        setError('Erro ao validar convite');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const isGeneric = inviteData?.isGenericInvite;
    const schema = isGeneric ? genericInviteSchema : existingWaiterSchema;
    const result = schema.safeParse(form);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${FUNCTION_URL}?action=register`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email: form.email,
          password: form.password,
          pin: form.pin,
          ...(isGeneric && {
            name: form.name,
            phone: form.phone,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      setSuccess(true);
      toast.success('Conta criada com sucesso!');

      // Auto-login after 2 seconds
      setTimeout(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        const slug = data.restaurantSlug || inviteData?.restaurant.slug;
        if (!signInError && slug) {
          navigate(`/garcom/${slug}/app`);
        } else if (slug) {
          navigate(`/garcom/${slug}`);
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Entre em contato com o administrador do restaurante para obter um novo convite.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Conta Criada!</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso. Redirecionando...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isGeneric = inviteData?.isGenericInvite;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {inviteData?.restaurant.logo_url && (
            <img
              src={inviteData.restaurant.logo_url}
              alt={inviteData.restaurant.name}
              className="h-16 w-16 mx-auto mb-4 rounded-lg object-cover"
            />
          )}
          <CardTitle>Criar Conta de Garçom</CardTitle>
          <CardDescription>
            {isGeneric ? (
              <>
                Cadastre-se para trabalhar em{' '}
                <span className="font-semibold text-foreground">
                  {inviteData?.restaurant.name}
                </span>
              </>
            ) : (
              <>
                Você foi convidado para trabalhar em{' '}
                <span className="font-semibold text-foreground">
                  {inviteData?.restaurant.name}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Show waiter info only for existing waiter invites */}
          {!isGeneric && inviteData?.waiter && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-6">
              <User className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-full" />
              <div>
                <p className="font-medium">{inviteData.waiter.name}</p>
                <p className="text-sm text-muted-foreground">
                  {inviteData.waiter.phone || 'Sem telefone cadastrado'}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name and phone fields for generic invites */}
            {isGeneric && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Seu nome completo"
                    disabled={submitting}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-destructive">{formErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    disabled={submitting}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                disabled={submitting}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                disabled={submitting}
              />
              {formErrors.password && (
                <p className="text-sm text-destructive">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repita a senha"
                disabled={submitting}
              />
              {formErrors.confirmPassword && (
                <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN de Acesso Rápido (4 dígitos) *</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••"
                disabled={submitting}
                className="text-center text-2xl tracking-widest"
              />
              {formErrors.pin && (
                <p className="text-sm text-destructive">{formErrors.pin}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Você usará este PIN para acesso rápido ao app
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
