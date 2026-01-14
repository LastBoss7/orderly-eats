import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WaiterApp from './WaiterApp';

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

export default function WaiterAppPublic() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<WaiterSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSession = sessionStorage.getItem('waiter_session');
    
    if (!storedSession) {
      navigate(`/garcom/${slug}`);
      return;
    }

    try {
      const parsedSession: WaiterSession = JSON.parse(storedSession);
      
      // Validate session belongs to this restaurant
      if (parsedSession.restaurant.slug !== slug) {
        sessionStorage.removeItem('waiter_session');
        navigate(`/garcom/${slug}`);
        return;
      }

      // Check if session is still valid (8 hour limit)
      const loginTime = new Date(parsedSession.loginTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 8) {
        sessionStorage.removeItem('waiter_session');
        toast.error('Sessão expirada. Faça login novamente.');
        navigate(`/garcom/${slug}`);
        return;
      }

      setSession(parsedSession);
    } catch (error) {
      sessionStorage.removeItem('waiter_session');
      navigate(`/garcom/${slug}`);
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Pass waiter session data via props mechanism using a wrapper
  return (
    <WaiterApp 
      externalWaiter={session.waiter}
      externalRestaurant={session.restaurant}
      onExternalLogout={() => {
        sessionStorage.removeItem('waiter_session');
        toast.success('Você saiu do sistema');
        navigate(`/garcom/${slug}`);
      }}
    />
  );
}
