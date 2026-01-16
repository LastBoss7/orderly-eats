import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, ChefHat, ArrowLeft, Delete } from 'lucide-react';
import { toast } from 'sonner';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface Waiter {
  id: string;
  name: string;
  status: string;
  restaurant_id: string;
}

export default function WaiterLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, slug, logo_url')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          console.error('Restaurant fetch error:', error);
          setNotFound(true);
        } else {
          setRestaurant(data);
        }
      } catch (error) {
        console.error('Restaurant fetch exception:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [slug]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      
      // Auto-submit when 4+ digits
      if (newPin.length >= 4) {
        // Small delay to show the digit
        setTimeout(() => {
          handleLogin(newPin);
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleLogin = async (pinValue?: string) => {
    const currentPin = pinValue || pin;
    
    if (!restaurant || currentPin.length < 4) {
      return;
    }

    // Prevent multiple submissions
    if (authenticating) return;

    setAuthenticating(true);
    setError(null);
    
    try {
      console.log('Attempting login with PIN for restaurant:', restaurant.id);
      
      // Use Edge Function for secure PIN authentication
      const { data, error: authError } = await supabase.functions.invoke('waiter-auth', {
        body: {
          action: 'authenticate',
          restaurant_id: restaurant.id,
          pin: currentPin,
        },
      });

      console.log('Auth result:', { data, authError });

      if (authError) {
        console.error('Auth error:', authError);
        setError('Erro ao verificar PIN. Tente novamente.');
        setPin('');
        return;
      }

      if (!data?.authenticated) {
        setError(data?.error || 'PIN não encontrado');
        setPin('');
        return;
      }

      const waiter = data.waiter;

      // Store waiter data in sessionStorage for the WaiterApp
      sessionStorage.setItem('waiter_session', JSON.stringify({
        waiter,
        restaurant,
        loginTime: new Date().toISOString(),
      }));

      toast.success(`Bem-vindo, ${waiter.name}!`);
      navigate(`/garcom/${slug}/app`);
    } catch (error) {
      console.error('Login exception:', error);
      setError('Erro ao autenticar. Tente novamente.');
      setPin('');
    } finally {
      setAuthenticating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-6 animate-pulse">
          <ChefHat className="w-12 h-12 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Restaurante não encontrado</h1>
        <p className="text-white/60 mb-8 max-w-xs">O link que você acessou não existe ou está incorreto.</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/login')} 
          className="text-white border-white/30 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="pt-10 pb-6 text-center">
        <img 
          src={logoGamakoWhite} 
          alt="Gamako" 
          className="h-16 mx-auto mb-4 object-contain"
        />
        <h1 className="text-xl font-bold text-white">{restaurant?.name}</h1>
        <p className="text-amber-400/80 mt-1 text-sm font-medium">Acesso do Garçom</p>
      </header>

      {/* PIN Display */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4">
        <div className="w-full max-w-xs">
          {/* PIN Dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pin.length 
                    ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/50' 
                    : 'bg-white/20 border border-white/30'
                }`}
              />
            ))}
          </div>

          {/* Error/Status message */}
          <div className="h-8 flex items-center justify-center mb-4">
            {authenticating ? (
              <div className="flex items-center gap-2 text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verificando...</span>
              </div>
            ) : error ? (
              <p className="text-red-400 text-sm font-medium animate-shake">{error}</p>
            ) : (
              <p className="text-white/40 text-sm">Digite seu PIN de 4-6 dígitos</p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                disabled={authenticating || pin.length >= 6}
                className="aspect-square text-2xl font-semibold rounded-2xl bg-white/10 text-white 
                         hover:bg-white/20 active:bg-amber-400 active:text-slate-900 
                         transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                         border border-white/10 hover:border-white/30 active:border-amber-400
                         shadow-lg backdrop-blur-sm"
              >
                {num}
              </button>
            ))}
            
            {/* Clear button */}
            <button
              onClick={handleClear}
              disabled={authenticating || pin.length === 0}
              className="aspect-square text-sm font-medium rounded-2xl bg-white/5 text-white/60
                       hover:bg-white/10 hover:text-white active:bg-red-500/20 active:text-red-400
                       transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                       border border-white/10 flex items-center justify-center"
            >
              Limpar
            </button>
            
            {/* Zero */}
            <button
              onClick={() => handlePinInput('0')}
              disabled={authenticating || pin.length >= 6}
              className="aspect-square text-2xl font-semibold rounded-2xl bg-white/10 text-white 
                       hover:bg-white/20 active:bg-amber-400 active:text-slate-900 
                       transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                       border border-white/10 hover:border-white/30 active:border-amber-400
                       shadow-lg backdrop-blur-sm"
            >
              0
            </button>
            
            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={authenticating || pin.length === 0}
              className="aspect-square rounded-2xl bg-white/5 text-white/60
                       hover:bg-white/10 hover:text-white active:bg-amber-400/20 active:text-amber-400
                       transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                       border border-white/10 flex items-center justify-center"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-white/30 text-xs">
          Fale com seu gerente caso não tenha seu PIN
        </p>
      </footer>
    </div>
  );
}
