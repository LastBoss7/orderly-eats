import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ChefHat, Loader2, Building2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// CNPJ validation function (local check digits validation)
const validateCNPJDigits = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Format CNPJ as user types
const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

interface CNPJData {
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  logradouro: string;
  municipio: string;
  uf: string;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCnpj, setIsValidatingCnpj] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message,
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const validateCNPJOnServer = async (cnpjValue: string) => {
    const digits = cnpjValue.replace(/\D/g, '');
    
    if (digits.length !== 14) return;
    if (!validateCNPJDigits(digits)) {
      setCnpjError('CNPJ inválido (dígitos verificadores incorretos)');
      return;
    }

    setIsValidatingCnpj(true);
    setCnpjError('');
    setCnpjValidated(false);
    setCnpjData(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-cnpj', {
        body: { cnpj: digits },
      });

      if (error) throw error;

      if (data.valid) {
        setCnpjValidated(true);
        setCnpjData(data.data);
        
        // Auto-fill restaurant name with nome_fantasia or razao_social
        const companyName = data.data.nome_fantasia || data.data.razao_social;
        if (companyName && !restaurantName) {
          setRestaurantName(companyName);
        }

        if (!data.active) {
          setCnpjError(`CNPJ com situação: ${data.data.situacao_cadastral}. Verifique se está ativo.`);
        } else {
          toast({
            title: 'CNPJ validado!',
            description: `Empresa: ${data.data.razao_social}`,
          });
        }
      } else {
        setCnpjError(data.error || 'CNPJ não encontrado');
      }
    } catch (error: any) {
      console.error('CNPJ validation error:', error);
      setCnpjError('Erro ao consultar CNPJ. Tente novamente.');
    } finally {
      setIsValidatingCnpj(false);
    }
  };

  const handleCnpjChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setCnpj(formatted);
    setCnpjValidated(false);
    setCnpjData(null);
    
    // Clear error when typing
    if (cnpjError) setCnpjError('');
  };

  const handleCnpjBlur = () => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length === 14) {
      validateCNPJOnServer(cnpj);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CNPJ before submitting
    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (!validateCNPJDigits(cnpjDigits)) {
      setCnpjError('CNPJ inválido. Por favor, verifique o número.');
      return;
    }
    
    setIsLoading(true);

    const { error } = await signUp(signupEmail, signupPassword, restaurantName, fullName, cnpj);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: error.message,
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Seu restaurante foi configurado com sucesso.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/25">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">RestaurantePOS</h1>
          <p className="text-muted-foreground text-sm">Sistema de gestão para restaurantes</p>
        </div>

        <Card className="border-0 shadow-xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ do Estabelecimento</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => handleCnpjChange(e.target.value)}
                        onBlur={handleCnpjBlur}
                        className={`pl-10 pr-10 ${cnpjError ? 'border-destructive focus-visible:ring-destructive' : cnpjValidated ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isValidatingCnpj && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {cnpjValidated && !cnpjError && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {cnpjError && <AlertCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </div>
                    {cnpjError && (
                      <p className="text-sm text-destructive">{cnpjError}</p>
                    )}
                    {cnpjData && cnpjValidated && !cnpjError && (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1">
                        <p><span className="font-medium">Razão Social:</span> {cnpjData.razao_social}</p>
                        {cnpjData.nome_fantasia && (
                          <p><span className="font-medium">Nome Fantasia:</span> {cnpjData.nome_fantasia}</p>
                        )}
                        <p><span className="font-medium">Localização:</span> {cnpjData.municipio}/{cnpjData.uf}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-name">Nome do Restaurante</Label>
                    <Input
                      id="restaurant-name"
                      placeholder="Meu Restaurante"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Nome Completo do Admin</Label>
                    <Input
                      id="full-name"
                      placeholder="João da Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || isValidatingCnpj || !!cnpjError}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Restaurante'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
