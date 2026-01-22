import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  CalendarIcon,
  TrendingDown,
  TrendingUp,
  Package,
  AlertTriangle,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity: number;
  created_at: string;
  reason: string | null;
  inventory_items?: {
    name: string;
    unit_name: string;
    category: string | null;
  };
}

interface ConsumptionData {
  name: string;
  consumed: number;
  unit: string;
  category: string | null;
  cost: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
];

export default function ConsumptionReport() {
  const { restaurant } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (!restaurant?.id) return;
    fetchMovements();
  }, [restaurant?.id, dateRange]);

  const fetchMovements = async () => {
    if (!restaurant?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, inventory_items(name, unit_name, category, cost_price)')
        .eq('restaurant_id', restaurant.id)
        .in('movement_type', ['out', 'order_deduction'])
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Erro ao carregar dados de consumo');
    } finally {
      setLoading(false);
    }
  };

  // Aggregate consumption by item
  const consumptionByItem: { [key: string]: ConsumptionData } = {};
  movements.forEach(m => {
    const itemId = m.inventory_item_id;
    const itemName = m.inventory_items?.name || 'Desconhecido';
    
    if (!consumptionByItem[itemId]) {
      consumptionByItem[itemId] = {
        name: itemName,
        consumed: 0,
        unit: m.inventory_items?.unit_name || 'un',
        category: m.inventory_items?.category || null,
        cost: 0,
      };
    }
    consumptionByItem[itemId].consumed += m.quantity;
  });

  const consumptionList = Object.values(consumptionByItem)
    .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
    .sort((a, b) => b.consumed - a.consumed);

  // Get unique categories
  const categories = [...new Set(Object.values(consumptionByItem).map(i => i.category).filter(Boolean))];

  // Chart data - top 10 items
  const topItems = consumptionList.slice(0, 10).map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    fullName: item.name,
    consumo: item.consumed,
    unit: item.unit,
  }));

  // Category breakdown
  const categoryBreakdown: { [key: string]: number } = {};
  consumptionList.forEach(item => {
    const cat = item.category || 'Sem categoria';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + item.consumed;
  });

  const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  // Movement type breakdown
  const movementTypeBreakdown: { [key: string]: number } = {};
  movements.forEach(m => {
    const type = m.movement_type === 'order_deduction' ? 'Pedidos' : m.reason || 'Outros';
    movementTypeBreakdown[type] = (movementTypeBreakdown[type] || 0) + 1;
  });

  const movementTypeData = Object.entries(movementTypeBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Stats
  const totalMovements = movements.length;
  const orderDeductions = movements.filter(m => m.movement_type === 'order_deduction').length;
  const manualExits = movements.filter(m => m.movement_type === 'out').length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatório de Consumo</h1>
            <p className="text-muted-foreground">
              Análise de consumo de insumos por período
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchMovements}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Período:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Categoria:</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  7 dias
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  30 dias
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                >
                  90 dias
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Saídas</p>
                  <p className="text-2xl font-bold">{totalMovements}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Via Pedidos</p>
                  <p className="text-2xl font-bold">{orderDeductions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saídas Manuais</p>
                  <p className="text-2xl font-bold">{manualExits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Itens Consumidos</p>
                  <p className="text-2xl font-bold">{consumptionList.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : movements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum consumo registrado</p>
              <p className="text-muted-foreground">
                Não há movimentações de saída no período selecionado
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top consumed items chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Itens Mais Consumidos</CardTitle>
                <CardDescription>Top 10 insumos por quantidade consumida</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItems} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.fullName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Consumo: {data.consumo.toFixed(2)} {data.unit}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="consumo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Consumo por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Movement type breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Saída</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={movementTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {movementTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Detalhamento por Item</CardTitle>
                <CardDescription>Todos os itens consumidos no período</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Quantidade Consumida</TableHead>
                      <TableHead className="text-right">Unidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionList.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.category ? (
                            <Badge variant="secondary">{item.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.consumed.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
