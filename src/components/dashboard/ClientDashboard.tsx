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
  Copy, Check, Gift, ArrowUpRight, Building2, Shield, Loader2,
  LayoutDashboard, Star, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const menuItems = [
  { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { key: 'bookings', label: 'Мои записи', icon: Calendar },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'wallet', label: 'Баланс', icon: Wallet },
  { key: 'requests', label: 'Запросы', icon: Shield },
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

  const NavButton = ({ item }: { item: { key: string; label: string; icon: any } }) => {
    const isActive = activeSection === item.key;
    return (
      <button
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
        onClick={() => setActiveSection(item.key)}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </button>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'bookings':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Мои записи</CardTitle>
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
              <CardTitle className="font-display">Избранное</CardTitle>
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

      case 'wallet':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display">Основной баланс</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-display font-bold mb-4">{Number(balance.main_balance).toFixed(0)} ₽</p>
                <div className="space-y-2">
                  <Button className="w-full">Пополнить баланс</Button>
                  <Button variant="outline" className="w-full">Вывести на карту</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display">Реферальный баланс</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-display font-bold mb-4">{Number(balance.referral_balance).toFixed(0)} ₽</p>
                <Button variant="outline" className="w-full">
                  <ArrowUpRight className="h-4 w-4 mr-2" /> Перевести на основной
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'requests':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Мои запросы</CardTitle>
              <CardDescription>Запросы на изменение ролей</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет активных запросов</p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-display">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-display font-semibold">
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

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Баланс</p>
                      <p className="text-3xl font-display font-bold mt-1">{Number(balance.main_balance).toFixed(0)} ₽</p>
                      <p className="text-xs text-muted-foreground mt-1">Реферальный: {Number(balance.referral_balance).toFixed(0)} ₽</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
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

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Реферальная программа</p>
                  {referralCode ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                      <code className="text-sm font-mono flex-1 truncate">{referralCode}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopyReferral}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={handleCreateReferralCode} disabled={creatingCode}>
                      {creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                      Создать реферальный код
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Role Upgrade */}
            <Card className="border-dashed cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate('/create-account')}>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <p className="font-display font-semibold">Создать бизнес-аккаунт</p>
                <p className="text-sm text-muted-foreground">Мастер, бизнес или сеть — выберите тип и начните работу</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0">
        <div className="flex items-center gap-3 px-3 pb-5 border-b border-border/50 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Личный кабинет</p>
            <p className="text-xs text-muted-foreground">Клиент</p>
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Меню</p>
          {menuItems.map(item => <NavButton key={item.key} item={item} />)}
        </div>

        <div className="mt-auto pt-5 border-t border-border/50">
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

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-50 flex overflow-x-auto px-2 py-1">
        {menuItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs shrink-0 transition-colors ${activeSection === item.key ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">
        {renderContent()}
      </div>
    </div>
  );
};

export default ClientDashboard;
