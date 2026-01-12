import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight,
  ArrowLeft,
  Plus,
  MoreVertical,
  LayoutGrid,
  Edit,
  Trash2,
  Users,
  GripVertical,
  Save,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string;
  sort_order: number;
}

interface SortableTableProps {
  table: Table;
  onRemove: (id: string, number: number) => void;
}

function SortableTable({ table, onRemove }: SortableTableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: table.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'border-success bg-success/5';
      case 'occupied':
        return 'border-destructive bg-destructive/5';
      case 'closing':
        return 'border-warning bg-warning/5';
      default:
        return 'border-border';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      available: { label: 'Livre', variant: 'default' },
      occupied: { label: 'Ocupada', variant: 'destructive' },
      closing: { label: 'Fechando', variant: 'secondary' },
    };
    const config = statusConfig[status] || statusConfig.available;
    return <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-card border-2 rounded-xl p-4 transition-all ${getStatusColor(table.status)} ${
        isDragging ? 'shadow-2xl scale-105 cursor-grabbing' : 'hover:shadow-lg cursor-grab'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Menu */}
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onRemove(table.id, table.number)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table Content */}
      <div className="flex flex-col items-center justify-center pt-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-2xl mb-2">
          {table.number}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Users className="w-3 h-3" />
          <span>{table.capacity}</span>
        </div>
        {getStatusBadge(table.status)}
      </div>
    </div>
  );
}

function TableDragOverlay({ table }: { table: Table | null }) {
  if (!table) return null;

  return (
    <div className="bg-card border-2 border-primary rounded-xl p-4 shadow-2xl scale-105">
      <div className="flex flex-col items-center justify-center pt-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-2xl mb-2">
          {table.number}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Users className="w-3 h-3" />
          <span>{table.capacity}</span>
        </div>
        <Badge variant="default" className="text-[10px]">Arrastando...</Badge>
      </div>
    </div>
  );
}

export default function TableLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [newTable, setNewTable] = useState({ number: '', capacity: '4' });
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTable, setActiveTable] = useState<Table | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTables();
  }, [restaurant?.id]);

  const fetchTables = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const table = tables.find(t => t.id === event.active.id);
    setActiveTable(table || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTable(null);

    if (over && active.id !== over.id) {
      setTables((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        setHasChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveLayout = async () => {
    try {
      // Update sort_order for each table based on current position
      const updates = tables.map((table, index) => 
        supabase
          .from('tables')
          .update({ sort_order: index })
          .eq('id', table.id)
      );

      await Promise.all(updates);

      toast({
        title: 'Layout salvo',
        description: 'A organização das mesas foi salva com sucesso.',
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar layout',
        description: error.message,
      });
    }
  };

  const handleAddTable = async () => {
    if (!newTable.number) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Número da mesa é obrigatório.',
      });
      return;
    }

    try {
      // Get the next sort_order value
      const nextSortOrder = tables.length > 0 
        ? Math.max(...tables.map(t => t.sort_order || 0)) + 1 
        : 0;

      const { error } = await supabase
        .from('tables')
        .insert({
          restaurant_id: restaurant?.id,
          number: parseInt(newTable.number),
          capacity: parseInt(newTable.capacity),
          status: 'available',
          sort_order: nextSortOrder,
        });

      if (error) throw error;

      setNewTable({ number: '', capacity: '4' });
      setIsDialogOpen(false);
      fetchTables();

      toast({
        title: 'Mesa adicionada',
        description: `Mesa ${newTable.number} foi criada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  const removeTable = async (id: string, number: number) => {
    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchTables();
      toast({
        title: 'Mesa removida',
        description: `Mesa ${number} foi removida.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span 
            className="cursor-pointer hover:text-foreground"
            onClick={() => navigate('/salon-settings')}
          >
            Gestão do Salão
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Layout de Mesas</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/salon-settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Layout de Mesas</h1>
            <p className="text-muted-foreground">
              Arraste as mesas para organizar o layout do seu salão
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={handleSaveLayout} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar Layout
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant={hasChanges ? 'outline' : 'default'} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Mesa</DialogTitle>
                  <DialogDescription>
                    Configure os detalhes da nova mesa.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-number">Número da Mesa *</Label>
                    <Input
                      id="table-number"
                      type="number"
                      placeholder="Ex: 1, 2, 3..."
                      value={newTable.number}
                      onChange={(e) => setNewTable(prev => ({ ...prev, number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table-capacity">Capacidade</Label>
                    <Select 
                      value={newTable.capacity} 
                      onValueChange={(value) => setNewTable(prev => ({ ...prev, capacity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 pessoas</SelectItem>
                        <SelectItem value="4">4 pessoas</SelectItem>
                        <SelectItem value="6">6 pessoas</SelectItem>
                        <SelectItem value="8">8 pessoas</SelectItem>
                        <SelectItem value="10">10 pessoas</SelectItem>
                        <SelectItem value="12">12 pessoas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddTable}>
                    Adicionar Mesa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Instructions Banner */}
        {tables.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-center gap-3">
            <GripVertical className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Dica:</span> Arraste as mesas pelo ícone 
              <GripVertical className="w-4 h-4 inline mx-1" /> 
              para reorganizar o layout do seu salão.
            </p>
          </div>
        )}

        {/* Tables Grid with DnD */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : tables.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tables.map(t => t.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.map((table) => (
                  <SortableTable
                    key={table.id}
                    table={table}
                    onRemove={removeTable}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              <TableDragOverlay table={activeTable} />
            </DragOverlay>
          </DndContext>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <LayoutGrid className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhuma mesa cadastrada</h3>
              <p className="text-muted-foreground mb-4">
                Adicione mesas para organizar o layout do seu salão.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar primeira mesa
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {tables.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold">Resumo do Salão</h3>
                  <p className="text-sm text-muted-foreground">
                    {tables.length} mesas • Capacidade total: {tables.reduce((sum, t) => sum + t.capacity, 0)} pessoas
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span>Livres: {tables.filter(t => t.status === 'available').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span>Ocupadas: {tables.filter(t => t.status === 'occupied').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span>Fechando: {tables.filter(t => t.status === 'closing').length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
