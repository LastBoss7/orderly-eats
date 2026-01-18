import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-full.png';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationStatus = 'input' | 'loading' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [code, setCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
        setCode('');
        setStatus('input');
        setErrorMessage('');
        setCountdown(60);
      }
    } catch (err) {
      toast.error('Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.3 }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
        delay: 0.2
      }
    }
  };

  const successIconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring" as const,
        stiffness: 300,
        damping: 20
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  if (!userId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 text-center border border-border/50"
        >
          <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />
          <motion.div 
            variants={iconVariants}
            className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6"
          >
            <Mail className="h-12 w-12 text-muted-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Sessão Inválida</h1>
          <p className="text-muted-foreground mb-8">
            Por favor, faça login novamente para verificar seu email.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full h-12 text-base font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir para o login
          </Button>
        </motion.div>
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

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative w-full max-w-md bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center border border-border/50"
      >
        <img src={logoGamako} alt="Gamako" className="h-12 mx-auto mb-8" />

        <AnimatePresence mode="wait">
          {status === 'input' && (
            <motion.div 
              key="input"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="space-y-6"
            >
              {/* Animated icon */}
              <div className="relative">
                <motion.div 
                  variants={pulseVariants}
                  animate="animate"
                  className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 mx-auto"
                />
                <motion.div 
                  variants={iconVariants}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto shadow-lg shadow-primary/30"
                >
                  <ShieldCheck className="h-12 w-12 text-white" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Verificar Email</h1>
                <p className="text-muted-foreground text-sm">
                  Digite o código de 6 dígitos enviado para
                </p>
                <p className="text-foreground font-semibold bg-muted/50 py-2 px-4 rounded-lg inline-block">
                  {email}
                </p>
              </div>
              
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  className="gap-2"
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot 
                        key={index}
                        index={index} 
                        className="w-12 h-14 text-xl font-bold border-2 rounded-xl transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/20"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerify} 
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-base font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                disabled={code.length !== 6}
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
                  className="w-full h-11 border-2 hover:bg-muted/50 transition-all duration-200"
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
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </button>
            </motion.div>
          )}

          {status === 'loading' && (
            <motion.div 
              key="loading"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="space-y-6 py-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary mx-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">Verificando...</h1>
                <p className="text-muted-foreground mt-2">Aguarde um momento</p>
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              key="success"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="space-y-6"
            >
              {/* Animated success icon with confetti effect */}
              <div className="relative">
                <motion.div 
                  variants={pulseVariants}
                  animate="animate"
                  className="absolute inset-0 w-24 h-24 rounded-full bg-success/20 mx-auto"
                />
                <motion.div 
                  variants={successIconVariants}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mx-auto shadow-lg shadow-success/30"
                >
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>
                {/* Sparkles decoration */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-8 h-8 text-warning" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-foreground"
                >
                  Email Verificado! 🎉
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground"
                >
                  Sua conta foi ativada com sucesso. Agora você pode acessar todas as funcionalidades do Gamako.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full h-12 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success text-base font-semibold shadow-lg shadow-success/25 transition-all duration-300"
                >
                  Acessar o sistema
                </Button>
              </motion.div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="space-y-6"
            >
              <motion.div 
                variants={iconVariants}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center mx-auto shadow-lg shadow-destructive/30"
              >
                <XCircle className="h-12 w-12 text-white" />
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Código Inválido</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setCode('');
                    setStatus('input');
                    setErrorMessage('');
                  }} 
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
