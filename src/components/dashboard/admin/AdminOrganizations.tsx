import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe, Search, MessageSquare, Loader2, ChevronLeft, MapPin, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface OrganizationItem {
  id: string;
  name: string;
  address?: string | null;
  subscription_status: string;
  moderation_status?: string;
  onboarding_status?: string;
  created_at: string;
  owner_id: string;
  owner?: { first_name: string | null; last_name: string | null; skillspot_id: string | null; email: string | null } | null;
  _type: 'business' | 'network';
}

const statusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (status === 'active' || status === 'approved') return 'default';
  if (status === 'trial' || status === 'pending') return 'secondary';
  if (status === 'suspended' || status === 'expired' || status === 'rejected') return 'destructive';
  return 'outline';
};

/**
 * Универсальная вкладка «Организации» для платформенных ролей
 * (super_admin, support, integrator). Только просмотр.
 */
const AdminOrganizations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [selected, setSelected] = useState<OrganizationItem | null>(null);
  const [details, setDetails] = useState<{ masters: any[]; locations: any[] } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [bizRes, netRes] = await Promise.all([
      supabase
        .from('business_locations')
        .select('id, name, address, subscription_status, moderation_status, onboarding_status, created_at, owner_id, owner:profiles!business_locations_owner_id_fkey(first_name, last_name, skillspot_id, email)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('networks')
        .select('id, name, subscription_status, onboarding_status, created_at, owner_id, owner:profiles!networks_owner_id_fkey(first_name, last_name, skillspot_id, email)')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const businesses = (bizRes.data || []).map((b: any) => ({ ...b, _type: 'business' as const }));
    const networks = (netRes.data || []).map((n: any) => ({ ...n, _type: 'network' as const }));
    setItems([...businesses, ...networks]);
    setLoading(false);
  };

  const openDetails = async (item: OrganizationItem) => {
    setSelected(item);
    setDetailsLoading(true);
    setDetails(null);

    if (item._type === 'business') {
      const { data: masters } = await supabase
        .from('business_masters')
        .select('id, status, master:profiles!business_masters_master_id_fkey(first_name, last_name, skillspot_id, email)')
        .eq('business_id', item.id);
      setDetails({ masters: masters || [], locations: [] });
    } else {
      const { data: locs } = await supabase
        .from('business_locations')
        .select('id, name, address, subscription_status, moderation_status')
        .eq('network_id', item.id);
      setDetails({ masters: [], locations: locs || [] });
    }
    setDetailsLoading(false);
  };

  const startSupportChat = async (ownerId: string) => {
    if (!user) return;
    try {
      // Открываем чат — отправляем системное сообщение от имени админа
      await supabase.from('chat_messages').insert({
        sender_id: user.id,
        recipient_id: ownerId,
        chat_type: 'support',
        message: 'Здравствуйте! Платформа на связи — чем можем помочь?',
      });
      toast({ title: 'Чат создан', description: 'Перейдите во вкладку «Поддержка» для продолжения' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = items.filter((it) => {
    if (onboardingFilter !== 'all' && (it.onboarding_status || 'in_progress') !== onboardingFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.name?.toLowerCase().includes(q) ||
      it.owner?.skillspot_id?.toLowerCase().includes(q) ||
      it.owner?.email?.toLowerCase().includes(q) ||
      `${it.owner?.first_name ?? ''} ${it.owner?.last_name ?? ''}`.toLowerCase().includes(q)
    );
  });

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelected(null); setDetails(null); }}>
          <ChevronLeft className="h-4 w-4" /> К списку
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {selected._type === 'network' ? <Globe className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  <CardTitle>{selected.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{selected._type === 'network' ? 'Сеть' : 'Точка'}</Badge>
                  <Badge variant={statusVariant(selected.subscription_status)}>Подписка: {selected.subscription_status}</Badge>
                  {selected.moderation_status && (
                    <Badge variant={statusVariant(selected.moderation_status)}>Модерация: {selected.moderation_status}</Badge>
                  )}
                  <span className="text-xs">Создана {new Date(selected.created_at).toLocaleDateString('ru-RU')}</span>
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => startSupportChat(selected.owner_id)}>
                <MessageSquare className="h-4 w-4 mr-1" /> Написать владельцу
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{selected.address}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{selected.owner?.first_name} {selected.owner?.last_name}</p>
                <p className="text-xs text-muted-foreground">{selected.owner?.email} · {selected.owner?.skillspot_id}</p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : selected._type === 'business' ? (
              <div>
                <h4 className="font-medium text-sm mb-2">Мастера ({details?.masters.length ?? 0})</h4>
                {(!details?.masters.length) ? (
                  <p className="text-sm text-muted-foreground">Нет мастеров</p>
                ) : (
                  <div className="space-y-2">
                    {details!.masters.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="text-sm font-medium">{m.master?.first_name} {m.master?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{m.master?.skillspot_id} · {m.master?.email}</p>
                        </div>
                        <Badge variant={m.status === 'accepted' ? 'default' : 'secondary'}>{m.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-sm mb-2">Точки сети ({details?.locations.length ?? 0})</h4>
                {(!details?.locations.length) ? (
                  <p className="text-sm text-muted-foreground">Нет точек</p>
                ) : (
                  <div className="space-y-2">
                    {details!.locations.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="text-sm font-medium">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.address || '—'}</p>
                        </div>
                        <Badge variant={statusVariant(l.subscription_status)}>{l.subscription_status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Организации</CardTitle>
        <CardDescription>Все бизнес-точки и сети платформы. Только просмотр.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, ФИО владельца или Skillspot ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Все ({filtered.length})</TabsTrigger>
              <TabsTrigger value="business">
                <Building2 className="h-3.5 w-3.5 mr-1" /> Точки ({filtered.filter((i) => i._type === 'business').length})
              </TabsTrigger>
              <TabsTrigger value="network">
                <Globe className="h-3.5 w-3.5 mr-1" /> Сети ({filtered.filter((i) => i._type === 'network').length})
              </TabsTrigger>
            </TabsList>

            {(['all', 'business', 'network'] as const).map((view) => (
              <TabsContent key={view} value={view} className="space-y-2 mt-4">
                {filtered
                  .filter((i) => view === 'all' ? true : i._type === view)
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openDetails(item)}
                      className="w-full text-left p-3 rounded-lg border hover:border-primary/50 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item._type === 'network' ? <Globe className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                          <span className="font-medium truncate">{item.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.owner?.first_name} {item.owner?.last_name} · {item.owner?.skillspot_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={statusVariant(item.subscription_status)}>{item.subscription_status}</Badge>
                        {item.moderation_status && (
                          <Badge variant={statusVariant(item.moderation_status)}>{item.moderation_status}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                {filtered.filter((i) => view === 'all' ? true : i._type === view).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOrganizations;
