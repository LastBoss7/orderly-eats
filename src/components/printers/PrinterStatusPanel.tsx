import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Wifi,
  WifiOff,
  Printer,
  RefreshCw,
  Trash2,
  TestTube2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Monitor,
} from 'lucide-react';

interface PrintLog {
  id: string;
  order_id: string | null;
  event_type: string;
  status: string;
  printer_name: string | null;
  error_message: string | null;
  order_number: string | null;
  items_count: number;
  created_at: string;
}

interface AvailablePrinter {
  id: string;
  printer_name: string;
  display_name: string | null;
  is_default: boolean | null;
  last_seen_at: string;
}

export function PrinterStatusPanel() {
  const { profile, restaurant } = useAuth();
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch print logs
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ['printer-status-logs', profile?.restaurant_id],
    queryFn: async () => {
      if (!profile?.restaurant_id) return [];
      
      const { data, error } = await supabase
        .from('print_logs')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as PrintLog[];
    },
    enabled: !!profile?.restaurant_id,
    refetchInterval: 5000,
  });

  // Fetch available printers (from Electron app)
  const { data: availablePrinters } = useQuery({
    queryKey: ['available-printers', profile?.restaurant_id],
    queryFn: async () => {
      if (!profile?.restaurant_id) return [];
      
      const { data, error } = await supabase
        .from('available_printers')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;
      return data as AvailablePrinter[];
    },
    enabled: !!profile?.restaurant_id,
    refetchInterval: 10000,
  });

  // Check if connected (printers seen in last 2 minutes)
  const isConnected = availablePrinters?.some(p => {
    const lastSeen = new Date(p.last_seen_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    return diffMinutes < 2;
  }) || false;

  // Today's stats
  const todayStats = logs?.reduce((acc, log) => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    if (
      logDate.getDate() === today.getDate() &&
      logDate.getMonth() === today.getMonth() &&
      logDate.getFullYear() === today.getFullYear()
    ) {
      if (log.status === 'success') acc.success++;
      if (log.status === 'failed') acc.failed++;
      acc.total++;
    }
    return acc;
  }, { total: 0, success: 0, failed: 0 }) || { total: 0, success: 0, failed: 0 };

  // Realtime subscription
  useEffect(() => {
    if (!profile?.restaurant_id) return;

    const channel = supabase
      .channel('printer-status-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_logs',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        () => {
          refetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.restaurant_id, refetchLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs?.length]);

  const handleCopyRestaurantId = async () => {
    if (!profile?.restaurant_id) return;
    try {
      await navigator.clipboard.writeText(profile.restaurant_id);
      setCopied(true);
      toast.success('ID copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleTestPrint = async () => {
    toast.info('Enviando teste de impressão...');
    // Create a test print log
    if (!profile?.restaurant_id) return;
    
    await supabase.from('print_logs').insert({
      restaurant_id: profile.restaurant_id,
      event_type: 'test',
      status: 'pending',
      printer_name: 'Teste',
      order_number: 'TESTE',
      items_count: 1,
    });
    
    toast.success('Teste enviado! Verifique o aplicativo de impressão.');
  };

  const handleClearPending = async () => {
    if (!profile?.restaurant_id) return;
    
    // Clear pending print logs
    const { error } = await supabase
      .from('print_logs')
      .update({ status: 'cancelled' })
      .eq('restaurant_id', profile.restaurant_id)
      .eq('status', 'pending');
    
    if (error) {
      toast.error('Erro ao limpar pendentes');
    } else {
      toast.success('Pendentes limpos!');
      refetchLogs();
    }
  };

  const handleReconnect = () => {
    toast.info('O aplicativo Electron irá reconectar automaticamente...');
    refetchLogs();
  };

  const getLogIcon = (status: string, eventType: string) => {
    if (eventType === 'test') return <TestTube2 className="w-3 h-3" />;
    if (status === 'success') return <CheckCircle2 className="w-3 h-3 text-success" />;
    if (status === 'failed') return <XCircle className="w-3 h-3 text-destructive" />;
    return <Clock className="w-3 h-3 text-warning" />;
  };

  const getLogColor = (status: string) => {
    if (status === 'success') return 'text-success';
    if (status === 'failed') return 'text-destructive';
    if (status === 'pending') return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Header Status Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-6 h-6 text-primary" />
                <div>
                  <h2 className="font-semibold text-lg">
                    Impressora Automática - {restaurant?.name || 'Restaurante'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sistema de impressão automática de pedidos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                isConnected 
                  ? 'bg-success/20 text-success' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {isConnected ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                    </span>
                    <span className="text-sm font-medium">Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Desconectado</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-foreground">{todayStats.success}</div>
              <div className="text-sm text-muted-foreground">Impressos hoje</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-destructive">{todayStats.failed}</div>
              <div className="text-sm text-muted-foreground">Falhas hoje</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">{todayStats.total}</div>
              <div className="text-sm text-muted-foreground">Total hoje</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant="outline" size="sm" onClick={handleTestPrint}>
              <TestTube2 className="w-4 h-4 mr-2" />
              Testar Impressão
            </Button>
            <Button variant="outline" size="sm" onClick={handleReconnect}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconectar
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearPending}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Pendentes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyRestaurantId}
              className="ml-auto"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                  ID Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar ID
                </>
              )}
            </Button>
          </div>

          {/* Connected Printers */}
          {availablePrinters && availablePrinters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Impressoras Detectadas
              </h3>
              <div className="flex flex-wrap gap-2">
                {availablePrinters.map((printer) => {
                  const lastSeen = new Date(printer.last_seen_at);
                  const now = new Date();
                  const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
                  const isActive = diffMinutes < 2;
                  
                  return (
                    <Badge 
                      key={printer.id} 
                      variant={isActive ? 'default' : 'secondary'}
                      className={isActive ? 'bg-success/20 text-success border-success/30' : ''}
                    >
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-success mr-2"></span>
                      )}
                      {printer.display_name || printer.printer_name}
                      {printer.is_default && ' (Padrão)'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logs Console */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Logs do Sistema
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchLogs()}
                className="h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Atualizar
              </Button>
            </div>
            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              <ScrollArea className="h-[300px]">
                <div className="p-3 font-mono text-xs space-y-1">
                  {logs?.slice().reverse().map((log) => (
                    <div 
                      key={log.id} 
                      className={`flex items-start gap-2 py-0.5 ${getLogColor(log.status)}`}
                    >
                      <span className="text-slate-500 shrink-0">
                        [{format(new Date(log.created_at), 'HH:mm:ss')}]
                      </span>
                      {getLogIcon(log.status, log.event_type)}
                      <span className="break-all">
                        {log.event_type === 'test' && 'Teste de impressão'}
                        {log.event_type === 'print' && `Pedido #${log.order_number || log.order_id?.slice(0, 8)}`}
                        {log.event_type === 'reprint' && `Reimpressão #${log.order_number || log.order_id?.slice(0, 8)}`}
                        {log.event_type === 'auto_print' && `Auto-impressão #${log.order_number || log.order_id?.slice(0, 8)}`}
                        {' - '}
                        {log.status === 'success' && 'Impresso com sucesso'}
                        {log.status === 'failed' && (log.error_message || 'Falha na impressão')}
                        {log.status === 'pending' && 'Aguardando impressão...'}
                        {log.status === 'cancelled' && 'Cancelado'}
                        {log.printer_name && ` (${log.printer_name})`}
                      </span>
                    </div>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <div className="text-slate-500 text-center py-8">
                      Nenhum log de impressão ainda.
                      <br />
                      <span className="text-slate-600">
                        Os logs aparecerão aqui quando o sistema de impressão estiver em uso.
                      </span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Info Card */}
      {!isConnected && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-500/20">
                <WifiOff className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Aplicativo não conectado</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Para imprimir automaticamente, instale o aplicativo no computador conectado à impressora.
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Baixe e instale o aplicativo de impressão</li>
                  <li>Abra o aplicativo e clique em "Configurações"</li>
                  <li>Cole o ID do restaurante: <code className="px-1 py-0.5 bg-muted rounded text-xs">{profile?.restaurant_id?.slice(0, 12)}...</code></li>
                  <li>Clique em "Salvar" e "Reconectar"</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
