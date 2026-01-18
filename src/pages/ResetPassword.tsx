import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { PasswordStrength } from '@/components/ui/password-strength';
import logoGamako from '@/assets/logo-gamako-full.png';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type PageStatus = 'input' | 'loading' | 'success' | 'error';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PageStatus>('input');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password validation
  const passwordMinLength = password.length >= 6;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = passwordMinLength && passwordsMatch;

  useEffect(() => {
    // Check if we have a valid session from the email link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Link inválido ou expirado. Solicite um novo link.');
        navigate('/forgot-password');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      if (!passwordMinLength) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
      } else if (!passwordsMatch) {
        toast.error('As senhas não coincidem');
      }
      return;
    }

    setStatus('loading');

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Password update error:', error);
        setErrorMessage(error.message || 'Erro ao atualizar senha');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch (err) {
      console.error('Password reset error:', err);
      setErrorMessage('Erro ao atualizar senha. Tente novamente.');
      setStatus('error');
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
                  <KeyRound className="h-12 w-12 text-white" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Nova Senha</h1>
                <p className="text-muted-foreground text-sm">
                  Crie uma nova senha segura para sua conta
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Nova Senha <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-12 pr-12 border-2 ${
                        password && !passwordMinLength 
                          ? 'border-destructive focus:border-destructive' 
                          : password && passwordMinLength 
                            ? 'border-success focus:border-success' 
                            : 'border-border/60'
                      }`}
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
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirmar Senha <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Digite a senha novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`h-12 pr-12 border-2 ${
                        confirmPassword && !passwordsMatch 
                          ? 'border-destructive focus:border-destructive' 
                          : confirmPassword && passwordsMatch 
                            ? 'border-success focus:border-success' 
                            : 'border-border/60'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-success' : 'text-destructive'}`}>
                      {passwordsMatch ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span>{passwordsMatch ? 'Senhas coincidem' : 'As senhas não coincidem'}</span>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-base font-semibold shadow-lg shadow-primary/25"
                  disabled={!isFormValid}
                >
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Salvar Nova Senha
                </Button>
              </form>
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
                <h1 className="text-xl font-bold text-foreground">Atualizando...</h1>
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
                <h1 className="text-2xl font-bold text-foreground">Senha Atualizada! 🎉</h1>
                <p className="text-muted-foreground">
                  Sua nova senha foi salva com sucesso. Agora você pode fazer login.
                </p>
              </div>

              <Button 
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success text-base font-semibold shadow-lg shadow-success/25"
              >
                Ir para o Login
              </Button>
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
                <h1 className="text-2xl font-bold text-foreground">Erro ao Atualizar</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setPassword('');
                    setConfirmPassword('');
                    setStatus('input');
                    setErrorMessage('');
                  }} 
                  className="w-full h-11"
                >
                  Tentar novamente
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/forgot-password')}
                  className="w-full h-11 border-2"
                >
                  Solicitar novo link
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
