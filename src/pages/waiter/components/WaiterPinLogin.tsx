import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Loader2, Delete, ChefHat, KeyRound, LogOut } from 'lucide-react';
import { Waiter } from '../types';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';

export interface WaiterPinLoginProps {
  restaurantId: string;
  restaurantName: string;
  onLogin: (waiter: Waiter) => void;
  onBack: () => void;
}

export function WaiterPinLogin({ restaurantId, restaurantName, onLogin, onBack }: WaiterPinLoginProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAuthenticating, setPinAuthenticating] = useState(false);

  const handlePinLogin = async (pinValue: string) => {
    if (!restaurantId || pinValue.length < 4) return;
    if (pinAuthenticating) return;

    setPinAuthenticating(true);
    setPinError(null);
    
    try {
      const { data: waiter, error: queryError } = await supabase
        .from('waiters')
        .select('id, name, status, restaurant_id')
        .eq('restaurant_id', restaurantId)
        .eq('pin', pinValue)
        .maybeSingle();

      if (queryError) {
        console.error('Query error:', queryError);
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

      onLogin(waiter);
    } catch (error) {
      console.error('Login exception:', error);
      setPinError('Erro ao autenticar');
      setPinInput('');
    } finally {
      setPinAuthenticating(false);
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
          <img 
            src={logoGamakoWhite} 
            alt="Gamako" 
            className="h-12 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">{restaurantName}</h1>
        <p className="text-amber-400 mt-2 text-sm font-semibold flex items-center justify-center gap-2">
          <ChefHat className="w-4 h-4" />
          Acesso do Garçom
        </p>
      </header>

      {/* PIN Entry */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4 relative z-10">
        <div className="w-full max-w-xs">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
            {/* PIN Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
            </div>
            
            {/* PIN Dots */}
            <div className="flex justify-center gap-4 mb-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    i < pinInput.length 
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 scale-125 shadow-lg shadow-amber-400/50' 
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Error/Status message */}
            <div className="h-6 flex items-center justify-center mb-4">
              {pinAuthenticating ? (
                <div className="flex items-center gap-2 text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Verificando...</span>
                </div>
              ) : pinError ? (
                <p className="text-rose-400 text-sm font-medium">{pinError}</p>
              ) : (
                <p className="text-white/50 text-xs">Digite seu PIN de 4-6 dígitos</p>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinDigit(num.toString())}
                  disabled={pinAuthenticating || pinInput.length >= 6}
                  className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white active:border-amber-500 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
                >
                  {num}
                </button>
              ))}
            
              {/* Clear button */}
              <button
                onClick={handlePinClear}
                disabled={pinAuthenticating || pinInput.length === 0}
                className="aspect-square text-xs font-medium rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-rose-500/20 active:text-rose-400 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center"
              >
                Limpar
              </button>
            
              {/* Zero */}
              <button
                onClick={() => handlePinDigit('0')}
                disabled={pinAuthenticating || pinInput.length >= 6}
                className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              >
                0
              </button>
            
              {/* Delete button */}
              <button
                onClick={handlePinDelete}
                disabled={pinAuthenticating || pinInput.length === 0}
                className="aspect-square rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-amber-400/20 active:text-amber-400 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 flex flex-col items-center gap-2 relative z-10">
        <p className="text-white/40 text-xs">
          Fale com seu gerente caso não tenha seu PIN
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="text-white/50 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </footer>
    </motion.div>
  );
}
