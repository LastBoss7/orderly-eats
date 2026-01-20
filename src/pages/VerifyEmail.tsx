import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-full.png';
import { toast } from 'sonner';

type VerificationStatus = 'input' | 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && code.every(d => d !== '')) {
      handleVerify(fullCode);
    }
  }, [code]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Move to next input if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      // Focus last filled input or the next empty one
      const lastIndex = Math.min(pastedData.length, 5);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleVerify = async (codeString?: string) => {
    const fullCode = codeString || code.join('');
    if (fullCode.length !== 6) {
      toast.error('Digite o código completo de 6 dígitos');
      return;
    }

    if (!userId) {
      setErrorMessage('Sessão inválida. Faça login novamente.');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { userId, code: fullCode },
      });

      if (error) {
        console.error('Verification error:', error);
        setErrorMessage(error.message || 'Erro ao verificar código');
        setStatus('error');
        return;
      }

      if (data?.success) {
        setStatus('success');
      } else {
        setErrorMessage(data?.error || 'Código inválido ou expirado');
        setStatus('error');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setErrorMessage('Erro ao verificar código. Tente novamente.');
      setStatus('error');
    }
  };

  const handleResendCode = async () => {
    if (!userId || !email || countdown > 0) return;

    setIsResending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { userId, email },
      });

      if (error) {
        toast.error('Erro ao reenviar código');
        return;
      }

      if (data?.success) {
        toast.success('Novo código enviado para seu email!');
        setCode(['', '', '', '', '', '']);
        setStatus('input');
        setErrorMessage('');
        setCountdown(60);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      toast.error('Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  const resetForm = () => {
    setCode(['', '', '', '', '', '']);
    setStatus('input');
    setErrorMessage('');
    inputRefs.current[0]?.focus();
  };

  if (!userId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 text-center border border-border/50">
          <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />
          <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <Mail className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Sessão Inválida</h1>
          <p className="text-muted-foreground mb-8">
            Por favor, faça login novamente para verificar seu email.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full h-12 text-base font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center border border-border/50">
        <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />

        {status === 'input' && (
          <div className="space-y-6">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 mx-auto animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                <ShieldCheck className="h-12 w-12 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Verificar Email</h1>
              <p className="text-muted-foreground text-sm">
                Digite o código de 6 dígitos enviado para
              </p>
              <p className="text-foreground font-semibold bg-muted/50 py-2 px-4 rounded-lg inline-block text-sm">
                {email}
              </p>
            </div>
            
            {/* Custom OTP Input - More responsive and smooth */}
            <div className="flex justify-center gap-2 py-4" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 rounded-xl bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none caret-primary"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <Button 
              onClick={() => handleVerify()} 
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-base font-semibold shadow-lg shadow-primary/25"
              disabled={code.some(d => d === '')}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Verificar Código
            </Button>

            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-3">Não recebeu o código?</p>
              <Button 
                variant="outline" 
                onClick={handleResendCode}
                disabled={isResending || countdown > 0}
                className="w-full h-11 border-2 hover:bg-muted/50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reenviar em {countdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reenviar código
                  </>
                )}
              </Button>
            </div>

            <button 
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="space-y-6 py-8">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary mx-auto animate-spin" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Verificando...</h1>
              <p className="text-muted-foreground mt-2">Aguarde um momento</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            {/* Success icon */}
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-success/20 mx-auto animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mx-auto shadow-lg shadow-success/30">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-8">
                <Sparkles className="w-8 h-8 text-warning" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Email Verificado! 🎉
              </h1>
              <p className="text-muted-foreground">
                Sua conta foi ativada com sucesso. Faça login para acessar o sistema.
              </p>
            </div>

            <Button 
              onClick={() => navigate('/login')} 
              className="w-full h-12 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success text-base font-semibold shadow-lg shadow-success/25"
            >
              Fazer login
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center mx-auto shadow-lg shadow-destructive/30">
              <XCircle className="h-12 w-12 text-white" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Código Inválido</h1>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={resetForm} 
                className="w-full h-11"
              >
                Tentar novamente
              </Button>
              <Button 
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending || countdown > 0}
                className="w-full h-11 border-2"
              >
                {isResending ? 'Enviando...' : countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
