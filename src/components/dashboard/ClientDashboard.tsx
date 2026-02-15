import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Heart, Calendar, Star, Wallet, Users, MessageSquare, 
  AlertTriangle, Copy, Check, Gift, ArrowUpRight, Wrench, Building2, Globe, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ClientDashboard = () => {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ main_balance: 0, referral_balance: 0 });

  useEffect(() => {
    if (user) {
      supabase
        .from('user_balances')
        .select('main_balance, referral_balance')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setBalance(data);
        });
    }
  }, [user]);

  const handleCopyId = () => {
    if (profile?.skillspot_id) {
      navigator.clipboard.writeText(profile.skillspot_id);
      setCopied(true);
      toast({ title: 'ID скопирован', description: 'Ваш SkillSpot ID скопирован' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canRequestRole = (role: string) => !roles.includes(role as any);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {profile?.first_name?.[0] || profile?.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile?.email || 'Пользователь'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="font-mono text-sm">
                ID: {profile?.skillspot_id}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="bookings"><Calendar className="h-4 w-4 mr-1" /> Мои записи</TabsTrigger>
          <TabsTrigger value="favorites"><Heart className="h-4 w-4 mr-1" /> Избранное</TabsTrigger>
          <TabsTrigger value="wallet"><Wallet className="h-4 w-4 mr-1" /> Баланс</TabsTrigger>
          <TabsTrigger value="requests">Запросы</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Balance Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Баланс</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{Number(balance.main_balance).toFixed(0)} ₽</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Реферальный: {Number(balance.referral_balance).toFixed(0)} ₽
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/')}>
                  <Search className="h-4 w-4" /> Найти услугу
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/settings')}>
                  <Star className="h-4 w-4" /> Настройки профиля
                </Button>
              </CardContent>
            </Card>

            {/* Referral */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Реферальная программа</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Приглашайте друзей и зарабатывайте</p>
                <Button variant="outline" className="w-full gap-2">
                  <Gift className="h-4 w-4" /> Создать реферальный код
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Role Upgrade Cards */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Расширьте возможности</h3>
            <div className="grid gap-4 md:grid-cols-1">
              {canRequestRole('master') && (
                <Card className="border-dashed cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/request-role?type=master')}>
                  <CardContent className="pt-6 text-center">
                    <Wrench className="h-10 w-10 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">Стать мастером</p>
                    <p className="text-sm text-muted-foreground">Выберите категорию и начните принимать клиентов · 1 000 ₽/мес</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bookings">
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
        </TabsContent>

        <TabsContent value="favorites">
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
        </TabsContent>

        <TabsContent value="wallet">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Основной баланс</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">{Number(balance.main_balance).toFixed(0)} ₽</p>
                <div className="space-y-2">
                  <Button className="w-full">Пополнить баланс</Button>
                  <Button variant="outline" className="w-full">Вывести на карту</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Реферальный баланс</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">{Number(balance.referral_balance).toFixed(0)} ₽</p>
                <Button variant="outline" className="w-full">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Перевести на основной баланс
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Мои запросы</CardTitle>
              <CardDescription>Запросы на изменение ролей</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет активных запросов</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;
