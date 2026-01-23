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
import { Loader2, Star, Send, ClipboardList, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ExperienceSurveyDrawerProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  orderId?: string;
}

interface Ratings {
  overall: number | null;
  food: number | null;
  delivery: number | null;
  service: number | null;
  app: number | null;
  value: number | null;
}

const ratingCategories = [
  { key: 'food', label: 'Qualidade da comida', emoji: '🍽️' },
  { key: 'delivery', label: 'Velocidade da entrega', emoji: '🚀' },
  { key: 'service', label: 'Atendimento', emoji: '👋' },
  { key: 'app', label: 'Experiência no app', emoji: '📱' },
  { key: 'value', label: 'Custo-benefício', emoji: '💰' },
];

function StarRating({ 
  value, 
  onChange, 
  size = 'normal' 
}: { 
  value: number | null; 
  onChange: (v: number) => void;
  size?: 'normal' | 'large';
}) {
  const starSize = size === 'large' ? 'w-10 h-10' : 'w-6 h-6';
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star 
            className={`${starSize} ${
              value && star <= value 
                ? 'fill-amber-400 text-amber-400' 
                : 'text-muted-foreground/20'
            }`} 
          />
        </button>
      ))}
    </div>
  );
}

export function ExperienceSurveyDrawer({ 
  open, 
  onClose, 
  restaurantId,
  orderId 
}: ExperienceSurveyDrawerProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [ratings, setRatings] = useState<Ratings>({
    overall: null,
    food: null,
    delivery: null,
    service: null,
    app: null,
    value: null,
  });
  const [whatLiked, setWhatLiked] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleRatingChange = (key: keyof Ratings, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!ratings.overall) {
      toast.error('Avalie sua experiência geral');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('experience_surveys').insert({
        restaurant_id: restaurantId,
        order_id: orderId || null,
        customer_name: name || null,
        customer_phone: phone.replace(/\D/g, '') || null,
        overall_rating: ratings.overall,
        food_quality: ratings.food,
        delivery_speed: ratings.delivery,
        service_quality: ratings.service,
        app_experience: ratings.app,
        value_for_money: ratings.value,
        what_liked: whatLiked || null,
        what_to_improve: whatToImprove || null,
        would_recommend: wouldRecommend,
      });

      if (error) throw error;

      toast.success('Avaliação enviada! Muito obrigado pelo feedback.');
      
      // Reset form
      setStep(1);
      setRatings({ overall: null, food: null, delivery: null, service: null, app: null, value: null });
      setWhatLiked('');
      setWhatToImprove('');
      setWouldRecommend(null);
      setName('');
      setPhone('');
      onClose();
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = ratings.overall !== null;
  const isValid = ratings.overall !== null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DrawerContent className="max-h-[90dvh] flex flex-col">
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 min-h-0">
          <DrawerHeader className="pb-3 flex-shrink-0 border-b border-border/50">
            <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Avalie sua experiência
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-0">
            {step === 1 && (
              <div className="space-y-6 pt-4">
                {/* Overall Rating - Main focus */}
                <div className="text-center space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">Como foi sua experiência?</p>
                    <p className="text-sm text-muted-foreground">Dê uma nota geral</p>
                  </div>
                  <div className="flex justify-center">
                    <StarRating 
                      value={ratings.overall} 
                      onChange={(v) => handleRatingChange('overall', v)}
                      size="large"
                    />
                  </div>
                  {ratings.overall && (
                    <p className="text-sm font-medium text-primary">
                      {ratings.overall === 5 && '😍 Excelente!'}
                      {ratings.overall === 4 && '😊 Muito bom!'}
                      {ratings.overall === 3 && '😐 Regular'}
                      {ratings.overall === 2 && '😕 Ruim'}
                      {ratings.overall === 1 && '😞 Muito ruim'}
                    </p>
                  )}
                </div>

                {/* Category Ratings */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Detalhes (opcional)
                  </p>
                  {ratingCategories.map((cat) => (
                    <div 
                      key={cat.key} 
                      className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                    >
                      <span className="text-sm flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </span>
                      <StarRating 
                        value={ratings[cat.key as keyof Ratings]}
                        onChange={(v) => handleRatingChange(cat.key as keyof Ratings, v)}
                      />
                    </div>
                  ))}
                </div>

                {/* Continue Button */}
                <Button
                  size="lg"
                  className="w-full h-12 rounded-xl"
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                >
                  Continuar
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 pt-4">
                {/* Would Recommend */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Recomendaria para um amigo?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWouldRecommend(true)}
                      className={`flex items-center justify-center gap-2 p-4 border rounded-xl transition-all ${
                        wouldRecommend === true
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      <span className="font-medium">Sim!</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWouldRecommend(false)}
                      className={`flex items-center justify-center gap-2 p-4 border rounded-xl transition-all ${
                        wouldRecommend === false
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      <span className="font-medium">Não</span>
                    </button>
                  </div>
                </div>

                {/* What Liked */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">O que você mais gostou? (opcional)</Label>
                  <Textarea
                    placeholder="Conte o que você achou legal..."
                    value={whatLiked}
                    onChange={(e) => setWhatLiked(e.target.value)}
                    className="min-h-[80px] resize-none rounded-xl"
                    maxLength={500}
                  />
                </div>

                {/* What to Improve */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">O que podemos melhorar? (opcional)</Label>
                  <Textarea
                    placeholder="Suas sugestões são muito importantes..."
                    value={whatToImprove}
                    onChange={(e) => setWhatToImprove(e.target.value)}
                    className="min-h-[80px] resize-none rounded-xl"
                    maxLength={500}
                  />
                </div>

                {/* Contact */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Seu contato (opcional)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="h-10 rounded-xl"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-12 rounded-xl gap-2"
                    onClick={handleSubmit}
                    disabled={!isValid || loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
