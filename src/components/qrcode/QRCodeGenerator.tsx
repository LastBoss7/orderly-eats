import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  QrCode, 
  Download, 
  Printer, 
  Palette,
  Maximize2,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeGeneratorProps {
  url: string;
  restaurantName: string;
  logoUrl?: string | null;
}

const colorPresets = [
  { name: 'Padrão', fg: '#000000', bg: '#FFFFFF' },
  { name: 'Primária', fg: '#8B5CF6', bg: '#FFFFFF' },
  { name: 'Azul', fg: '#2563EB', bg: '#FFFFFF' },
  { name: 'Verde', fg: '#16A34A', bg: '#FFFFFF' },
  { name: 'Vermelho', fg: '#DC2626', bg: '#FFFFFF' },
  { name: 'Laranja', fg: '#EA580C', bg: '#FFFFFF' },
  { name: 'Rosa', fg: '#DB2777', bg: '#FFFFFF' },
  { name: 'Invertido', fg: '#FFFFFF', bg: '#000000' },
];

export function QRCodeGenerator({ url, restaurantName, logoUrl }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generate QR Code
  useEffect(() => {
    if (!url) return;

    const generateQR = async () => {
      setGenerating(true);
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: size,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
        toast.error('Erro ao gerar QR Code');
      } finally {
        setGenerating(false);
      }
    };

    generateQR();
  }, [url, size, fgColor, bgColor]);

  // Download QR Code
  const handleDownload = async (format: 'png' | 'svg' = 'png') => {
    if (!url) return;

    try {
      let dataUrl: string;
      let filename: string;

      if (format === 'svg') {
        const svgString = await QRCode.toString(url, {
          type: 'svg',
          width: size,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        });
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        dataUrl = URL.createObjectURL(blob);
        filename = `qrcode-${restaurantName.toLowerCase().replace(/\s+/g, '-')}.svg`;
      } else {
        dataUrl = await QRCode.toDataURL(url, {
          width: Math.max(size, 512), // Minimum 512px for good print quality
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: 'H',
        });
        filename = `qrcode-${restaurantName.toLowerCase().replace(/\s+/g, '-')}.png`;
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (format === 'svg') {
        URL.revokeObjectURL(dataUrl);
      }

      toast.success(`QR Code baixado como ${format.toUpperCase()}!`);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      toast.error('Erro ao baixar QR Code');
    }
  };

  // Print QR Code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para imprimir');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${restaurantName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 40px;
              background: white;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            .logo {
              width: 80px;
              height: 80px;
              border-radius: 12px;
              object-fit: cover;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 8px;
              color: #1a1a1a;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 24px;
            }
            .qr-container {
              padding: 24px;
              background: white;
              border: 2px solid #e5e5e5;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 24px;
            }
            .qr-code {
              width: 256px;
              height: 256px;
            }
            .url {
              font-size: 12px;
              color: #888;
              word-break: break-all;
              padding: 12px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .cta {
              margin-top: 16px;
              font-size: 16px;
              font-weight: 600;
              color: #1a1a1a;
            }
            @media print {
              body {
                padding: 20px;
              }
              .container {
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
            <h1>${restaurantName}</h1>
            <p class="subtitle">Escaneie para ver nosso cardápio</p>
            <div class="qr-container">
              <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
            </div>
            <p class="url">${url}</p>
            <p class="cta">📱 Aponte a câmera do celular</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copy URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  // Apply color preset
  const applyPreset = (preset: typeof colorPresets[0]) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  if (!url) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code do Cardápio
          </CardTitle>
          <CardDescription>
            Gere e personalize o QR Code para seus clientes acessarem o cardápio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Preview */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Preview */}
            <div className="flex flex-col items-center gap-4">
              <div 
                className="p-4 rounded-xl border-2 cursor-pointer hover:border-primary/50 transition-colors"
                style={{ backgroundColor: bgColor }}
                onClick={() => setShowFullscreen(true)}
              >
                {generating ? (
                  <div className="w-40 h-40 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code do Cardápio" 
                    className="w-40 h-40"
                  />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setShowFullscreen(true)}
              >
                <Maximize2 className="w-3 h-3" />
                Ampliar
              </Button>
            </div>

            {/* Customization */}
            <div className="flex-1 space-y-4">
              {/* Color Presets */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Palette className="w-4 h-4" />
                  Cores
                </Label>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                        fgColor === preset.fg && bgColor === preset.bg 
                          ? 'ring-2 ring-primary ring-offset-2' 
                          : ''
                      }`}
                      style={{ 
                        background: `linear-gradient(135deg, ${preset.fg} 50%, ${preset.bg} 50%)`,
                        borderColor: preset.bg === '#FFFFFF' ? '#e5e5e5' : preset.bg
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fgColor" className="text-xs">Cor do QR</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fgColor"
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-10 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bgColor" className="text-xs">Cor de fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bgColor"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Tamanho: {size}px</Label>
                </div>
                <Slider
                  value={[size]}
                  onValueChange={([v]) => setSize(v)}
                  min={128}
                  max={512}
                  step={32}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* URL Display */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-xs truncate">{url}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Select onValueChange={(v) => handleDownload(v as 'png' | 'svg')}>
              <SelectTrigger className="w-auto gap-2">
                <Download className="w-4 h-4" />
                <SelectValue placeholder="Baixar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (Imagem)</SelectItem>
                <SelectItem value="svg">SVG (Vetorial)</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code - {restaurantName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div 
              className="p-6 rounded-2xl border-2"
              style={{ backgroundColor: bgColor }}
            >
              <img 
                src={qrDataUrl} 
                alt="QR Code do Cardápio" 
                className="w-64 h-64"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Escaneie com a câmera do celular para acessar o cardápio
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleDownload('png')} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar PNG
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
