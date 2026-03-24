import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedBookings, getUniqueClients } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Users, Banknote, AlertTriangle, Clock, CheckCircle, MessageSquare, User, ExternalLink } from 'lucide-react';
import { format, isToday, formatDistanceToNow, startOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CategoryConfig } from './categoryConfig';

interface Props { config: CategoryConfig; }

const UniversalDashboardHome = ({ config }: Props) => {
  const { user, profile } = useAuth();
  const { bookings, loading: bookingsLoading } = useUnifiedBookings(user?.id);
  const [masterProfile, setMasterProfile] = useState<any>(null);
  const [serviceCount, setServiceCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('master_profiles')
      .select('*, service_categories(name)')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setMasterProfile(data));
    supabase.from('services').select('id', { count: 'exact' })
      .eq('master_id', user.id).eq('is_active', true)
      .then(({ count }) => setServiceCount(count || 0));
  }, [user]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

    const todayBookings = bookings.filter(b => b.date.startsWith(today));
    const clients = getUniqueClients(bookings);

    const currentMonthCompleted = bookings.filter(b => b.status === 'completed' && new Date(b.date) >= monthStart);
    const lastMonthCompleted = bookings.filter(b => b.status === 'completed' && new Date(b.date) >= lastMonthStart && new Date(b.date) < monthStart);

    const currentIncome = currentMonthCompleted.reduce((s, b) => s + b.price, 0);
    const lastIncome = lastMonthCompleted.reduce((s, b) => s + b.price, 0);

    const noShows = bookings.filter(b => b.status === 'no_show' && new Date(b.date) >= monthStart).length;

    return {
      todaySessions: todayBookings.length,
      todayIndividual: todayBookings.filter(b => b.type === 'individual').length,
      todayGroup: todayBookings.filter(b => b.type === 'group').length,
      totalClients: clients.length,
      monthIncome: currentIncome,
      incomeGrowth: lastIncome > 0 ? Math.round(((currentIncome - lastIncome) / lastIncome) * 100) : 0,
      noShows,
    };
  }, [bookings]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return bookings
      .filter(b => new Date(b.date) >= now && (b.status === 'scheduled' || b.status === 'confirmed' || b.status === 'pending'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [bookings]);

  const recentEvents = useMemo(() => bookings.slice(0, 5), [bookings]);

  const getInitials = (firstName?: string | null, lastName?: string | null) =>
    `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?';

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return isToday(date) ? 'Сегодня' : format(date, 'd MMM', { locale: ru });
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <div className="p-2 rounded-full bg-primary/10"><User className="h-4 w-4 text-primary" /></div>;
      case 'completed': return <div className="p-2 rounded-full bg-primary/10"><CheckCircle className="h-4 w-4 text-primary" /></div>;
      case 'cancelled': return <div className="p-2 rounded-full bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /></div>;
      default: return <div className="p-2 rounded-full bg-muted"><MessageSquare className="h-4 w-4 text-muted-foreground" /></div>;
    }
  };

  const getActivityText = (b: typeof bookings[0]) => {
    switch (b.status) {
      case 'confirmed': case 'pending': return `${b.clientName} записался`;
      case 'completed': return `${b.serviceName} с ${b.clientName} завершён`;
      case 'cancelled': return `${b.clientName} отменил запись`;
      default: return `${b.clientName} — ${b.serviceName}`;
    }
  };

  const IconComponent = config.icon;

  return (
    <div className="space-y-6">
      {serviceCount === 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-sm">Нет услуг</p>
              <p className="text-xs text-muted-foreground">Добавьте хотя бы одну услугу, чтобы стать видимым в поиске и принимать записи.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { const ev = new CustomEvent('navigate-dashboard', { detail: 'services' }); window.dispatchEvent(ev); }} className="ml-auto shrink-0">
              Добавить
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Добро пожаловать! {config.welcomeEmoji}</h2>
          <p className="text-muted-foreground">Вот что происходит сегодня</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(profile?.first_name, profile?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold truncate">{profile?.first_name} {profile?.last_name}</h3>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                    {masterProfile?.description || 'Добавьте описание в настройках профиля'}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={() => { const ev = new CustomEvent('navigate-dashboard', { detail: 'profile' }); window.dispatchEvent(ev); }}>Редактировать</Button>
              </div>
              {masterProfile?.service_categories?.name && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="gap-1">
                    <IconComponent className="h-3 w-3" />
                    {masterProfile.service_categories.name}
                  </Badge>
                </div>
              )}
              {masterProfile?.social_links && Object.values(masterProfile.social_links).some(Boolean) && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {masterProfile.social_links.vk && (
                    <a href={`https://vk.com/${masterProfile.social_links.vk}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> VK</a>
                  )}
                  {masterProfile.social_links.instagram && (
                    <a href={`https://instagram.com/${masterProfile.social_links.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Instagram</a>
                  )}
                  {masterProfile.social_links.youtube && (
                    <a href={masterProfile.social_links.youtube} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> YouTube</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity" onClick={() => { window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'schedule' })); }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm opacity-90">Сегодня</p>
                <p className="text-3xl font-bold mt-1">{stats.todaySessions}</p>
                <p className="text-xs opacity-75 mt-1 truncate">{stats.todayIndividual} инд., {stats.todayGroup} гр.</p>
              </div>
              <Calendar className="h-5 w-5 opacity-75 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'clients' })); }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">{config.clientNamePlural}</p>
                <p className="text-3xl font-bold mt-1">{stats.totalClients}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity" onClick={() => { window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'finances' })); }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm opacity-90">Доход</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">₽{stats.monthIncome.toLocaleString()}</p>
                {stats.incomeGrowth !== 0 && (
                  <p className="text-xs opacity-75 mt-1">{stats.incomeGrowth > 0 ? '+' : ''}{stats.incomeGrowth}%</p>
                )}
              </div>
              <Banknote className="h-5 w-5 opacity-75 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'stats' })); }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Неявки</p>
                <p className="text-3xl font-bold mt-1">{stats.noShows}</p>
                <p className="text-xs text-muted-foreground mt-1">За месяц</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'schedule' })); }}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Ближайшие</CardTitle>
            <Badge variant="secondary">{upcomingSessions.length}</Badge>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Нет предстоящих записей</p>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map(s => {
                  const initials = getInitials(s.clientFirstName, s.clientLastName);
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="text-center shrink-0 w-16">
                        <p className="text-xs text-muted-foreground">{getDateLabel(s.date)}</p>
                        <p className="text-lg font-bold">{s.startTime?.slice(0, 5) || '—'}</p>
                      </div>
                      <div className="w-px h-10 bg-border" />
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{s.clientName || s.serviceName}</p>
                        <Badge variant={s.type === 'group' ? 'secondary' : 'outline'} className="text-xs mt-0.5">
                          {s.source === 'lesson' ? (s.type === 'group' ? 'Группа' : 'Индивидуально') : s.serviceName}
                        </Badge>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { window.dispatchEvent(new CustomEvent('navigate-dashboard', { detail: 'clients' })); }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Последняя активность</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Нет событий</p>
            ) : (
              <div className="space-y-4">
                {recentEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3">
                    {getActivityIcon(event.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{getActivityText(event)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.date), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UniversalDashboardHome;
