import { useEffect, useState, useCallback } from 'react';
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
  lastActivityTime?: string;
}

const SESSION_TIMEOUT_HOURS = 8; // Maximum session duration
const INACTIVITY_TIMEOUT_MINUTES = 120; // 2 hours of inactivity

export default function WaiterAppPublic() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<WaiterSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Update last activity time
  const updateActivityTime = useCallback(() => {
    const storedSession = sessionStorage.getItem('waiter_session');
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        parsedSession.lastActivityTime = new Date().toISOString();
        sessionStorage.setItem('waiter_session', JSON.stringify(parsedSession));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Check if session is expired due to inactivity
  const checkInactivity = useCallback(() => {
    const storedSession = sessionStorage.getItem('waiter_session');
    if (!storedSession) return true;

    try {
      const parsedSession: WaiterSession = JSON.parse(storedSession);
      const lastActivity = parsedSession.lastActivityTime 
        ? new Date(parsedSession.lastActivityTime)
        : new Date(parsedSession.loginTime);
      
      const now = new Date();
      const minutesDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
      
      return minutesDiff > INACTIVITY_TIMEOUT_MINUTES;
    } catch (e) {
      return true;
    }
  }, []);

  // Handle session expiration
  const handleSessionExpired = useCallback((reason: string) => {
    sessionStorage.removeItem('waiter_session');
    toast.error(reason);
    navigate(`/garcom/${slug}`);
  }, [slug, navigate]);

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
      
      if (hoursDiff > SESSION_TIMEOUT_HOURS) {
        handleSessionExpired('Sessão expirada. Faça login novamente.');
        return;
      }

      // Check for inactivity
      if (checkInactivity()) {
        handleSessionExpired('Sessão expirada por inatividade. Faça login novamente.');
        return;
      }

      // Update activity time on load
      updateActivityTime();
      setSession(parsedSession);
    } catch (error) {
      sessionStorage.removeItem('waiter_session');
      navigate(`/garcom/${slug}`);
    } finally {
      setLoading(false);
    }
  }, [slug, navigate, checkInactivity, handleSessionExpired, updateActivityTime]);

  // Set up activity tracking and periodic inactivity check
  useEffect(() => {
    if (!session) return;

    // Track user activity
    const activityEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    
    const handleActivity = () => {
      updateActivityTime();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for inactivity every minute
    const inactivityCheck = setInterval(() => {
      if (checkInactivity()) {
        handleSessionExpired('Sessão expirada por inatividade. Faça login novamente.');
      }
    }, 60000); // Check every minute

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheck);
    };
  }, [session, checkInactivity, handleSessionExpired, updateActivityTime]);

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