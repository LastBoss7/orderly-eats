import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancellationReason {
  code: string;
  description: string;
}

// Default reasons if API doesn't return any
const DEFAULT_REASONS: CancellationReason[] = [
  { code: '501', description: 'Problemas de sistema' },
  { code: '502', description: 'Pedido em duplicidade' },
  { code: '503', description: 'Item indisponível' },
  { code: '504', description: 'Restaurante sem motoboy' },
  { code: '505', description: 'Cardápio desatualizado' },
  { code: '506', description: 'Pedido fora da área de entrega' },
  { code: '507', description: 'Cliente golpista / trote' },
  { code: '508', description: 'Fora do horário do delivery' },
  { code: '509', description: 'Dificuldades internas do restaurante' },
  { code: '511', description: 'Área de risco' },
  { code: '512', description: 'Restaurante abrirá mais tarde' },
];

interface IFoodCancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (code: string, reason?: string) => Promise<void>;
  fetchReasons: () => Promise<CancellationReason[]>;
  orderDisplayId: string;
}

export function IFoodCancelModal({
  open,
  onOpenChange,
  onConfirm,
  fetchReasons,
  orderDisplayId,
}: IFoodCancelModalProps) {
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [additionalReason, setAdditionalReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (open) {
      setIsFetching(true);
      fetchReasons()
        .then((data) => {
          setReasons(data.length > 0 ? data : DEFAULT_REASONS);
          if (data.length > 0 || DEFAULT_REASONS.length > 0) {
            setSelectedCode((data.length > 0 ? data : DEFAULT_REASONS)[0].code);
          }
        })
        .finally(() => setIsFetching(false));
    } else {
      // Reset state when modal closes
      setSelectedCode('');
      setAdditionalReason('');
    }
  }, [open, fetchReasons]);

  const handleConfirm = async () => {
    if (!selectedCode) return;
    
    setIsLoading(true);
    try {
      await onConfirm(selectedCode, additionalReason || undefined);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Pedido #{orderDisplayId}
          </DialogTitle>
          <DialogDescription>
            Selecione o motivo do cancelamento. Esta ação pode resultar em penalidades se usada com frequência.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedCode} onValueChange={setSelectedCode}>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {reasons.map((reason) => (
                  <div 
                    key={reason.code} 
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedCode(reason.code)}
                  >
                    <RadioGroupItem value={reason.code} id={reason.code} />
                    <Label 
                      htmlFor={reason.code} 
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="text-muted-foreground mr-2">{reason.code}</span>
                      {reason.description}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="additionalReason">Observações adicionais (opcional)</Label>
              <Textarea
                id="additionalReason"
                placeholder="Detalhes sobre o cancelamento..."
                value={additionalReason}
                onChange={(e) => setAdditionalReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isLoading || !selectedCode}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              'Confirmar Cancelamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
