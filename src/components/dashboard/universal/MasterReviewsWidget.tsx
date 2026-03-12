import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const MasterReviewsWidget = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('ratings')
        .select('*, profiles:rater_id(first_name, last_name)')
        .eq('rated_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      const rows = data || [];
      setReviews(rows);
      if (rows.length > 0) {
        setAvgRating(rows.reduce((s, r) => s + r.score, 0) / rows.length);
      }
    };
    fetch();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Мои отзывы</span>
          {avgRating > 0 && (
            <span className="flex items-center gap-1 text-sm font-normal">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {avgRating.toFixed(1)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Отзывов пока нет</p>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">
                    {(r.profiles as any)?.first_name} {(r.profiles as any)?.last_name}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.score ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ru })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MasterReviewsWidget;
