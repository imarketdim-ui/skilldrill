import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Users, Calendar, Award, Zap, Target, Crown } from 'lucide-react';

interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string | null;
  earned_at: string;
}

const ACHIEVEMENT_DEFS = [
  { type: 'first_booking', title: 'Первая запись', desc: 'Получена первая запись клиента', icon: Calendar, threshold: 1, metric: 'bookings' },
  { type: '10_bookings', title: '10 записей', desc: 'Выполнено 10 записей', icon: Target, threshold: 10, metric: 'bookings' },
  { type: '50_bookings', title: '50 записей', desc: 'Выполнено 50 записей', icon: Zap, threshold: 50, metric: 'bookings' },
  { type: '100_bookings', title: '100 записей', desc: 'Выполнено 100 записей', icon: Crown, threshold: 100, metric: 'bookings' },
  { type: 'first_review', title: 'Первый отзыв', desc: 'Получен первый отзыв', icon: Star, threshold: 1, metric: 'reviews' },
  { type: '10_reviews', title: '10 отзывов', desc: 'Получено 10 отзывов', icon: Star, threshold: 10, metric: 'reviews' },
  { type: '5_clients', title: '5 клиентов', desc: '5 уникальных клиентов', icon: Users, threshold: 5, metric: 'clients' },
  { type: '20_clients', title: '20 клиентов', desc: '20 уникальных клиентов', icon: Users, threshold: 20, metric: 'clients' },
  { type: 'high_rating', title: 'Высокий рейтинг', desc: 'Средний рейтинг ≥ 4.5', icon: Award, threshold: 4.5, metric: 'rating' },
];

const MasterAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkAndFetchAchievements();
  }, [user]);

  const checkAndFetchAchievements = async () => {
    if (!user) return;

    // Fetch stats
    const [bookingsRes, ratingsRes, clientsRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact' }).eq('executor_id', user.id).eq('status', 'completed'),
      supabase.from('ratings').select('score').eq('rated_id', user.id),
      supabase.from('bookings').select('client_id').eq('executor_id', user.id).eq('status', 'completed'),
    ]);

    const completedBookings = bookingsRes.count || 0;
    const reviews = (ratingsRes.data as any[]) || [];
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0 ? reviews.reduce((s: number, r: any) => s + r.score, 0) / reviewCount : 0;
    const uniqueClients = new Set((clientsRes.data || []).map((b: any) => b.client_id)).size;

    // Check which achievements to award
    for (const def of ACHIEVEMENT_DEFS) {
      let earned = false;
      if (def.metric === 'bookings') earned = completedBookings >= def.threshold;
      else if (def.metric === 'reviews') earned = reviewCount >= def.threshold;
      else if (def.metric === 'clients') earned = uniqueClients >= def.threshold;
      else if (def.metric === 'rating') earned = avgRating >= def.threshold && reviewCount >= 5;

      if (earned) {
        await supabase.from('master_achievements' as any).upsert({
          user_id: user.id,
          achievement_type: def.type,
          title: def.title,
          description: def.desc,
        }, { onConflict: 'user_id,achievement_type' }).select();
      }
    }

    // Fetch all earned
    const { data } = await supabase.from('master_achievements' as any)
      .select('*').eq('user_id', user.id).order('earned_at', { ascending: true });
    setAchievements((data as any[]) || []);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    const def = ACHIEVEMENT_DEFS.find(d => d.type === type);
    return def?.icon || Trophy;
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Достижения
        </CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Выполняйте записи, получайте отзывы и зарабатывайте достижения!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a) => {
              const Icon = getIcon(a.achievement_type);
              return (
                <div key={a.id} className="flex flex-col items-center text-center p-3 rounded-lg border bg-accent/5">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  <Badge variant="outline" className="mt-1.5 text-[10px]">
                    {new Date(a.earned_at).toLocaleDateString('ru-RU')}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Show locked achievements */}
        {achievements.length < ACHIEVEMENT_DEFS.length && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Ещё не получены:</p>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENT_DEFS.filter(d => !achievements.find(a => a.achievement_type === d.type)).map(d => (
                <Badge key={d.type} variant="outline" className="text-xs opacity-50">
                  {d.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MasterAchievements;
