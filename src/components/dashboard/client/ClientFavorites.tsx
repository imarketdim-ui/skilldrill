import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Loader2 } from 'lucide-react';

const ClientFavorites = ({ userId }: { userId?: string }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchFavorites = async () => {
      setLoading(true);
      const { data } = await supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!data || data.length === 0) { setFavorites([]); setLoading(false); return; }

      const masterIds = data.filter(f => f.favorite_type === 'master').map(f => f.target_id);
      const bizIds = data.filter(f => f.favorite_type === 'business').map(f => f.target_id);

      const [masterByIdRes, masterByUserIdRes, bizRes] = await Promise.all([
        masterIds.length > 0
          ? supabase
              .from('master_profiles')
              .select('id, user_id, profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url), service_categories(name)')
              .in('id', masterIds)
          : { data: [] },
        masterIds.length > 0
          ? supabase
              .from('master_profiles')
              .select('id, user_id, profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url), service_categories(name)')
              .in('user_id', masterIds)
          : { data: [] },
        bizIds.length > 0 ? supabase.from('business_locations').select('id, name, address').in('id', bizIds) : { data: [] },
      ]);
      const masterRows = [...(masterByIdRes.data || []), ...(masterByUserIdRes.data || [])];

      const items = data.map(f => {
        if (f.favorite_type === 'master') {
          const mp = masterRows.find((m: any) => m.id === f.target_id || m.user_id === f.target_id);
          const targetId = mp?.id || f.target_id;
          return { ...f, target_id: targetId, name: mp ? `${(mp.profiles as any)?.first_name || ''} ${(mp.profiles as any)?.last_name || ''}`.trim() : 'Мастер', category: (mp?.service_categories as any)?.name, avatar: (mp?.profiles as any)?.avatar_url };
        }
        if (f.favorite_type === 'business') {
          const bl = (bizRes.data || []).find((b: any) => b.id === f.target_id);
          return { ...f, name: bl?.name || 'Организация', category: bl?.address };
        }
        return { ...f, name: 'Объект' };
      });
      const deduped = Array.from(new Map(items.map((item) => [`${item.favorite_type}:${item.target_id}`, item])).values());
      setFavorites(deduped);
      setLoading(false);
    };
    fetchFavorites();
  }, [userId]);

  if (loading) return <Card><CardContent className="pt-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Избранное</CardTitle>
        <CardDescription>Организации, мастера и услуги</CardDescription>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Вы ещё ничего не добавили в избранное</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/catalog')}>Найти услугу</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map(f => (
              <div key={f.id} className="p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors flex items-center gap-3"
                onClick={() => navigate(f.favorite_type === 'master' ? `/master/${f.target_id}` : `/business/${f.target_id}`)}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {f.avatar ? <img src={f.avatar} className="w-full h-full rounded-full object-cover" /> : f.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.name}</p>
                  {f.category && <p className="text-xs text-muted-foreground">{f.category}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{f.favorite_type === 'master' ? 'Мастер' : 'Организация'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientFavorites;
