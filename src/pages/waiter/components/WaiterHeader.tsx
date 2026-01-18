import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, MoreVertical } from 'lucide-react';
import logoAppGarcom from '@/assets/logo-app-garcom.png';
import { Waiter } from '../types';

interface WaiterHeaderProps {
  title: string;
  subtitle?: string;
  waiter?: Waiter | null;
  showBack?: boolean;
  showLogout?: boolean;
  onBack?: () => void;
  onLogout?: () => void;
  rightElement?: React.ReactNode;
}

export function WaiterHeader({
  title,
  subtitle,
  waiter,
  showBack,
  showLogout,
  onBack,
  onLogout,
  rightElement,
}: WaiterHeaderProps) {
  return (
    <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 shadow-md">
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        {!showBack && (
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center overflow-hidden">
            <img src={logoAppGarcom} alt="App do Garçom" className="h-9 object-contain" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-primary-foreground/70 truncate">{subtitle}</p>
          )}
        </div>
        
        {rightElement}
        
        {showLogout && onLogout && (
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
