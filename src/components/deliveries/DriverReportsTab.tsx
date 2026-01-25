import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bike, 
  DollarSign, 
  Package, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  FileDown,
  User
} from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  customer_name: string | null;
  status: string | null;
  total: number | null;
  delivery_fee: number | null;
  created_at: string;
  delivery_address: string | null;
  delivery_phone: string | null;
  driver_id: string | null;
  order_items?: { product_name: string; quantity: number; product_price: number }[];
}

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  status: string | null;
}

interface DriverReportsTabProps {
  orders: Order[];
  drivers: DeliveryDriver[];
}

type TimeFilter = 'today' | '3days' | '7days' | '14days' | '30days';

export function DriverReportsTab({ orders, drivers }: DriverReportsTabProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const { exportToExcel, exportToPDF } = useReportExport();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM HH:mm", { locale: ptBR });
  };

  const formatFullDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Filter orders by time
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const daysMap: Record<TimeFilter, number> = {
      today: 0,
      '3days': 3,
      '7days': 7,
      '14days': 14,
      '30days': 30
    };
    
    const daysAgo = daysMap[timeFilter];
    const startDate = daysAgo === 0 ? startOfDay(now) : startOfDay(subDays(now, daysAgo));
    const endDate = endOfDay(now);

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return isWithinInterval(orderDate, { start: startDate, end: endDate }) && 
             order.status === 'delivered' &&
             order.driver_id;
    });
  }, [orders, timeFilter]);

  // Calculate stats per driver
  const driverStats = useMemo(() => {
    const stats: Record<string, {
      driver: DeliveryDriver;
      deliveryCount: number;
      totalFees: number;
      totalOrders: number;
      orders: Order[];
    }> = {};

    // Initialize all drivers
    drivers.forEach(driver => {
      stats[driver.id] = {
        driver,
        deliveryCount: 0,
        totalFees: 0,
        totalOrders: 0,
        orders: []
      };
    });

    // Aggregate orders
    filteredOrders.forEach(order => {
      if (order.driver_id && stats[order.driver_id]) {
        stats[order.driver_id].deliveryCount += 1;
        stats[order.driver_id].totalFees += order.delivery_fee || 0;
        stats[order.driver_id].totalOrders += order.total || 0;
        stats[order.driver_id].orders.push(order);
      }
    });

    return Object.values(stats).sort((a, b) => b.deliveryCount - a.deliveryCount);
  }, [filteredOrders, drivers]);

  // Total summary
  const totals = useMemo(() => {
    return driverStats.reduce(
      (acc, stat) => ({
        deliveries: acc.deliveries + stat.deliveryCount,
        fees: acc.fees + stat.totalFees,
        orders: acc.orders + stat.totalOrders
      }),
      { deliveries: 0, fees: 0, orders: 0 }
    );
  }, [driverStats]);

  const toggleDriver = (driverId: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  const getTimeFilterLabel = (filter: TimeFilter) => {
    const labels: Record<TimeFilter, string> = {
      today: 'Hoje',
      '3days': 'Últimos 3 dias',
      '7days': 'Últimos 7 dias',
      '14days': 'Últimos 14 dias',
      '30days': 'Últimos 30 dias'
    };
    return labels[filter];
  };

  const handleExportExcel = () => {
    const data = driverStats
      .filter(stat => stat.deliveryCount > 0)
      .map(stat => ({
        motoboy: stat.driver.name,
        telefone: stat.driver.phone || '-',
        entregas: stat.deliveryCount,
        total_taxas: formatCurrency(stat.totalFees),
        total_pedidos: formatCurrency(stat.totalOrders),
        media_por_entrega: stat.deliveryCount > 0 
          ? formatCurrency(stat.totalFees / stat.deliveryCount) 
          : formatCurrency(0)
      }));

    exportToExcel({
      title: 'Relatório de Motoboys',
      subtitle: getTimeFilterLabel(timeFilter),
      filename: `relatorio-motoboys-${timeFilter}`,
      columns: [
        { header: 'Motoboy', key: 'motoboy', width: 25 },
        { header: 'Telefone', key: 'telefone', width: 15 },
        { header: 'Entregas', key: 'entregas', width: 10 },
        { header: 'Total Taxas', key: 'total_taxas', width: 15 },
        { header: 'Total Pedidos', key: 'total_pedidos', width: 15 },
        { header: 'Média/Entrega', key: 'media_por_entrega', width: 15 }
      ],
      data,
      summaryData: [
        { label: 'Total de Entregas', value: totals.deliveries.toString() },
        { label: 'Total em Taxas', value: formatCurrency(totals.fees) },
        { label: 'Total em Pedidos', value: formatCurrency(totals.orders) }
      ]
    });
  };

  const handleExportPDF = () => {
    const data = driverStats
      .filter(stat => stat.deliveryCount > 0)
      .map(stat => ({
        motoboy: stat.driver.name,
        telefone: stat.driver.phone || '-',
        entregas: stat.deliveryCount,
        total_taxas: formatCurrency(stat.totalFees),
        total_pedidos: formatCurrency(stat.totalOrders),
        media_por_entrega: stat.deliveryCount > 0 
          ? formatCurrency(stat.totalFees / stat.deliveryCount) 
          : formatCurrency(0)
      }));

    exportToPDF({
      title: 'Relatório de Motoboys',
      subtitle: getTimeFilterLabel(timeFilter),
      filename: `relatorio-motoboys-${timeFilter}`,
      columns: [
        { header: 'Motoboy', key: 'motoboy', width: 25 },
        { header: 'Telefone', key: 'telefone', width: 15 },
        { header: 'Entregas', key: 'entregas', width: 10 },
        { header: 'Total Taxas', key: 'total_taxas', width: 15 },
        { header: 'Total Pedidos', key: 'total_pedidos', width: 15 },
        { header: 'Média/Entrega', key: 'media_por_entrega', width: 15 }
      ],
      data,
      summaryData: [
        { label: 'Total de Entregas', value: totals.deliveries.toString() },
        { label: 'Total em Taxas', value: formatCurrency(totals.fees) },
        { label: 'Total em Pedidos', value: formatCurrency(totals.orders) }
      ]
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="3days">Últimos 3 dias</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="14days">Últimos 14 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Entregas Realizadas
            </CardDescription>
            <CardTitle className="text-2xl">{totals.deliveries}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              Motoboys Ativos
            </CardDescription>
            <CardTitle className="text-2xl">
              {driverStats.filter(s => s.deliveryCount > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-success/10 border-success/30">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-success">
              <DollarSign className="w-4 h-4" />
              Total em Taxas
            </CardDescription>
            <CardTitle className="text-2xl text-success">{formatCurrency(totals.fees)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total em Pedidos
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.orders)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Driver list with expandable orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bike className="w-5 h-5" />
            Relatório por Motoboy
          </CardTitle>
          <CardDescription>
            Clique em um motoboy para ver os pedidos detalhados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {driverStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bike className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhum motoboy cadastrado</h3>
              <p className="text-muted-foreground">Cadastre motoboys nas configurações de delivery</p>
            </div>
          ) : (
            <div className="divide-y">
              {driverStats.map(stat => (
                <Collapsible
                  key={stat.driver.id}
                  open={expandedDrivers.has(stat.driver.id)}
                  onOpenChange={() => toggleDriver(stat.driver.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <Bike className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {stat.driver.name}
                            {stat.driver.phone && (
                              <span className="text-xs text-muted-foreground">
                                ({stat.driver.phone})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {stat.deliveryCount} entregas
                            </span>
                            {stat.driver.vehicle_type && (
                              <Badge variant="outline" className="text-xs">
                                {stat.driver.vehicle_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Taxas</div>
                          <div className="font-semibold text-success">
                            {formatCurrency(stat.totalFees)}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-sm text-muted-foreground">Pedidos</div>
                          <div className="font-medium">
                            {formatCurrency(stat.totalOrders)}
                          </div>
                        </div>
                        {expandedDrivers.has(stat.driver.id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    {stat.orders.length === 0 ? (
                      <div className="px-4 pb-4 text-center text-muted-foreground py-6">
                        Nenhuma entrega no período selecionado
                      </div>
                    ) : (
                      <div className="px-4 pb-4">
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs">Data/Hora</TableHead>
                                <TableHead className="text-xs">Cliente</TableHead>
                                <TableHead className="text-xs hidden md:table-cell">Endereço</TableHead>
                                <TableHead className="text-xs text-right">Taxa</TableHead>
                                <TableHead className="text-xs text-right">Valor Pedido</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stat.orders.map(order => (
                                <TableRow key={order.id} className="hover:bg-muted/50">
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-muted-foreground" />
                                      {formatDate(order.created_at)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <span className="font-medium text-sm">
                                        {order.customer_name || 'Cliente'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex items-start gap-1 max-w-xs">
                                      <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                      <span className="text-xs text-muted-foreground line-clamp-2">
                                        {order.delivery_address || '-'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="secondary" className="bg-success/20 text-success border-0">
                                      {formatCurrency(order.delivery_fee || 0)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-sm">
                                    {formatCurrency(order.total || 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* Summary row for this driver */}
                        <div className="flex justify-end gap-6 mt-3 px-2 text-sm">
                          <div className="text-muted-foreground">
                            Média por entrega: 
                            <span className="font-medium text-foreground ml-2">
                              {stat.deliveryCount > 0 
                                ? formatCurrency(stat.totalFees / stat.deliveryCount) 
                                : formatCurrency(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
