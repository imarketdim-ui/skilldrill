import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, Users, BarChart3, Shield, UserPlus, Search,
  Loader2, TrendingUp, CreditCard, UserCheck, ShieldBan, FolderTree, ListChecks, MessageSquare, ChevronLeft, ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUserList from './admin/AdminUserList';
import RevocationRequests from './admin/RevocationRequests';
import CategoryManager from './admin/CategoryManager';
import ReasonManager from './admin/ReasonManager';
import SupportChat from './SupportChat';
import BonusSubscriptionPanel from './admin/BonusSubscriptionPanel';

type DetailView = null | 'registrations' | 'active_users' | 'revenue' | 'sub_masters' | 'sub_businesses' | 'sub_networks' | 'tickets';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminAssignments, setAdminAssignments] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, masters: 0, businesses: 0, networks: 0 });
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [profilesRes, mastersRes, bizRes, netRes, assignRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('master_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('business_locations').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('networks').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('admin_assignments').select('*, assigner:profiles!admin_assignments_assigner_id_fkey(first_name,last_name), assignee:profiles!admin_assignments_assignee_id_fkey(first_name,last_name,email,skillspot_id)').order('created_at', { ascending: false }),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('chat_type', 'support').eq('is_read', false).neq('sender_id', user!.id),
    ]);
    setStats({
      totalUsers: profilesRes.count || 0,
      masters: mastersRes.count || 0,
      businesses: bizRes.count || 0,
      networks: netRes.count || 0,
    });
    setAdminAssignments(assignRes.data || []);
    setUnreadSupport(unreadRes.count || 0);
    setLoading(false);
  };

  const loadDetailView = async (view: DetailView) => {
    setDetailView(view);
    setDetailLoading(true);
    setDetailData([]);

    if (view === 'registrations') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase.from('profiles').select('id, first_name, last_name, email, skillspot_id, created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(100);
      setDetailData(data || []);
    } else if (view === 'active_users') {
      const { data } = await supabase.from('bookings').select('client_id, profiles!bookings_client_id_fkey(first_name, last_name, email, skillspot_id)').gte('scheduled_at', new Date(Date.now() - 30 * 86400000).toISOString()).limit(200);
      const unique = new Map<string, any>();
      (data || []).forEach(b => { if (!unique.has(b.client_id)) unique.set(b.client_id, (b as any).profiles); });
      setDetailData(Array.from(unique.values()).filter(Boolean));
    } else if (view === 'revenue') {
      const { data } = await supabase.from('balance_transactions').select('*').eq('type', 'subscription_payment').order('created_at', { ascending: false }).limit(100);
      setDetailData(data || []);
    } else if (view === 'sub_masters') {
      const { data } = await supabase.from('master_profiles').select('id, subscription_status, user_id, profiles:user_id(first_name, last_name, skillspot_id)').eq('is_active', true).limit(200);
      setDetailData(data || []);
    } else if (view === 'sub_businesses') {
      const { data } = await supabase.from('business_locations').select('id, name, subscription_status, owner_id').eq('is_active', true).limit(200);
      setDetailData(data || []);
    } else if (view === 'sub_networks') {
      const { data } = await supabase.from('networks').select('id, name, subscription_status, owner_id').eq('is_active', true).limit(200);
      setDetailData(data || []);
    } else if (view === 'tickets') {
      try {
        const { data } = await supabase.from('support_tickets').select('*, profiles:user_id(first_name, last_name, skillspot_id)').order('created_at', { ascending: false }).limit(100);
        setDetailData(data || []);
      } catch (_) { setDetailData([]); }
    }
    setDetailLoading(false);
  };

  const searchUser = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('profiles').select('*, user_roles(role, is_active)').eq('skillspot_id', searchId.trim().toUpperCase()).maybeSingle();
    setSearchResult(data);
    setSearching(false);
    if (!data) toast({ title: 'Пользователь не найден', variant: 'destructive' });
  };

  const assignAdmin = async (userId: string) => {
    try {
      await supabase.from('admin_assignments').insert({ assigner_id: user!.id, assignee_id: userId, role: 'platform_admin' });
      await supabase.from('notifications').insert({ user_id: userId, type: 'admin_invite', title: 'Приглашение стать администратором', message: 'Супер-администратор назначил вас администратором платформы.' });
      toast({ title: 'Приглашение отправлено' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  // Detail view render
  if (detailView) {
    const titles: Record<string, string> = {
      registrations: 'Регистрации за 30 дней',
      active_users: 'Активные пользователи (с записями за 30 дней)',
      revenue: 'Платежи за подписки',
      sub_masters: 'Мастера',
      sub_businesses: 'Бизнесы',
      sub_networks: 'Сети',
      tickets: 'Тикеты техподдержки',
    };

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDetailView(null)}>
          <ChevronLeft className="h-4 w-4" /> Назад
        </Button>
        <h3 className="text-lg font-semibold">{titles[detailView]}</h3>
        {detailLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : detailData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {detailView === 'revenue' ? detailData.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{tx.description || 'Подписка'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                <p className="font-semibold">{Math.abs(tx.amount).toLocaleString()} ₽</p>
              </div>
            )) : detailView === 'tickets' ? detailData.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{t.subject || 'Обращение'}</p>
                  <p className="text-xs text-muted-foreground">{(t as any).profiles?.first_name} {(t as any).profiles?.last_name} • {t.category}</p>
                </div>
                <Badge variant={t.status === 'open' ? 'destructive' : t.status === 'resolved' ? 'default' : 'secondary'}>{t.status}</Badge>
              </div>
            )) : detailData.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{item.first_name || item.name || ''} {item.last_name || ''}</p>
                  <p className="text-xs text-muted-foreground">{item.email || item.skillspot_id || ''}{item.subscription_status ? ` • ${item.subscription_status}` : ''}</p>
                  {item.profiles && <p className="text-xs text-muted-foreground">{(item as any).profiles.first_name} {(item as any).profiles.last_name} ({(item as any).profiles.skillspot_id})</p>}
                </div>
                {item.created_at && <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('ru-RU')}</p>}
                {item.subscription_status && <Badge variant="secondary">{item.subscription_status}</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-8 w-8 text-amber-500" />
        <h2 className="text-2xl font-bold">Супер Администратор</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.totalUsers}</p><p className="text-sm text-muted-foreground">Пользователей</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.masters}</p><p className="text-sm text-muted-foreground">Мастеров</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.businesses}</p><p className="text-sm text-muted-foreground">Бизнесов</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.networks}</p><p className="text-sm text-muted-foreground">Сетей</p></CardContent></Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Пользователи</TabsTrigger>
          <TabsTrigger value="revocations"><ShieldBan className="h-4 w-4 mr-1" /> Аннулирование</TabsTrigger>
          <TabsTrigger value="categories"><FolderTree className="h-4 w-4 mr-1" /> Категории</TabsTrigger>
          <TabsTrigger value="reasons"><ListChecks className="h-4 w-4 mr-1" /> Причины</TabsTrigger>
          <TabsTrigger value="admins"><Shield className="h-4 w-4 mr-1" /> Администраторы</TabsTrigger>
          <TabsTrigger value="support" className="gap-1">
            <MessageSquare className="h-4 w-4" /> Поддержка
            {unreadSupport > 0 && <Badge variant="destructive" className="h-4 px-1 text-[10px]">{unreadSupport}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="tickets"><ClipboardList className="h-4 w-4 mr-1" /> Задачи</TabsTrigger>
          <TabsTrigger value="platform"><BarChart3 className="h-4 w-4 mr-1" /> Дашборд</TabsTrigger>
          <TabsTrigger value="subscriptions"><CreditCard className="h-4 w-4 mr-1" /> Подписки</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><AdminUserList /></TabsContent>
        <TabsContent value="revocations"><RevocationRequests isSuperAdmin /></TabsContent>
        <TabsContent value="categories"><CategoryManager /></TabsContent>
        <TabsContent value="reasons"><ReasonManager /></TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader><CardTitle>Назначить администратора</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="SkillSpot ID (например AB1234)" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
                <Button onClick={searchUser} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchResult && (
                <div className="p-4 rounded-lg border mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{searchResult.first_name} {searchResult.last_name}</p>
                      <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                      <p className="text-sm font-mono">ID: {searchResult.skillspot_id}</p>
                      <div className="flex gap-1 mt-1">
                        {searchResult.user_roles?.map((r: any) => (
                          <Badge key={r.role} variant="secondary" className="text-xs">{r.role}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => assignAdmin(searchResult.id)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Назначить
                    </Button>
                  </div>
                </div>
              )}
              <h4 className="font-semibold mt-6 mb-3">Приглашения</h4>
              {adminAssignments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет приглашений</p>
              ) : (
                <div className="space-y-2">
                  {adminAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{a.assignee?.first_name} {a.assignee?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{a.assignee?.email} • {a.assignee?.skillspot_id}</p>
                      </div>
                      <Badge variant={a.status === 'pending' ? 'outline' : a.status === 'accepted' ? 'default' : 'destructive'}>
                        {a.status === 'pending' ? 'Ожидает' : a.status === 'accepted' ? 'Принято' : 'Отклонено'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support"><SupportChat isAdmin /></TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader><CardTitle>Задачи техподдержки</CardTitle></CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="mb-4" onClick={() => loadDetailView('tickets')}>Показать все тикеты</Button>
              <TicketsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardHeader><CardTitle>Показатели платформы</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left" onClick={() => loadDetailView('registrations')}>
                  <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-emerald-500" /><span className="font-medium">Регистрации</span></div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Всего пользователей →</p>
                </button>
                <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left" onClick={() => loadDetailView('active_users')}>
                  <div className="flex items-center gap-2 mb-2"><UserCheck className="h-5 w-5 text-blue-500" /><span className="font-medium">Активные</span></div>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">Активных пользователей →</p>
                </button>
                <button className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left" onClick={() => loadDetailView('revenue')}>
                  <div className="flex items-center gap-2 mb-2"><CreditCard className="h-5 w-5 text-purple-500" /><span className="font-medium">Доход</span></div>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">Доходность платформы →</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <BonusSubscriptionPanel stats={stats} onNavigate={loadDetailView} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Inline tickets list component
const TicketsList = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('support_tickets')
          .select('*, profiles:user_id(first_name, last_name, skillspot_id), admin:admin_id(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        setTickets(data || []);
      } catch (_) { setTickets([]); }
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('support_tickets').update({ status, resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null } as any).eq('id', id);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (tickets.length === 0) return <p className="text-muted-foreground text-sm text-center py-4">Нет тикетов</p>;

  const statusLabels: Record<string, string> = { open: 'Открыт', in_progress: 'В работе', resolved: 'Решён', closed: 'Закрыт' };

  return (
    <div className="space-y-2">
      {tickets.map(t => (
        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{t.subject || 'Обращение'}</p>
            <p className="text-xs text-muted-foreground">
              {(t as any).profiles?.first_name} {(t as any).profiles?.last_name} • {t.category} • {new Date(t.created_at).toLocaleDateString('ru-RU')}
            </p>
            {(t as any).admin && <p className="text-xs text-muted-foreground">Админ: {(t as any).admin.first_name} {(t as any).admin.last_name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={t.status === 'open' ? 'destructive' : t.status === 'resolved' ? 'default' : 'secondary'}>
              {statusLabels[t.status] || t.status}
            </Badge>
            {t.status === 'open' && <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'in_progress')}>Взять</Button>}
            {t.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'resolved')}>Решить</Button>}
            {t.status === 'resolved' && <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'closed')}>Закрыть</Button>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SuperAdminDashboard;
