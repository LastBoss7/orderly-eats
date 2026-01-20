import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Delete, ChefHat, KeyRound, LogOut } from 'lucide-react';
import { Waiter } from '../types';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';

export interface WaiterPinLoginProps {
  restaurantId: string;
  restaurantName: string;
  onLogin: (waiter: Waiter) => void;
  onBack: () => void;
}

// Memoized PIN button for better performance
const PinButton = memo(function PinButton({
  digit,
  disabled,
  onClick,
}: {
  digit: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white active:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
    >
      {digit}
    </button>
  );
});

export function WaiterPinLogin({ restaurantId, restaurantName, onLogin, onBack }: WaiterPinLoginProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAuthenticating, setPinAuthenticating] = useState(false);

  const handlePinLogin = useCallback(async (pinValue: string) => {
    if (!restaurantId || pinValue.length < 4) return;
    if (pinAuthenticating) return;

    setPinAuthenticating(true);
    setPinError(null);
    
    try {
      // Use the edge function for PIN authentication (supports hashed PINs)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waiter-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'authenticate',
            restaurant_id: restaurantId,
            pin: pinValue,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.authenticated) {
        setPinError(result.error || 'PIN não encontrado');
        setPinInput('');
        return;
      }

      if (result.waiter.status !== 'active') {
        setPinError('Garçom inativo');
        setPinInput('');
        return;
      }

      onLogin(result.waiter);
    } catch (error) {
      console.error('Login exception:', error);
      setPinError('Erro ao autenticar');
      setPinInput('');
    } finally {
      setPinAuthenticating(false);
    }
  }, [restaurantId, pinAuthenticating, onLogin]);

  const handlePinDigit = useCallback((digit: string) => {
    if (pinInput.length < 6) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setPinError(null);
      
      if (newPin.length >= 4) {
        setTimeout(() => handlePinLogin(newPin), 150);
      }
    }
  }, [pinInput, handlePinLogin]);

  const handlePinDelete = useCallback(() => {
    if (pinInput.length > 0) {
      setPinInput(prev => prev.slice(0, -1));
      setPinError(null);
    }
  }, [pinInput.length]);

  const handlePinClear = useCallback(() => {
    setPinInput('');
    setPinError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      {/* Header */}
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

            {/* Keypad - using memoized buttons */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <PinButton
                  key={num}
                  digit={num}
                  disabled={pinAuthenticating || pinInput.length >= 6}
                  onClick={() => handlePinDigit(num)}
                />
              ))}
            
              {/* Clear button */}
              <button
                onClick={handlePinClear}
                disabled={pinAuthenticating || pinInput.length === 0}
                className="aspect-square text-xs font-medium rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-rose-500/20 active:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center"
              >
                Limpar
              </button>
            
              {/* Zero */}
              <PinButton
                digit="0"
                disabled={pinAuthenticating || pinInput.length >= 6}
                onClick={() => handlePinDigit('0')}
              />
            
              {/* Delete button */}
              <button
                onClick={handlePinDelete}
                disabled={pinAuthenticating || pinInput.length === 0}
                className="aspect-square rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-amber-400/20 active:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center"
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
    </div>
  );
}
