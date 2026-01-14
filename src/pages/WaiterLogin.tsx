import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChefHat, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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
          setNotFound(true);
        } else {
          setRestaurant(data);
        }
      } catch (error) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [slug]);

  const handlePinInput = (value: string) => {
    // Only allow numbers, max 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);
  };

  const handleLogin = async () => {
    if (!restaurant || pin.length < 4) {
      toast.error('Digite um PIN válido (mínimo 4 dígitos)');
      return;
    }

    setAuthenticating(true);
    try {
      const { data: waiter, error } = await supabase
        .from('waiters')
        .select('id, name, status, restaurant_id')
        .eq('restaurant_id', restaurant.id)
        .eq('pin', pin)
        .eq('status', 'active')
        .single();

      if (error || !waiter) {
        toast.error('PIN inválido ou garçom inativo');
        setPin('');
        return;
      }

      // Store waiter data in sessionStorage for the WaiterApp
      sessionStorage.setItem('waiter_session', JSON.stringify({
        waiter,
        restaurant,
        loginTime: new Date().toISOString(),
      }));

      toast.success(`Bem-vindo, ${waiter.name}!`);
      navigate(`/garcom/${slug}/app`);
    } catch (error) {
      toast.error('Erro ao autenticar');
    } finally {
      setAuthenticating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <ChefHat className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Restaurante não encontrado</h1>
        <p className="text-white/60 mb-6">O link que você acessou não existe ou está incorreto.</p>
        <Button variant="outline" onClick={() => navigate('/login')} className="text-white border-white/30">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      <header className="p-6 text-center">
        {restaurant?.logo_url ? (
          <img 
            src={restaurant.logo_url} 
            alt={restaurant.name} 
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-yellow-400"
          />
        ) : (
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400 text-[#0d1b2a] mb-4">
            <ChefHat className="w-10 h-10" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">{restaurant?.name}</h1>
        <p className="text-white/70 mt-2">Acesso do Garçom</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Digite seu PIN</h2>
            <p className="text-white/60 text-sm mt-1">PIN de 4 a 6 dígitos</p>
          </div>

          <div className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => handlePinInput(e.target.value)}
              placeholder="• • • • • •"
              className="h-16 text-3xl text-center tracking-[0.5em] bg-white/10 border-white/20 text-white placeholder:text-white/30 font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length >= 4) {
                  handleLogin();
                }
              }}
            />

            <Button
              className="w-full h-14 text-lg bg-yellow-400 hover:bg-yellow-500 text-[#0d1b2a] font-semibold"
              onClick={handleLogin}
              disabled={authenticating || pin.length < 4}
            >
              {authenticating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, idx) => (
              <button
                key={num}
                onClick={() => handlePinInput(pin + num.toString())}
                disabled={pin.length >= 6}
                className={`w-12 h-12 rounded-full bg-white/10 text-white font-bold text-xl hover:bg-white/20 transition-colors disabled:opacity-50 ${idx === 9 ? 'col-start-2' : ''}`}
              >
                {num}
              </button>
            ))}
          </div>

          {pin.length > 0 && (
            <Button
              variant="ghost"
              className="w-full text-white/60 hover:text-white"
              onClick={() => setPin('')}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
