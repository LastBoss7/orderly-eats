import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Eye, Printer, DollarSign, PlusCircle } from 'lucide-react';
import { Table, formatCurrency } from '../types';

interface TableActionModalProps {
  table: Table;
  total: number;
  onViewOrders: () => void;
  onPrintReceipt: () => void;
  onCloseTable: () => void;
  onNewOrder: () => void;
  onClose: () => void;
}

export function TableActionModal({
  table,
  total,
  onViewOrders,
  onPrintReceipt,
  onCloseTable,
  onNewOrder,
  onClose,
}: TableActionModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card w-full max-w-md rounded-t-3xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="text-xl font-bold text-foreground">Mesa {table.number}</h3>
              <span className="text-muted-foreground text-sm">Total: </span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Actions */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
            className="p-4 space-y-2"
          >
            <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
              <Button 
                variant="outline" 
                className="w-full h-12 justify-start gap-3"
                onClick={onViewOrders}
              >
                <Eye className="w-4 h-4" />
                Ver pedidos
              </Button>
            </motion.div>
            
            <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
              <Button 
                variant="outline" 
                className="w-full h-12 justify-start gap-3"
                onClick={onPrintReceipt}
              >
                <Printer className="w-4 h-4" />
                Imprimir conferência
              </Button>
            </motion.div>
            
            <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
              <Button 
                variant="outline" 
                className="w-full h-12 justify-start gap-3"
                onClick={onCloseTable}
              >
                <DollarSign className="w-4 h-4" />
                Fechar conta
              </Button>
            </motion.div>
            
            <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
              <Button 
                className="w-full h-12 justify-start gap-3"
                onClick={onNewOrder}
              >
                <PlusCircle className="w-4 h-4" />
                Novo pedido
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
