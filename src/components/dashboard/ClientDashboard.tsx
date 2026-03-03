import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search, Heart, Calendar, Wallet, Users, MessageSquare,
  Copy, Check, Gift, Building2, Shield, Loader2, Bell,
  LayoutDashboard, Star, Settings, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TeachingChats from '@/components/dashboard/teaching/TeachingChats';
import ClientRequests from '@/components/dashboard/client/ClientRequests';
import ClientWallet from '@/components/dashboard/client/ClientWallet';
import ClientReferral from '@/components/dashboard/client/ClientReferral';
import ClientStats from '@/components/dashboard/client/ClientStats';
import SupportChat from '@/components/dashboard/SupportChat';

// Favorites section component
const FavoritesSection = ({ userId, navigate }: { userId?: string; navigate: (path: string) => void }) => {
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

      const [mastersRes, bizRes] = await Promise.all([
        masterIds.length > 0 ? supabase.from('master_profiles').select('user_id, profiles!master_profiles_user_id_fkey(first_name, last_name, avatar_url), service_categories(name)').in('user_id', masterIds) : { data: [] },
        bizIds.length > 0 ? supabase.from('business_locations').select('id, name, address').in('id', bizIds) : { data: [] },
      ]);

      const items = data.map(f => {
        if (f.favorite_type === 'master') {
          const mp = (mastersRes.data || []).find((m: any) => m.user_id === f.target_id);
          return { ...f, name: mp ? `${(mp.profiles as any)?.first_name || ''} ${(mp.profiles as any)?.last_name || ''}`.trim() : 'Мастер', category: (mp?.service_categories as any)?.name, avatar: (mp?.profiles as any)?.avatar_url };
        }
        if (f.favorite_type === 'business') {
          const bl = (bizRes.data || []).find((b: any) => b.id === f.target_id);
          return { ...f, name: bl?.name || 'Организация', category: bl?.address };
        }
        return { ...f, name: 'Объект' };
      });
      setFavorites(items);
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

const menuItems = [
  { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { key: 'bookings', label: 'Мои записи', icon: Calendar },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'chats', label: 'Чаты', icon: MessageSquare },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'wallet', label: 'Баланс', icon: Wallet },
  { key: 'referral', label: 'Рефералы', icon: Gift },
  { key: 'requests', label: 'Запросы', icon: Shield },
  { key: 'support', label: 'Техподдержка', icon: MessageSquare },
  { key: 'notifications', label: 'Уведомления', icon: Bell },
];

const ClientDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ main_balance: 0, referral_balance: 0 });
  const [pendingInvites, setPendingInvites] = useState(0);
  const [clientBookings, setClientBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      supabase.from('user_balances').select('main_balance, referral_balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('admin_assignments').select('id', { count: 'exact', head: true }).eq('assignee_id', user.id).eq('status', 'pending'),
      supabase.from('lesson_bookings').select('id, status, lesson_id, lessons!inner(id, title, lesson_date, start_time, end_time, teacher_id), teacher:lessons!inner(profiles!lessons_teacher_id_fkey(first_name, last_name))').eq('student_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]).then(([balanceRes, invitesRes, bookingsRes, notificationsRes]) => {
      if (balanceRes.data) setBalance(balanceRes.data);
      setPendingInvites(invitesRes.count || 0);
      setClientBookings(bookingsRes.data || []);
      setNotifications(notificationsRes.data || []);
    });
  }, [user]);

  const handleCopyId = () => {
    if (profile?.skillspot_id) {
      navigator.clipboard.writeText(profile.skillspot_id);
      setCopied(true);
      toast({ title: 'ID скопирован' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const NavButton = ({ item }: { item: { key: string; label: string; icon: any } }) => (
    <Button
      variant={activeSection === item.key ? 'default' : 'ghost'}
      className={`w-full justify-start gap-3 ${activeSection === item.key ? '' : 'text-muted-foreground'}`}
      onClick={() => setActiveSection(item.key)}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
      {item.key === 'requests' && pendingInvites > 0 && (
        <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">{pendingInvites}</Badge>
      )}
    </Button>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'bookings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Мои записи</CardTitle>
              <CardDescription>Полный список ваших записей</CardDescription>
            </CardHeader>
            <CardContent>
              {clientBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет записей</p>
                <Button className="mt-4" onClick={() => navigate('/catalog')}>Найти услугу</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientBookings.map((booking) => (
                    <div key={booking.id} className="p-4 rounded-lg border flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{(booking.lessons as any)?.title || 'Запись'}</p>
                        <p className="text-sm text-muted-foreground">
                          {(booking.lessons as any)?.lesson_date} · {(booking.lessons as any)?.start_time?.slice(0, 5)}
                        </p>
                      </div>
                      <Badge variant={booking.status === 'cancelled' ? 'destructive' : 'secondary'}>{booking.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'favorites':
        return <FavoritesSection userId={user?.id} navigate={navigate} />;

      case 'chats':
        return <TeachingChats />;

      case 'stats':
        return user ? <ClientStats userId={user.id} /> : null;

      case 'wallet':
        return <ClientWallet />;

      case 'referral':
        return <ClientReferral />;

      case 'requests':
        return <ClientRequests />;

      case 'support':
        return <SupportChat />;

      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>Последние уведомления по аккаунту</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">Уведомлений пока нет</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg border">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default: // overview
        return (
          <div className="space-y-6">
            {pendingInvites > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">У вас {pendingInvites} входящ{pendingInvites === 1 ? 'ее' : 'их'} назначени{pendingInvites === 1 ? 'е' : 'й'}</p>
                        <p className="text-sm text-muted-foreground">Перейдите в раздел «Запросы» для подтверждения</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveSection('requests')}>Перейти</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {profile?.first_name && profile?.last_name
                            ? `${profile.first_name} ${profile.last_name}`
                            : profile?.email || 'Пользователь'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="font-mono text-sm">ID: {profile?.skillspot_id}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                        <Settings className="h-4 w-4 mr-1" /> Настройки
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('bookings')}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Ближайшие записи</p>
                  <div className="mt-3 space-y-2">
                    {clientBookings.slice(0, 3).map((b) => (
                      <div key={b.id} className="text-sm p-2 rounded-md bg-muted/50">
                        <p className="font-medium truncate">{(b.lessons as any)?.title || 'Запись'}</p>
                        <p className="text-xs text-muted-foreground">{(b.lessons as any)?.lesson_date} · {(b.lessons as any)?.start_time?.slice(0, 5)}</p>
                      </div>
                    ))}
                    {clientBookings.length === 0 && <p className="text-sm text-muted-foreground">Нет предстоящих записей</p>}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">Открыть полный список</Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('wallet')}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Баланс</p>
                      <p className="text-3xl font-bold mt-1">{Number(balance.main_balance).toLocaleString()} ₽</p>
                      <p className="text-xs text-muted-foreground mt-1">Реферальный: {Number(balance.referral_balance).toLocaleString()} ₽</p>
                    </div>
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('notifications')}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Уведомления</p>
                  <p className="text-3xl font-bold mt-1">{notifications.filter(n => !n.is_read).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Непрочитанных</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/catalog')}>
                <CardContent className="pt-6 flex flex-col items-center justify-center">
                  <Search className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm font-medium">Поиск услуг</p>
                </CardContent>
              </Card>
            </div>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/catalog')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Найти услугу</p>
                    <p className="text-xs text-muted-foreground">Поиск мастеров и организаций</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/create-account')}>
              <CardContent className="pt-6 text-center">
                <Building2 className="h-10 w-10 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Создать бизнес-аккаунт</p>
                <p className="text-sm text-muted-foreground">Мастер, бизнес или сеть — выберите тип и начните работу</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex gap-6">
      <aside className="hidden lg:flex flex-col w-60 shrink-0">
        <div className="flex items-center gap-3 px-3 pb-6 border-b mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">Личный кабинет</p>
            <p className="text-xs text-muted-foreground">Клиент</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
          {menuItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>
        <div className="mt-auto pt-6 border-t">
          <div className="flex items-center gap-3 px-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.first_name || 'Пользователь'}</p>
              <p className="text-xs text-muted-foreground">Клиент</p>
            </div>
          </div>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex overflow-x-auto px-2 py-1">
        {menuItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs shrink-0 ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default ClientDashboard;
