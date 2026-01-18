import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-full.png';

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verifyToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-email-token', {
          body: { token },
        });

        if (error) {
          console.error('Verification error:', error);
          setErrorMessage(error.message || 'Erro ao verificar email');
          setStatus('error');
          return;
        }

        if (data?.success) {
          setStatus('success');
        } else {
          setErrorMessage(data?.error || 'Token inválido ou expirado');
          setStatus('error');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setErrorMessage('Erro ao verificar email. Tente novamente.');
        setStatus('error');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 text-center">
        <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Verificando seu email...</h1>
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
              onClick={() => navigate('/login')} 
              className="w-full mt-4 bg-success hover:bg-success/90"
            >
              Fazer login
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Erro na verificação</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <div className="space-y-2 mt-4">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Ir para o login
              </Button>
            </div>
          </div>
        )}

        {status === 'no-token' && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Mail className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Verificação de Email</h1>
            <p className="text-muted-foreground">
              Nenhum token de verificação foi encontrado. Por favor, clique no link enviado para o seu email.
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              variant="outline"
              className="w-full mt-4"
            >
              Voltar para o login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
