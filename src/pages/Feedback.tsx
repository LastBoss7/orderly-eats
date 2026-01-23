import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  ThumbsUp, 
  AlertCircle, 
  HelpCircle,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  Archive,
  RefreshCw,
  BarChart3,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Suggestion {
  id: string;
  type: string;
  category: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  message: string;
  status: string;
  rating: number | null;
  created_at: string;
}

interface Survey {
  id: string;
  customer_name: string | null;
  overall_rating: number;
  food_quality: number | null;
  delivery_speed: number | null;
  service_quality: number | null;
  app_experience: number | null;
  value_for_money: number | null;
  what_liked: string | null;
  what_to_improve: string | null;
  would_recommend: boolean | null;
  created_at: string;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  suggestion: { label: 'Sugestão', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  praise: { label: 'Elogio', icon: <ThumbsUp className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  complaint: { label: 'Reclamação', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  question: { label: 'Dúvida', icon: <HelpCircle className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  read: { label: 'Lido', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Em andamento', color: 'bg-purple-100 text-purple-700' },
  resolved: { label: 'Resolvido', color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Arquivado', color: 'bg-zinc-100 text-zinc-700' },
};

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`}
        />
      ))}
    </div>
  );
}

export default function Feedback() {
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suggestions');

  const fetchData = async () => {
    if (!profile?.restaurant_id) return;
    
    setLoading(true);
    try {
      const [suggestionsRes, surveysRes] = await Promise.all([
        supabase
          .from('suggestions')
          .select('*')
          .eq('restaurant_id', profile.restaurant_id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('experience_surveys')
          .select('*')
          .eq('restaurant_id', profile.restaurant_id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (suggestionsRes.data) setSuggestions(suggestionsRes.data);
      if (surveysRes.data) setSurveys(surveysRes.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.restaurant_id]);

  const updateSuggestionStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Stats calculations
  const avgOverallRating = surveys.length > 0 
    ? (surveys.reduce((acc, s) => acc + s.overall_rating, 0) / surveys.length).toFixed(1)
    : '-';
  
  const recommendRate = surveys.filter(s => s.would_recommend !== null).length > 0
    ? Math.round((surveys.filter(s => s.would_recommend === true).length / surveys.filter(s => s.would_recommend !== null).length) * 100)
    : 0;

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Feedback dos Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sugestões, avaliações e opiniões dos seus clientes
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgOverallRating}</p>
                  <p className="text-xs text-muted-foreground">Nota média</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recommendRate}%</p>
                  <p className="text-xs text-muted-foreground">Recomendariam</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{surveys.length}</p>
                  <p className="text-xs text-muted-foreground">Avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                  <Clock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingSuggestions}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="suggestions" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Sugestões ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="surveys" className="gap-2">
              <Star className="w-4 h-4" />
              Avaliações ({surveys.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-4">
            {suggestions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma sugestão recebida ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Os clientes podem enviar feedback pelo cardápio digital
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {suggestions.map((item) => {
                  const config = typeConfig[item.type] || typeConfig.suggestion;
                  const status = statusConfig[item.status] || statusConfig.pending;
                  
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge className={config.color}>
                                {config.icon}
                                <span className="ml-1">{config.label}</span>
                              </Badge>
                              {item.category && (
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                              <Badge className={status.color}>
                                {status.label}
                              </Badge>
                              {item.rating && <StarDisplay rating={item.rating} />}
                            </div>
                            
                            <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                            
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              {item.customer_name && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {item.customer_name}
                                </span>
                              )}
                              <span>
                                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            {item.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => updateSuggestionStatus(item.id, 'read')}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            {item.status !== 'archived' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => updateSuggestionStatus(item.id, 'archived')}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="surveys" className="mt-4">
            {surveys.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma avaliação recebida ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {surveys.map((survey) => (
                  <Card key={survey.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Star className={`w-5 h-5 ${survey.overall_rating >= 4 ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {survey.customer_name || 'Cliente anônimo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(survey.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={survey.overall_rating} />
                          {survey.would_recommend !== null && (
                            <Badge className={survey.would_recommend ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                              {survey.would_recommend ? '👍 Recomenda' : '👎 Não recomenda'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Category ratings */}
                      <div className="grid grid-cols-5 gap-2 text-xs mb-3">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">Comida</p>
                          <StarDisplay rating={survey.food_quality} />
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">Entrega</p>
                          <StarDisplay rating={survey.delivery_speed} />
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">Atendimento</p>
                          <StarDisplay rating={survey.service_quality} />
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">App</p>
                          <StarDisplay rating={survey.app_experience} />
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground mb-1">Preço</p>
                          <StarDisplay rating={survey.value_for_money} />
                        </div>
                      </div>

                      {/* Comments */}
                      {(survey.what_liked || survey.what_to_improve) && (
                        <div className="space-y-2 pt-3 border-t">
                          {survey.what_liked && (
                            <div className="text-sm">
                              <span className="text-emerald-600 font-medium">👍 Gostou: </span>
                              {survey.what_liked}
                            </div>
                          )}
                          {survey.what_to_improve && (
                            <div className="text-sm">
                              <span className="text-amber-600 font-medium">💡 Melhorar: </span>
                              {survey.what_to_improve}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
