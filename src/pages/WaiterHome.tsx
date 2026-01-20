import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronRight, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoGamako from '@/assets/logo-gamako-white-full.png';

interface RecentRestaurant {
  slug: string;
  name: string;
  logoUrl: string | null;
  lastAccess: string;
}

interface WaiterSession {
  waiter: {
    id: string;
    name: string;
    status: string;
    restaurant_id: string;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  loginTime: string;
}

const RECENT_RESTAURANTS_KEY = 'waiter_recent_restaurants';
const MAX_RECENT = 5;

export default function WaiterHome() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [recentRestaurants, setRecentRestaurants] = useState<RecentRestaurant[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for active session on mount
  useEffect(() => {
    const storedSession = sessionStorage.getItem('waiter_session');
    
    if (storedSession) {
      try {
        const session: WaiterSession = JSON.parse(storedSession);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        // If session is still valid (less than 8 hours), redirect to app
        if (hoursDiff < 8) {
          navigate(`/garcom/${session.restaurant.slug}/app`);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem('waiter_session');
      }
    }
    
    setIsCheckingSession(false);
  }, [navigate]);

  // Load recent restaurants from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_RESTAURANTS_KEY);
      if (stored) {
        setRecentRestaurants(JSON.parse(stored));
      }
    } catch (e) {
      localStorage.removeItem(RECENT_RESTAURANTS_KEY);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedSlug = slug.trim().toLowerCase();
    if (normalizedSlug) {
      navigate(`/garcom/${normalizedSlug}`);
    }
  };

  const handleRecentClick = (restaurantSlug: string) => {
    navigate(`/garcom/${restaurantSlug}`);
  };

  const handleRemoveRecent = (e: React.MouseEvent, slugToRemove: string) => {
    e.stopPropagation();
    const updated = recentRestaurants.filter(r => r.slug !== slugToRemove);
    setRecentRestaurants(updated);
    localStorage.setItem(RECENT_RESTAURANTS_KEY, JSON.stringify(updated));
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pt-12 text-center">
        <img 
          src={logoGamako} 
          alt="Gamako" 
          className="h-10 mx-auto mb-4 opacity-80"
        />
        <h1 className="text-2xl font-bold text-white mb-1">App do Garçom</h1>
        <p className="text-gray-400 text-sm">Digite o código do restaurante para acessar</p>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        {/* Slug input form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Código do restaurante"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 bg-[#1b2838] border-[#2a3f5f] text-white placeholder:text-gray-500 h-12 text-base"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <Button 
              type="submit" 
              disabled={!slug.trim()}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold h-12 px-6"
            >
              Acessar
            </Button>
          </div>
        </form>

        {/* Recent restaurants */}
        {recentRestaurants.length > 0 && (
          <div>
            <h2 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
              Restaurantes recentes
            </h2>
            <div className="space-y-2">
              {recentRestaurants.map((restaurant) => (
                <button
                  key={restaurant.slug}
                  onClick={() => handleRecentClick(restaurant.slug)}
                  className="w-full bg-[#1b2838] hover:bg-[#243447] rounded-lg p-4 flex items-center gap-4 transition-colors group"
                >
                  {/* Logo or placeholder */}
                  <div className="w-12 h-12 rounded-lg bg-[#2a3f5f] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {restaurant.logoUrl ? (
                      <img 
                        src={restaurant.logoUrl} 
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Restaurant info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white font-medium truncate">{restaurant.name}</p>
                    <p className="text-gray-500 text-sm">/{restaurant.slug}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleRemoveRecent(e, restaurant.slug)}
                      className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentRestaurants.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">
              Digite o código do restaurante acima para começar
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-6 text-center">
        <p className="text-gray-600 text-xs">
          Powered by Gamako
        </p>
      </div>
    </div>
  );
}

// Helper function to save a restaurant to recent list
export function saveRecentRestaurant(restaurant: { slug: string; name: string; logoUrl: string | null }) {
  try {
    const stored = localStorage.getItem(RECENT_RESTAURANTS_KEY);
    let recent: RecentRestaurant[] = stored ? JSON.parse(stored) : [];
    
    // Remove if already exists
    recent = recent.filter(r => r.slug !== restaurant.slug);
    
    // Add to beginning
    recent.unshift({
      ...restaurant,
      lastAccess: new Date().toISOString()
    });
    
    // Keep only max items
    recent = recent.slice(0, MAX_RECENT);
    
    localStorage.setItem(RECENT_RESTAURANTS_KEY, JSON.stringify(recent));
  } catch (e) {
    // Ignore storage errors
  }
}
