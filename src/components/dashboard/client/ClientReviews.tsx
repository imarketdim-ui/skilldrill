import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Loader2, MessageSquare } from 'lucide-react';

interface Props { userId: string; }

export default function ClientReviews({ userId }: Props) {
  const [givenReviews, setGivenReviews] = useState<any[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'given' | 'received'>('given');

  useEffect(() => {
    const fetch = async () => {
      const [given, received] = await Promise.all([
        supabase.from('ratings')
          .select('id, score, review, created_at, rated_id, rated_profile:profiles!rated_id(first_name, last_name)')
          .eq('rater_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('ratings')
          .select('id, score, review, created_at, rater_id, rater_profile:profiles!rater_id(first_name, last_name)')
          .eq('rated_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      setGivenReviews(given.data || []);
      setReceivedReviews(received.data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const reviews = tab === 'given' ? givenReviews : receivedReviews;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Отзывы</h3>
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="given" className="flex-1">Оставленные ({givenReviews.length})</TabsTrigger>
          <TabsTrigger value="received" className="flex-1">Полученные ({receivedReviews.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {tab === 'given' ? 'Вы ещё не оставляли отзывов' : 'У вас пока нет отзывов'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const profile = tab === 'given' ? (r as any).rated_profile : (r as any).rater_profile;
            const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
            return (
              <Card key={r.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{name || 'Пользователь'}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.score ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      {r.review && <p className="text-sm text-muted-foreground mt-2">{r.review}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(r.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
