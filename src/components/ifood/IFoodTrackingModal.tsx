import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Truck, 
  RefreshCw, 
  AlertCircle,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingData {
  available: boolean;
  latitude?: number | null;
  longitude?: number | null;
  expectedDelivery?: string | null;
  pickupEtaStart?: number | null;
  deliveryEtaEnd?: number | null;
  trackDate?: string | null;
}

interface IFoodTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetchTracking: () => Promise<TrackingData | null>;
  orderDisplayId: string;
  driverName?: string | null;
  driverPhone?: string | null;
}

export function IFoodTrackingModal({
  open,
  onOpenChange,
  fetchTracking,
  orderDisplayId,
  driverName,
  driverPhone,
}: IFoodTrackingModalProps) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracking = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTracking();
      if (data) {
        setTracking(data);
      } else {
        setError('Rastreamento não disponível');
      }
    } catch (err) {
      setError('Erro ao carregar rastreamento');
    } finally {
      setIsLoading(false);
    }
  }, [fetchTracking]);

  useEffect(() => {
    if (open) {
      loadTracking();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadTracking, 30000);
      return () => clearInterval(interval);
    }
  }, [open, loadTracking]);

  const formatEta = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) return '--';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Rastreamento - Pedido #{orderDisplayId}
          </DialogTitle>
          <DialogDescription>
            Acompanhe a localização do entregador em tempo real
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Driver Info */}
          {driverName && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{driverName}</p>
                {driverPhone && (
                  <p className="text-sm text-muted-foreground">{driverPhone}</p>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !tracking && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-2" />
              <p>Carregando rastreamento...</p>
            </div>
          )}

          {/* Error State */}
          {error && !tracking && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadTracking}>
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Tracking Data */}
          {tracking?.available && (
            <>
              {/* Map placeholder - could integrate with real map */}
              <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {tracking.latitude && tracking.longitude ? (
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-primary mx-auto mb-2 animate-bounce" />
                      <p className="text-sm text-muted-foreground">
                        {tracking.latitude.toFixed(6)}, {tracking.longitude.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aguardando localização...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ETA Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <Package className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Coleta em</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatEta(tracking.pickupEtaStart)}
                  </p>
                </div>

                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <Truck className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xs text-muted-foreground">Entrega em</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatEta(tracking.deliveryEtaEnd)}
                  </p>
                </div>
              </div>

              {/* Expected delivery */}
              {tracking.expectedDelivery && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Previsão: {formatTime(tracking.expectedDelivery)}</span>
                </div>
              )}

              {/* Last update */}
              {tracking.trackDate && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Última atualização: {formatTime(tracking.trackDate)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadTracking}
                    disabled={isLoading}
                    className="h-auto py-1"
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                    Atualizar
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Not available yet */}
          {tracking && !tracking.available && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Navigation className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-center">
                Rastreamento ainda não disponível.
                <br />
                <span className="text-sm">Aguarde o entregador ser atribuído.</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
