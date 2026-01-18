import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChefHat, Delete } from 'lucide-react';
import { motion } from 'framer-motion';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Waiter } from '../types';

interface WaiterPinLoginProps {
  restaurantId: string;
  restaurantName: string;
  onLoginSuccess: (waiter: Waiter) => void;
}

export function WaiterPinLogin({ restaurantId, restaurantName, onLoginSuccess }: WaiterPinLoginProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePinLogin = async (pinValue: string) => {
    if (!restaurantId || pinValue.length < 4) return;
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setPinError(null);
    
    try {
      const { data: waiter, error: queryError } = await supabase
        .from('waiters')
        .select('id, name, status, restaurant_id')
        .eq('restaurant_id', restaurantId)
        .eq('pin', pinValue)
        .maybeSingle();

      if (queryError) {
        setPinError('Erro ao verificar PIN');
        setPinInput('');
        return;
      }

      if (!waiter) {
        setPinError('PIN não encontrado');
        setPinInput('');
        return;
      }

      if (waiter.status !== 'active') {
        setPinError('Garçom inativo');
        setPinInput('');
        return;
      }

      onLoginSuccess(waiter);
      toast.success(`Bem-vindo, ${waiter.name}!`);
    } catch (error) {
      setPinError('Erro ao autenticar');
      setPinInput('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 6) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setPinError(null);
      
      if (newPin.length >= 4) {
        setTimeout(() => handlePinLogin(newPin), 200);
      }
    }
  };

  const handlePinDelete = () => {
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
      setPinError(null);
    }
  };

  const handlePinClear = () => {
    setPinInput('');
    setPinError(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 flex flex-col relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      {/* Header */}
      <header className="pt-10 pb-6 text-center relative z-10">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl">
          <img src={logoGamakoWhite} alt="Gamako" className="h-12 object-contain" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">{restaurantName}</h1>
        <p className="text-amber-400 mt-2 text-sm font-semibold flex items-center justify-center gap-2">
          <ChefHat className="w-4 h-4" />
          Acesso do Garçom
        </p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 relative z-10">
        {/* PIN Display */}
        <div className="mb-8 text-center">
          <p className="text-white/60 text-sm mb-4 font-medium">Digite seu PIN de acesso</p>
          <div className="flex gap-3 justify-center">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pinInput.length 
                    ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-500/50' 
                    : 'bg-white/20 border border-white/30'
                }`}
              />
            ))}
          </div>
          {pinError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-rose-400 text-sm mt-4 font-medium bg-rose-500/10 py-2 px-4 rounded-full"
            >
              {pinError}
            </motion.p>
          )}
          {isAuthenticating && (
            <div className="mt-4 flex items-center gap-2 text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Verificando...</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="ghost"
              onClick={() => handlePinDigit(num.toString())}
              disabled={isAuthenticating || pinInput.length >= 6}
              className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white active:border-amber-500 transition-all duration-150 disabled:opacity-40"
            >
              {num}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            onClick={handlePinClear}
            disabled={isAuthenticating || pinInput.length === 0}
            className="aspect-square text-xs font-medium rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-rose-500/20 active:text-rose-400 transition-all duration-150 disabled:opacity-40 border border-white/10"
          >
            Limpar
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => handlePinDigit('0')}
            disabled={isAuthenticating || pinInput.length >= 6}
            className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white transition-all duration-150 disabled:opacity-40"
          >
            0
          </Button>
          
          <Button
            variant="ghost"
            onClick={handlePinDelete}
            disabled={isAuthenticating || pinInput.length === 0}
            className="aspect-square rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-amber-400/20 active:text-amber-400 transition-all duration-150 disabled:opacity-40 border border-white/10 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
