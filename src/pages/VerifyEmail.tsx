import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw } from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-full.png';
import { toast } from 'sonner';

type VerificationStatus = 'input' | 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [code, setCode] = useState('');
  const [isResending, setIsResending] = useState(false);

  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  const handleVerify = async () => {
    if (code.length !== 6) {
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
        body: { userId, code },
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
    if (!userId || !email) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

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
        setCode('');
        setStatus('input');
        setErrorMessage('');
      }
    } catch (err) {
      toast.error('Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  if (!userId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 text-center">
          <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Mail className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Sessão Inválida</h1>
          <p className="text-muted-foreground mb-6">
            Por favor, faça login novamente para verificar seu email.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 text-center">
        <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />

        {status === 'input' && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground mb-2">Verificar Email</h1>
              <p className="text-muted-foreground text-sm">
                Digite o código de 6 dígitos enviado para
              </p>
              <p className="text-foreground font-medium">{email}</p>
            </div>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              onClick={handleVerify} 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={code.length !== 6}
            >
              Verificar
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Não recebeu o código?</p>
              <Button 
                variant="outline" 
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reenviar código
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Verificando...</h1>
            <p className="text-muted-foreground">Aguarde um momento</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Email verificado!</h1>
            <p className="text-muted-foreground">
              Sua conta foi ativada com sucesso. Agora você pode acessar todas as funcionalidades do Gamako.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full mt-4 bg-success hover:bg-success/90"
            >
              Acessar o sistema
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Código inválido</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <div className="space-y-2 mt-4">
              <Button 
                onClick={() => {
                  setCode('');
                  setStatus('input');
                  setErrorMessage('');
                }} 
                className="w-full"
              >
                Tentar novamente
              </Button>
              <Button 
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? 'Enviando...' : 'Reenviar código'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
