import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import logoGamako from '@/assets/logo-gamako-full.png';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type PageStatus = 'input' | 'loading' | 'sent';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PageStatus>('input');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    setStatus('loading');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || 'Erro ao enviar email de recuperação');
        setStatus('input');
        return;
      }

      setStatus('sent');
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error('Erro ao enviar email. Tente novamente.');
      setStatus('input');
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-warning/5 rounded-full blur-3xl" />
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
                  className="absolute inset-0 w-24 h-24 rounded-full bg-warning/20 mx-auto"
                />
                <motion.div 
                  variants={iconVariants}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center mx-auto shadow-lg shadow-warning/30"
                >
                  <KeyRound className="h-12 w-12 text-white" />
                </motion.div>
              </div>

              <div className="space-y-2 text-left">
                <h1 className="text-2xl font-bold text-foreground text-center">Esqueceu a senha?</h1>
                <p className="text-muted-foreground text-sm text-center">
                  Não se preocupe! Digite seu email e enviaremos as instruções para criar uma nova senha.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-2 border-border/60 focus:border-primary"
                    required
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-base font-semibold shadow-lg shadow-primary/25"
                  disabled={!email}
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Enviar instruções
                </Button>
              </form>

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
                <h1 className="text-xl font-bold text-foreground">Enviando...</h1>
                <p className="text-muted-foreground mt-2">Aguarde um momento</p>
              </div>
            </motion.div>
          )}

          {status === 'sent' && (
            <motion.div 
              key="sent"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="space-y-6"
            >
              {/* Animated success icon */}
              <div className="relative">
                <motion.div 
                  variants={pulseVariants}
                  animate="animate"
                  className="absolute inset-0 w-24 h-24 rounded-full bg-success/20 mx-auto"
                />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mx-auto shadow-lg shadow-success/30"
                >
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Email Enviado!</h1>
                <p className="text-muted-foreground">
                  Enviamos as instruções de recuperação para
                </p>
                <p className="text-foreground font-semibold bg-muted/50 py-2 px-4 rounded-lg inline-block">
                  {email}
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm text-muted-foreground">
                  📧 Verifique sua caixa de entrada e pasta de spam
                </p>
                <p className="text-sm text-muted-foreground">
                  🔗 Clique no link do email para criar uma nova senha
                </p>
                <p className="text-sm text-muted-foreground">
                  ⏱️ O link expira em 1 hora
                </p>
              </div>

              <Button 
                variant="outline"
                onClick={() => navigate('/login')}
                className="w-full h-11 border-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para o login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
