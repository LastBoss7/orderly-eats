import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share, Plus, X, Smartphone } from 'lucide-react';
import logoAppGarcom from '@/assets/logo-app-garcom.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    // Check if already installed
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // Show again after 24 hours
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setDismissed(true);
  };

  // Don't show if installed or dismissed
  if (isInstalled || dismissed) return null;

  // iOS instructions modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-card rounded-t-3xl w-full max-w-md p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Instalar App</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowIOSInstructions(false)}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex justify-center">
            <img 
              src={logoAppGarcom} 
              alt="App do Garçom" 
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-foreground">Toque no botão</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Share className="w-5 h-5" />
                  <span>Compartilhar</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-foreground">Role e toque em</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Plus className="w-5 h-5" />
                  <span>Adicionar à Tela Inicial</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="text-foreground">Toque em</p>
                <span className="text-primary font-medium">Adicionar</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowIOSInstructions(false)}
          >
            Entendi
          </Button>
        </div>
      </div>
    );
  }

  // Show install banner
  if (deferredPrompt || isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-300">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-4">
            <img 
              src={logoAppGarcom} 
              alt="App do Garçom" 
              className="w-14 h-14 rounded-xl shadow"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground truncate">App do Garçom</h3>
              <p className="text-sm text-muted-foreground">Instale para acesso rápido</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                onClick={isIOS ? () => setShowIOSInstructions(true) : handleInstall}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Instalar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
