import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Base64 encoded notification sounds (short beeps)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAAAHD/MjZz/0RVc/+htrD/z9XP/6y3q/9ibmH/KTgo/xQgE/8dKRv/QVBA/3ODcv+rvar/ztfM/7jEtv9xgW//MEUN/xMIGP8lBjj/QQBd/2YAhv+LAKz/qQDI/70A2v/HAOf/yQDv/8IA8v+1AO//owDn/40A2v9zAMj/VwCy/zsAmP8fAHz/BgBe/+r/QP/N/yP/sv8I/5n/7v6C/9b+bf/A/lr/rP5J/5v+Ov+M/i7/f/4k/3X+HP9t/hb/Z/4S/2P+EP9h/g//Yf4Q/2L+E/9l/hf/av4d/3D+Jf94/i7/gf45/4v+Rv+W/lT/ov5k/67+dv+7/on/yP6d/9X+sv/i/sj/7v7f//r+9v8F/w0AEP8kABv/OwAl/1EAL/9nADj/fABB/5EASP+kAE//tQBW/8UAXP/TAF//4QBi/+sAZP/zAGb/+QBn//0AZ///AGf//wBn//4AZv/7AGT/9gBi/+8AXv/mAFr/2wBV/84AT/+/AEj/rgBA/5wAN/+IADL/cwAv/18AK/9LACj/NwAl/yQAIv8SAB//AAAZ/+7/E//c/wz/yv8G/7j/AP+n//n+l//y/oj/7P55/+b+a//f/l7/2f5S/9P+R//N/j3/x/40/8L+LP++/iX/uv4f/7b+Gv+z/hb/sf4U/6/+E/+u/hP/rv4U/6/+Fv+x/hn/s/4d/7b+Iv+6/ij/vv4v/8P+N//I/j//zv5I/9X+Uv/c/l3/4/5o/+v+df/y/oL/+v6Q/wL/n/8K/67/E/+9/xv/zP8k/9v/LP/q/zT/+P87/wYAQv8TAEj/HwBN/ysAUv81AFX/PgBY/0YAWP9NAFj/UgBX/1YAVP9YAFH/WABM/1gAR/9VAD//UQBA/0sAP/9DADv/OgA2/y8AMf8jACv/FwAl/woAH//9/xn/8P8U/+P/D//W/wr/yf8G/7z/Av+w//7+pP/7/pn/+P6O//X+hP/z/nv/8f5z//D+bP/v/mX/7/5g/+/+XP/w/lj/8f5W//P+Vf/1/lT/+P5V//v+Vv/+/lj/Av9b/wf/X/8L/2P/EP9o/xX/bf8b/3P/Iv95/yn/gP8w/4f/N/+P/z7/l/9G/57/Tv+m/1f/rv9f/7X/aP+9/3H/xP96/8v/g//R/4z/1/+V/93/nf/i/6X/5/+t/+v/tf/u/7z/8f/D//P/yf/1/8//9v/U//f/2P/3/9z/9//f//b/4v/1/+T/8//m//H/5//v/+j/7P/o/+n/6P/m/+j/4//n/9//5v/b/+X/1//j/9P/4f/O/9//yv/d/8X/2v/B/9j/vP/V/7j/0v+0/8//sP/M/6z/yf+p/8b/pf/D/6L/wP+f/73/nP+7/5r/uP+Y/7b/lv+0/5T/s/+T/7H/kv+w/5H/r/+R/67/kf+u/5H/rv+S/6//k/+w/5T/sf+V/7P/l/+1/5n/t/+b/7r/nv+9/6D/wP+k/8P/p//H/6v/yv+v/87/s//S/7f/1v+8/9r/wP/e/8X/4v/K/+b/z//q/9P/7f/Y//H/3P/0/+D/9//k//r/5//8/+r//v/t////7/8AAO////8BAPr/AQD7/wEA/P8AAAAAAAAAAAAA';

