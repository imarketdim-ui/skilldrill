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
  Copy, Check, Gift, Building2, Shield, Loader2,
  LayoutDashboard, Star, Settings, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TeachingChats from '@/components/dashboard/teaching/TeachingChats';
import ClientRequests from '@/components/dashboard/client/ClientRequests';
import ClientWallet from '@/components/dashboard/client/ClientWallet';
import ClientReferral from '@/components/dashboard/client/ClientReferral';
import ClientStats from '@/components/dashboard/client/ClientStats';

const menuItems = [
  { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { key: 'bookings', label: 'Мои записи', icon: Calendar },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'chats', label: 'Чаты', icon: MessageSquare },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'wallet', label: 'Баланс', icon: Wallet },
  { key: 'referral', label: 'Рефералы', icon: Gift },
  { key: 'requests', label: 'Запросы', icon: Shield },
];

const ClientDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ main_balance: 0, referral_balance: 0 });
  const [pendingInvites, setPendingInvites] = useState(0);

  useEffect(() => {
    if (user) {
      supabase.from('user_balances').select('main_balance, referral_balance').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setBalance(data); });
      // Check pending admin invites
      supabase.from('admin_assignments').select('id', { count: 'exact', head: true })
        .eq('assignee_id', user.id).eq('status', 'pending')
        .then(({ count }) => { setPendingInvites(count || 0); });
    }
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
              <CardDescription>История записей на услуги</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>У вас пока нет записей</p>
                <Button className="mt-4" onClick={() => navigate('/')}>Найти услугу</Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'favorites':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Избранное</CardTitle>
              <CardDescription>Организации, мастера и услуги</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Вы ещё ничего не добавили в избранное</p>
              </div>
            </CardContent>
          </Card>
        );

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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-3">Быстрые действия</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" size="sm" onClick={() => navigate('/')}>
                      <Search className="h-4 w-4" /> Найти услугу
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" size="sm" onClick={() => navigate('/settings')}>
                      <Star className="h-4 w-4" /> Настройки профиля
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('referral')}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Реферальная программа</p>
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <span className="text-sm">Приглашайте друзей и зарабатывайте</span>
                  </div>
                </CardContent>
              </Card>
            </div>

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
