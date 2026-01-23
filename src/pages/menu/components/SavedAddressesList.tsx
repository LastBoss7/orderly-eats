import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Star, Check, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  number: string | null;
  complement: string | null;
  neighborhood: string;
  city: string;
  cep: string | null;
  is_default: boolean;
}

interface SavedAddressesListProps {
  addresses: SavedAddress[];
  selectedAddressId: string | null;
  onSelect: (address: SavedAddress) => void;
  onAddNew: () => void;
  onEdit: (address: SavedAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  loading?: boolean;
}

export function SavedAddressesList({
  addresses,
  selectedAddressId,
  onSelect,
  onAddNew,
  onEdit,
  onDelete,
  onSetDefault,
  loading,
}: SavedAddressesListProps) {
  if (addresses.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">
          Nenhum endereço salvo
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddNew}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar endereço
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {addresses.map((addr) => {
        const isSelected = selectedAddressId === addr.id;
        const fullAddress = [
          addr.address,
          addr.number,
          addr.complement,
          addr.neighborhood,
          addr.city,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <div
            key={addr.id}
            className={cn(
              'relative p-3 rounded-xl border transition-all cursor-pointer',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50 active:bg-muted'
            )}
            onClick={() => onSelect(addr)}
          >
            <div className="flex items-start gap-3 pr-16">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{addr.label}</span>
                  {addr.is_default && (
                    <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      Padrão
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {fullAddress}
                </p>
                {addr.cep && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    CEP: {addr.cep}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(addr);
                }}
                title="Editar endereço"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              {!addr.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault(addr.id);
                  }}
                  title="Definir como padrão"
                >
                  <Star className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(addr.id);
                }}
                title="Excluir endereço"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={onAddNew}
        className="w-full gap-2 mt-2"
      >
        <Plus className="w-4 h-4" />
        Novo endereço
      </Button>
    </div>
  );
}
