import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bike, 
  Package, 
  Plus,
  Users, 
  ClipboardList,
  LogOut,
  User,
  Loader2,
  X,
} from 'lucide-react';
import { Table, Tab, Waiter } from '../types';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';

interface TablesViewRefactoredProps {
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
  // Tab customer modal
  showTabCustomerModal: boolean;
  pendingTab: Tab | null;
  tabCustomerName: string;
  tabCustomerPhone: string;
  savingTabCustomer: boolean;
  onTabCustomerNameChange: (value: string) => void;
  onTabCustomerPhoneChange: (value: string) => void;
  onSaveTabCustomer: () => void;
  onCloseTabCustomerModal: () => void;
  // Create tab modal
  showCreateTabModal: boolean;
  newTabCustomerName: string;
  newTabCustomerPhone: string;
  creatingTab: boolean;
  onNewTabCustomerNameChange: (value: string) => void;
  onNewTabCustomerPhoneChange: (value: string) => void;
  onCreateNewTab: () => void;
  onCloseCreateTabModal: () => void;
}

export function TablesViewRefactored({
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
  showTabCustomerModal,
  pendingTab,
  tabCustomerName,
  tabCustomerPhone,
  savingTabCustomer,
  onTabCustomerNameChange,
  onTabCustomerPhoneChange,
  onSaveTabCustomer,
  onCloseTabCustomerModal,
  showCreateTabModal,
  newTabCustomerName,
  newTabCustomerPhone,
  creatingTab,
  onNewTabCustomerNameChange,
  onNewTabCustomerPhoneChange,
  onCreateNewTab,
  onCloseCreateTabModal,
}: TablesViewRefactoredProps) {
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
      <header className="sticky top-0 bg-primary text-primary-foreground z-10 shadow-lg">
        <div className="flex items-center gap-3 p-4 pb-2">
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

        {/* Tabs Toggle */}
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`flex-1 py-3 text-center font-semibold transition-all relative ${
              activeTab === 'mesas' 
                ? 'text-primary-foreground' 
                : 'text-primary-foreground/60 hover:text-primary-foreground/80'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Mesas ({tables.filter(t => t.status !== 'available').length}/{tables.length})
            </span>
            {activeTab === 'mesas' && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary-foreground rounded-full" 
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('comandas')}
            className={`flex-1 py-3 text-center font-semibold transition-all relative ${
              activeTab === 'comandas' 
                ? 'text-primary-foreground' 
                : 'text-primary-foreground/60 hover:text-primary-foreground/80'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Comandas ({tabs.filter(t => t.status === 'occupied').length})
            </span>
            {activeTab === 'comandas' && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary-foreground rounded-full" 
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="flex gap-2 p-3 bg-muted/50 border-b">
        <Button
          variant="outline"
          className="flex-1 h-12 gap-2"
          onClick={onStartDelivery}
        >
          <Bike className="w-4 h-4" />
          Delivery
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12 gap-2"
          onClick={onStartTakeaway}
        >
          <Package className="w-4 h-4" />
          Retirada
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-background">
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

      {/* Legend */}
      <div className="px-4 py-2 flex items-center justify-center gap-6 text-xs border-b">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Livre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">Ocupada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Fechando</span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-3 pb-3">
        {activeTab === 'mesas' ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
            }}
            className="py-3 grid grid-cols-3 gap-2"
          >
            {filteredTables.map((table) => {
              const hasReadyOrder = tableReadyOrders[table.id];
              
              return (
                <motion.button
                  key={table.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.9 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTableClick(table)}
                  className={`relative rounded-xl p-3 min-h-[80px] flex flex-col justify-between text-left shadow-md ${
                    table.status === 'available' 
                      ? 'bg-emerald-500 text-white' 
                      : table.status === 'closing' 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-rose-500 text-white'
                  }`}
                >
                  <span className="font-bold text-sm">Mesa {table.number}</span>
                  {hasReadyOrder && (
                    <Badge className="bg-white text-emerald-700 text-[10px] font-bold w-fit">
                      🔔 Pronto!
                    </Badge>
                  )}
                  {table.status === 'available' && (
                    <span className="text-[10px] text-white/80">Disponível</span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
            }}
            className="py-3 grid grid-cols-3 gap-2"
          >
            {/* Create New Tab Button */}
            <motion.button
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.9 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              whileTap={{ scale: 0.95 }}
              onClick={onCreateTab}
              className="rounded-xl p-3 min-h-[80px] flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/40 bg-primary/5"
            >
              <Plus className="w-5 h-5 text-primary mb-1" />
              <span className="font-semibold text-xs text-primary">Nova</span>
            </motion.button>
            
            {filteredTabs.map((tab) => (
              <motion.button
                key={tab.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabClick(tab)}
                className={`relative rounded-xl p-3 min-h-[80px] flex flex-col justify-between text-left shadow-md ${
                  tab.status === 'available' 
                    ? 'bg-emerald-500 text-white' 
                    : tab.status === 'closing' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-rose-500 text-white'
                }`}
              >
                <span className="font-bold text-sm">#{tab.number}</span>
                {tab.customer_name && (
                  <p className="text-[10px] text-white/90 truncate flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {tab.customer_name}
                  </p>
                )}
                {tab.status === 'available' && !tab.customer_name && (
                  <span className="text-[10px] text-white/80">Disponível</span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </ScrollArea>

      {/* Tab Customer Modal */}
      <AnimatePresence>
        {showTabCustomerModal && pendingTab && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onCloseTabCustomerModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold">Comanda #{pendingTab.number}</h3>
                <Button variant="ghost" size="icon" onClick={onCloseTabCustomerModal}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Nome do cliente *</Label>
                  <Input
                    placeholder="Nome"
                    value={tabCustomerName}
                    onChange={(e) => onTabCustomerNameChange(e.target.value)}
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Telefone (opcional)</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={tabCustomerPhone}
                    onChange={(e) => onTabCustomerPhoneChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  className="w-full h-12"
                  onClick={onSaveTabCustomer}
                  disabled={savingTabCustomer || !tabCustomerName.trim()}
                >
                  {savingTabCustomer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Abrir Comanda'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Tab Modal */}
      <AnimatePresence>
        {showCreateTabModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onCloseCreateTabModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold">Nova Comanda</h3>
                <Button variant="ghost" size="icon" onClick={onCloseCreateTabModal}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Nome do cliente *</Label>
                  <Input
                    placeholder="Nome"
                    value={newTabCustomerName}
                    onChange={(e) => onNewTabCustomerNameChange(e.target.value)}
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Telefone (opcional)</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={newTabCustomerPhone}
                    onChange={(e) => onNewTabCustomerPhoneChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  className="w-full h-12"
                  onClick={onCreateNewTab}
                  disabled={creatingTab || !newTabCustomerName.trim()}
                >
                  {creatingTab ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Criar Comanda'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
