import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search, Heart, Calendar, Wallet, MessageSquare,
  Copy, Check, Gift, ArrowUpRight, Building2, Shield, Loader2,
  LayoutDashboard, Star, Settings, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const sidebarMenu = [
  { key: 'overview', label: 'Главная', icon: LayoutDashboard },
  { key: 'bookings', label: 'Мои записи', icon: Calendar },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'messages', label: 'Сообщения', icon: MessageSquare },
  { key: 'wallet', label: 'Баланс', icon: Wallet },
];

const sidebarManage = [
  { key: 'requests', label: 'Запросы', icon: Shield },
  { key: 'settings', label: 'Настройки', icon: Settings, route: '/settings' },
];

const ClientDashboard = () => {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ main_balance: 0, referral_balance: 0 });
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('user_balances').select('main_balance, referral_balance').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => { if (data) setBalance(data); });
      supabase.from('referral_codes').select('code').eq('user_id', user.id).eq('is_active', true).maybeSingle()
        .then(({ data }) => { if (data) setReferralCode(data.code); });
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

  const handleCopyReferral = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({ title: 'Код скопирован' });
    }
  };

  const handleCreateReferralCode = async () => {
    if (!user) return;
    setCreatingCode(true);
    try {
      const code = 'REF-' + profile?.skillspot_id + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data, error } = await supabase.from('referral_codes').insert({ user_id: user.id, code, is_active: true }).select('code').single();
      if (error) throw error;
      setReferralCode(data.code);
      toast({ title: 'Реферальный код создан', description: `Ваш код: ${data.code}` });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setCreatingCode(false);
  };

  const getInitials = () =>
    `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase() || '?';

  const handleNavClick = (item: { key: string; route?: string }) => {
    if (item.route) {
      navigate(item.route);
    } else {
      setActiveSection(item.key);
    }
  };

  const NavItem = ({ item }: { item: { key: string; label: string; icon: any; route?: string } }) => {
    const isActive = !item.route && activeSection === item.key;
    return (
      <button
        onClick={() => handleNavClick(item)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'bookings':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-1">Мои записи</h2>
            <p className="text-sm text-muted-foreground mb-6">История ваших записей на услуги</p>
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-4">У вас пока нет записей</p>
                <Button onClick={() => navigate('/catalog')}>Найти услугу</Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'favorites':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-1">Избранное</h2>
            <p className="text-sm text-muted-foreground mb-6">Сохранённые мастера и организации</p>
            <Card>
              <CardContent className="py-16 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Вы ещё ничего не добавили в избранное</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'messages':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-1">Сообщения</h2>
            <p className="text-sm text-muted-foreground mb-6">Переписка с мастерами и организациями</p>
            <Card>
              <CardContent className="py-16 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Нет сообщений</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'wallet':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-1">Баланс</h2>
            <p className="text-sm text-muted-foreground mb-6">Управление финансами</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Основной баланс</p>
                  <p className="text-3xl font-display font-bold mb-4">{Number(balance.main_balance).toFixed(0)} ₽</p>
                  <div className="space-y-2">
                    <Button className="w-full" size="sm">Пополнить</Button>
                    <Button variant="outline" className="w-full" size="sm">Вывести</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Реферальный баланс</p>
                  <p className="text-3xl font-display font-bold mb-4">{Number(balance.referral_balance).toFixed(0)} ₽</p>
                  <Button variant="outline" className="w-full" size="sm">
                    <ArrowUpRight className="h-4 w-4 mr-1" /> Перевести на основной
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'requests':
        return (
          <div>
            <h2 className="text-xl font-display font-bold mb-1">Мои запросы</h2>
            <p className="text-sm text-muted-foreground mb-6">Запросы на изменение ролей</p>
            <Card>
              <CardContent className="py-16 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Нет активных запросов</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold mb-1">
                Добро пожаловать{profile?.first_name ? `, ${profile.first_name}` : ''}! 👋
              </h2>
              <p className="text-sm text-muted-foreground">Ваш личный кабинет</p>
            </div>

            {/* Quick stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('wallet')}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Баланс</p>
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-display font-bold">{Number(balance.main_balance).toFixed(0)} ₽</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('bookings')}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Записи</p>
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-display font-bold">0</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveSection('favorites')}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Избранное</p>
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-display font-bold">0</p>
                </CardContent>
              </Card>
            </div>

            {/* Profile card */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-display text-lg">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-lg">
                      {profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : profile?.email || 'Пользователь'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">ID: {profile?.skillspot_id}</span>
                      <button onClick={handleCopyId} className="text-muted-foreground hover:text-foreground">
                        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                    Редактировать
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Referral */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold">Реферальная программа</p>
                    <p className="text-sm text-muted-foreground">Приглашайте друзей и зарабатывайте</p>
                  </div>
                  {referralCode ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                      <code className="text-sm font-mono">{referralCode}</code>
                      <button onClick={handleCopyReferral} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleCreateReferralCode} disabled={creatingCode}>
                      {creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4 mr-1" />}
                      Создать код
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/catalog')}>
                <CardContent className="pt-5 pb-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">Найти услугу</p>
                    <p className="text-sm text-muted-foreground">Каталог мастеров и организаций</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed" onClick={() => navigate('/create-account')}>
                <CardContent className="pt-5 pb-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">Стать партнёром</p>
                    <p className="text-sm text-muted-foreground">Мастер, бизнес или сеть</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-20 space-y-6">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
            <div className="space-y-0.5">
              {sidebarMenu.map(item => <NavItem key={item.key} item={item} />)}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Управление</p>
            <div className="space-y-0.5">
              {sidebarManage.map(item => <NavItem key={item.key} item={item} />)}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex px-1">
        {sidebarMenu.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              activeSection === item.key ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default ClientDashboard;
