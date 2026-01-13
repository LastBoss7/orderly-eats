import { useEffect, useCallback } from 'react';

type OrderType = 'counter' | 'table' | 'delivery' | 'takeaway';

interface KeyboardShortcutsConfig {
  onNewOrder?: (type?: OrderType) => void;
  onToggleSidebar?: () => void;
  enabled?: boolean;
}

const SHORTCUTS = {
  // New order shortcuts
  'n': { action: 'newOrder', type: undefined as OrderType | undefined, description: 'Novo pedido' },
  'b': { action: 'newOrder', type: 'counter' as OrderType, description: 'Novo pedido balcão' },
  'd': { action: 'newOrder', type: 'delivery' as OrderType, description: 'Novo pedido delivery' },
  'm': { action: 'newOrder', type: 'table' as OrderType, description: 'Novo pedido mesa' },
  'r': { action: 'newOrder', type: 'takeaway' as OrderType, description: 'Novo pedido retirada' },
};

export function useKeyboardShortcuts({
  onNewOrder,
  onToggleSidebar,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Check for Ctrl/Cmd + key combinations
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      
      // Sidebar toggle is handled by the sidebar component itself (Ctrl+B)
      // So we don't need to handle it here
      
      return;
    }

    // Check for Alt + key combinations for order types
    if (event.altKey) {
      const key = event.key.toLowerCase();
      
      if (key in SHORTCUTS) {
        event.preventDefault();
        const shortcut = SHORTCUTS[key as keyof typeof SHORTCUTS];
        
        if (shortcut.action === 'newOrder' && onNewOrder) {
          onNewOrder(shortcut.type);
        }
      }
    }
  }, [enabled, onNewOrder, onToggleSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: SHORTCUTS,
  };
}

// Export shortcut descriptions for help tooltip
export const SHORTCUT_DESCRIPTIONS = [
  { keys: 'Alt + N', description: 'Novo pedido' },
  { keys: 'Alt + B', description: 'Novo pedido balcão' },
  { keys: 'Alt + D', description: 'Novo pedido delivery' },
  { keys: 'Alt + M', description: 'Novo pedido mesa' },
  { keys: 'Alt + R', description: 'Novo pedido retirada' },
  { keys: 'Ctrl + B', description: 'Recolher/expandir menu' },
];