const ALERT_SOUND = 'data:audio/wav;base64,UklGRjIGAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABkYXRhDgYAAH9/f39/f4CAgYKDhIaHiYuNj5GTlZeZm52foaOlp6mrra+xs7W3ubi5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nnb3N7f4OHi4+Tl5ujp6uvs7e7v8PHy8/T19vf4+fr7/P3+/v8AAQIDBAUGBggJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywsLS4uLy8wMTEyMjMzNDQ0NTU1NjY2Nzc3ODg4OTk5Ojo6Ozs7PDw8PT09Pj4+Pz8/QEBAQUFBQkJCQ0NDRERERUVFRkZGR0dHSEhISUlJSkpKS0tLTExMTU1NTk5OT09PUFBQUVFRUlJSU1NTVFRUVVVVVlZWV1dXWFhYWVlZWlpaW1tbXFxcXV1dXl5eX19fYGBgYWFhYmJiY2NjZGRkZWVlZmZmZ2dnaGhoaWlpampqa2trbGxsbW1tbm5ub29vcHBwcXFxcnJyc3NzdHR0dXV1dnZ2d3d3eHh4eXl5enp6e3t7fHx8fX19fn5+f39/gICAgYGBgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uLjIyMjY2Njo6Oj4+PkJCQkZGRkpKSk5OTlJSUlZWVlpaWl5eXmJiYmZmZmpqam5ubnJycnZ2dnp6en5+foKCgoaGhoqKio6OjpKSkpaWlpqamp6enqKioqampqqqqq6urrKysra2trq6ur6+vsLCwsbGxsrKys7OztLS0tbW1tra2t7e3uLi4ubm5urq6u7u7vLy8vb29vr6+v7+/wMDAwcHBwsLCw8PDxMTExcXFxsbGx8fHyMjIycnJysrKy8vLzMzMzc3Nzs7Oz8/P0NDQ0dHR0tLS09PT1NTU1dXV1tbW19fX2NjY2dnZ2tra29vb3Nzc3d3d3t7e39/f4ODg4eHh4uLi4+Pj5OTk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+////';

interface OrderNotification {
  id: string;
  orderNumber: string;
  type: 'new' | 'delayed';
  timestamp: Date;
}

export function useOrderNotifications(restaurantId: string | undefined) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const processedOrdersRef = useRef<Set<string>>(new Set());

  // Initialize audio elements
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.7;
    
    alertAudioRef.current = new Audio(ALERT_SOUND);
    alertAudioRef.current.volume = 0.8;

    return () => {
      audioRef.current = null;
      alertAudioRef.current = null;
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, [soundEnabled]);

  const playAlertSound = useCallback(() => {
    if (soundEnabled && alertAudioRef.current) {
      alertAudioRef.current.currentTime = 0;
      alertAudioRef.current.play().catch(console.error);
    }
  }, [soundEnabled]);

  const addNotification = useCallback((notification: Omit<OrderNotification, 'timestamp'>) => {
    setNotifications(prev => [
      { ...notification, timestamp: new Date() },
      ...prev.slice(0, 9) // Keep last 10 notifications
    ]);
  }, []);

  // Subscribe to realtime order changes
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const order = payload.new as any;
          
          // Avoid duplicate notifications
          if (processedOrdersRef.current.has(order.id)) return;
          processedOrdersRef.current.add(order.id);

          // Play sound and show toast
          playNotificationSound();
          
          const orderNumber = order.id.slice(0, 4).toUpperCase();
          
          toast({
            title: '🔔 Novo Pedido!',
            description: `Pedido #${orderNumber} recebido`,
            duration: 5000,
          });

          addNotification({
            id: order.id,
            orderNumber,
            type: 'new',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playNotificationSound, toast, addNotification]);

  // Check for delayed orders periodically
  useEffect(() => {
    if (!restaurantId) return;

    const checkDelayedOrders = async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: delayedOrders } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['pending', 'preparing'])
        .lt('created_at', thirtyMinutesAgo);

      if (delayedOrders && delayedOrders.length > 0) {
        // Play alert sound for delayed orders
        playAlertSound();
        
        toast({
          variant: 'destructive',
          title: '⚠️ Pedidos Atrasados!',
          description: `${delayedOrders.length} pedido(s) há mais de 30 minutos`,
          duration: 10000,
        });
      }
    };

    // Check immediately and every 5 minutes
    checkDelayedOrders();
    const interval = setInterval(checkDelayedOrders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [restaurantId, playAlertSound, toast]);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return {
    notifications,
    soundEnabled,
    toggleSound,
    clearNotification,
    playNotificationSound,
    playAlertSound,
  };
}
