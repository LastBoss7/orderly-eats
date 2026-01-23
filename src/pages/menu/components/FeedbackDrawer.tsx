import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  Send, 
  MessageSquare, 
  ThumbsUp, 
  AlertCircle, 
  HelpCircle,
  Star
} from 'lucide-react';

interface FeedbackDrawerProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}

type FeedbackType = 'suggestion' | 'complaint' | 'praise' | 'question';
type FeedbackCategory = 'food' | 'service' | 'delivery' | 'app' | 'price' | 'other';

const feedbackTypes: { value: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'suggestion', label: 'Sugestão', icon: <MessageSquare className="w-5 h-5" />, color: 'text-blue-500' },
  { value: 'praise', label: 'Elogio', icon: <ThumbsUp className="w-5 h-5" />, color: 'text-emerald-500' },
  { value: 'complaint', label: 'Reclamação', icon: <AlertCircle className="w-5 h-5" />, color: 'text-rose-500' },
  { value: 'question', label: 'Dúvida', icon: <HelpCircle className="w-5 h-5" />, color: 'text-amber-500' },
];

const feedbackCategories: { value: FeedbackCategory; label: string }[] = [
  { value: 'food', label: 'Comida' },
  { value: 'service', label: 'Atendimento' },
  { value: 'delivery', label: 'Entrega' },
  { value: 'app', label: 'Aplicativo' },
  { value: 'price', label: 'Preço' },
  { value: 'other', label: 'Outro' },
];

export function FeedbackDrawer({ open, onClose, restaurantId }: FeedbackDrawerProps) {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Escreva sua mensagem');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('suggestions').insert({
        restaurant_id: restaurantId,
        type,
        category,
        customer_name: name || null,
        customer_phone: phone.replace(/\D/g, '') || null,
        message: message.trim(),
        rating,
      });

      if (error) throw error;

      toast.success('Feedback enviado! Obrigado pela sua opinião.');
      
      // Reset form
      setType('suggestion');
      setCategory(null);
      setName('');
      setPhone('');
      setMessage('');
      setRating(null);
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  const isValid = message.trim().length > 0;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DrawerContent className="max-h-[90dvh] flex flex-col">
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 min-h-0">
          <DrawerHeader className="pb-3 flex-shrink-0 border-b border-border/50">
            <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Deixe seu feedback
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-0 space-y-5 pt-4">
            {/* Feedback Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de feedback</Label>
              <div className="grid grid-cols-4 gap-2">
                {feedbackTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                      type === t.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className={t.color}>{t.icon}</span>
                    <span className="text-[10px] mt-1 font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sobre o que? (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {feedbackCategories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(category === c.value ? null : c.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      category === c.value
                        ? 'bg-foreground text-background'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Avaliação geral (opcional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-7 h-7 ${
                        rating && star <= rating 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-muted-foreground/30'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sua mensagem *</Label>
              <Textarea
                placeholder="Escreva aqui sua sugestão, elogio, reclamação ou dúvida..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] resize-none rounded-xl"
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {message.length}/1000
              </p>
            </div>

            {/* Contact (optional) */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Deixe seu contato se quiser receber uma resposta (opcional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="feedback-name" className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    id="feedback-name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="feedback-phone" className="text-xs text-muted-foreground">WhatsApp</Label>
                  <Input
                    id="feedback-phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="h-10 mt-1 rounded-xl"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              size="lg"
              className="w-full h-12 rounded-xl gap-2"
              onClick={handleSubmit}
              disabled={!isValid || loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar feedback
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
