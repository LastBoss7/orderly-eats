import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, CheckCircle2, AlertCircle, MapPin, Phone, Eye, EyeOff, Smartphone, Monitor, ClipboardList, Ban } from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-full.png';
import loginMockupBg from '@/assets/login-mockup-bg.png';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
}

type AuthMode = 'login' | 'signup';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCnpj, setIsValidatingCnpj] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
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
  
  // Suspended account state
  const [showSuspendedDialog, setShowSuspendedDialog] = useState(false);
  const [suspendedReasonMessage, setSuspendedReasonMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signIn(loginEmail, loginPassword);

    if (result.suspended) {
      // Show suspended dialog
      setSuspendedReasonMessage(result.suspendedReason || 'Acesso revogado pelo administrador');
      setShowSuspendedDialog(true);
      setIsLoading(false);
      return;
    }

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: result.error.message,
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
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
            <img src={logoGamako} alt="Gamako" className="h-16 object-contain" />
          </div>

          {mode === 'login' ? (
            <>
              {/* Welcome Text */}
              <h1 className="text-2xl font-bold text-foreground mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Que bom ter você aqui com a gente!
              </h1>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Seu e-mail"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12 border-border/60"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">
                    Senha <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-12 pr-12 border-border/60"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <button type="button" className="text-sm text-primary hover:underline">
                      Esqueci a senha
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-medium text-base"
                  disabled={isLoading}
                >
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

              {/* Separator */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-muted-foreground">Não é cliente ainda?</span>
                </div>
              </div>

              {/* Create Account Button */}
              <Button 
                type="button"
                variant="outline"
                className="w-full h-12 border-primary text-primary hover:bg-primary/5 font-medium text-base"
                onClick={() => setMode('signup')}
              >
                Criar conta
              </Button>
            </>
          ) : (
            <>
              {/* Signup Header */}
              <h1 className="text-2xl font-bold text-foreground mb-2 animate-fade-in-up">
                Crie sua conta
              </h1>
              <p className="text-muted-foreground mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Preencha os dados do seu estabelecimento
              </p>

              {/* Signup Form */}
              <form onSubmit={handleSignup} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {/* CNPJ */}
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-sm font-medium">
                    CNPJ <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      onBlur={handleCnpjBlur}
                      className={`h-12 pr-12 ${cnpjError ? 'border-destructive' : cnpjValidated ? 'border-success' : 'border-border/60'}`}
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isValidatingCnpj && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                      {cnpjValidated && !cnpjError && <CheckCircle2 className="h-5 w-5 text-success" />}
                      {cnpjError && <AlertCircle className="h-5 w-5 text-destructive" />}
                    </div>
                  </div>
                  {cnpjError && <p className="text-sm text-destructive">{cnpjError}</p>}
                  
                  {cnpjData && cnpjValidated && !cnpjError && (
                    <div className="text-sm bg-muted/50 rounded-lg p-3 space-y-2 border border-border/50">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{cnpjData.razao_social}</p>
                          {cnpjData.nome_fantasia && (
                            <p className="text-muted-foreground">{cnpjData.nome_fantasia}</p>
                          )}
                        </div>
                      </div>
                      
                      {(cnpjData.logradouro || cnpjData.municipio) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="text-muted-foreground">
                            {cnpjData.logradouro && (
                              <p>{cnpjData.logradouro}{cnpjData.numero && `, ${cnpjData.numero}`}{cnpjData.bairro && ` - ${cnpjData.bairro}`}</p>
                            )}
                            <p>{cnpjData.municipio}/{cnpjData.uf}{cnpjData.cep && ` - CEP: ${cnpjData.cep}`}</p>
                          </div>
                        </div>
                      )}
                      
                      {cnpjData.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-muted-foreground">{cnpjData.telefone}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Restaurant Name */}
                <div className="space-y-2">
                  <Label htmlFor="restaurant-name" className="text-sm font-medium">
                    Nome do Restaurante <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="restaurant-name"
                    placeholder="Meu Restaurante"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="h-12 border-border/60"
                    required
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="text-sm font-medium">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full-name"
                    placeholder="João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 border-border/60"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="h-12 border-border/60"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">
                    Senha <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="h-12 pr-12 border-border/60"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-medium text-base"
                  disabled={isLoading || isValidatingCnpj || !!cnpjError}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center mt-6">
                <span className="text-muted-foreground">Já tem uma conta? </span>
                <button 
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => setMode('login')}
                >
                  Fazer login
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Side - Promo with Mockup Background */}
      <div 
        className="hidden lg:flex w-[55%] flex-col items-center justify-center p-12 relative"
        style={{
          backgroundImage: `url(${loginMockupBg})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#f0f9ff'
        }}
      >
        {/* Overlay for better contrast if needed */}
        <div className="absolute inset-0 bg-sky-50/30" />
      </div>

      {/* Suspended Account Dialog */}
      <AlertDialog open={showSuspendedDialog} onOpenChange={setShowSuspendedDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Ban className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Acesso Revogado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <p>
                O acesso ao sistema foi revogado para este estabelecimento.
              </p>
              {suspendedReasonMessage && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-destructive">Motivo:</p>
                  <p className="text-sm text-foreground mt-1">{suspendedReasonMessage}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                Entre em contato com o suporte para mais informações.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowSuspendedDialog(false)}
              className="w-full sm:w-auto"
            >
              Entendi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
