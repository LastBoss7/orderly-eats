import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Search, Bike, Package, PlusCircle, LayoutGrid, Users, RefreshCw, LogOut } from 'lucide-react';
import { Table, Tab, Waiter } from '../types';
import { TableCard, TabCard, WaiterHeader } from '../components';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';

interface TablesViewProps {
  waiter: Waiter;
  restaurantName: string;
  tables: Table[];
  tabs: Tab[];
  tableReadyOrders: Record<string, boolean>;
  onTableClick: (table: Table) => void;
  onTabClick: (tab: Tab) => void;
  onStartDelivery: () => void;
  onStartTakeaway: () => void;
  onCreateTab: () => void;
  onLogout: () => void;
}

export function TablesView({
  waiter,
  restaurantName,
  tables,
  tabs,
  tableReadyOrders,
  onTableClick,
  onTabClick,
  onStartDelivery,
  onStartTakeaway,
  onCreateTab,
  onLogout,
}: TablesViewProps) {
  const [activeTab, setActiveTab] = useState<'mesas' | 'comandas'>('mesas');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTables = tables.filter(t => {
    if (!searchTerm) return true;
    return t.number.toString().includes(searchTerm) ||
           `Mesa ${t.number}`.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredTabs = tabs.filter(t => {
    if (!searchTerm) return true;
    return t.number.toString().includes(searchTerm) ||
           t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
            <img src={logoGamakoWhite} alt="Gamako" className="h-6 object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold">{restaurantName}</h1>
            <p className="text-xs text-primary-foreground/70">{waiter.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 h-12 gap-2"
            onClick={onStartDelivery}
          >
            <Bike className="w-4 h-4" />
            Delivery
          </Button>
          <Button
            variant="secondary"
            className="flex-1 h-12 gap-2"
            onClick={onStartTakeaway}
          >
            <Package className="w-4 h-4" />
            Retirada
          </Button>
        </div>
      </header>

      {/* Tabs Toggle */}
      <div className="flex p-3 gap-2 bg-muted/50">
        <Button
          variant={activeTab === 'mesas' ? 'default' : 'outline'}
          className="flex-1 h-10 gap-2"
          onClick={() => setActiveTab('mesas')}
        >
          <LayoutGrid className="w-4 h-4" />
          Mesas ({tables.filter(t => t.status !== 'available').length}/{tables.length})
        </Button>
        <Button
          variant={activeTab === 'comandas' ? 'default' : 'outline'}
          className="flex-1 h-10 gap-2"
          onClick={() => setActiveTab('comandas')}
        >
          <Users className="w-4 h-4" />
          Comandas ({tabs.filter(t => t.status === 'occupied').length})
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'mesas' ? 'Buscar mesa...' : 'Buscar comanda...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-3 pb-3">
        {activeTab === 'mesas' ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                hasReadyOrders={tableReadyOrders[table.id]}
                onClick={() => onTableClick(table)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full h-14 border-dashed gap-2"
              onClick={onCreateTab}
            >
              <PlusCircle className="w-5 h-5" />
              Nova Comanda
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {filteredTabs.map((tab) => (
                <TabCard
                  key={tab.id}
                  tab={tab}
                  onClick={() => onTabClick(tab)}
                />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}
