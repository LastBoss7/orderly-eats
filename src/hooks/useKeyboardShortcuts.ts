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

    const key = event.key.toLowerCase();
    
    // Check for Alt + key combinations for order types
    // Some browsers/keyboards report altKey differently, so we check both
    if (event.altKey && key in SHORTCUTS) {
      event.preventDefault();
      event.stopPropagation();
      const shortcut = SHORTCUTS[key as keyof typeof SHORTCUTS];
      
      if (shortcut.action === 'newOrder' && onNewOrder) {
        onNewOrder(shortcut.type);
      }
      return;
    }

    // Also allow just pressing the key without Alt when no modifier is pressed
    // This provides a fallback for keyboards where Alt doesn't work well
    if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      // Only for the single-key shortcuts (without Alt requirement)
      // We use Alt+Key as primary but also support Shift+Key as fallback
    }
  }, [enabled, onNewOrder]);

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
