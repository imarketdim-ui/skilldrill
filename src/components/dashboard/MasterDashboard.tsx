import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, ClipboardList, Users, Star, BarChart3, Settings, 
  Plus, Ban, Tag, Percent, AlertTriangle
} from 'lucide-react';

const MasterDashboard = () => {
  const { user } = useAuth();
  const [masterProfile, setMasterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      supabase
        .from('master_profiles')
        .select('*, service_categories(name)')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setMasterProfile(data);
          setLoading(false);
        });
    }
  }, [user]);

  const getSubscriptionBadge = () => {
    if (!masterProfile) return null;
    const status = masterProfile.subscription_status;
    if (status === 'trial') return <Badge className="bg-blue-500 text-white">Тестовый период</Badge>;
    if (status === 'active') return <Badge className="bg-emerald-500 text-white">Активна</Badge>;
    if (status === 'in_business') return <Badge className="bg-purple-500 text-white">В составе бизнеса</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  const isSubscriptionActive = () => {
    if (!masterProfile) return false;
    const status = masterProfile.subscription_status;
    if (status === 'active' || status === 'in_business') return true;
    if (status === 'trial') {
      const trialEnd = new Date(masterProfile.trial_start_date);
      trialEnd.setDate(trialEnd.getDate() + masterProfile.trial_days);
      return new Date() < trialEnd;
    }
    return false;
  };

  if (!isSubscriptionActive() && masterProfile) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Подписка неактивна</h2>
          <p className="text-muted-foreground mb-4">
            Ваши данные сохранены, но интерфейс мастера недоступен. Оплатите подписку (1 000 ₽/мес) для продолжения работы.
          </p>
          {masterProfile.business_id && (
            <p className="text-sm text-muted-foreground mb-4">
              Бизнес, к которому вы привязаны, не активен. Вы можете покинуть бизнес.
            </p>
          )}
          <Button>Оплатить подписку</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Панель мастера</h2>
          <p className="text-muted-foreground">
            {masterProfile?.service_categories?.name || 'Категория не выбрана'}
          </p>
        </div>
        {getSubscriptionBadge()}
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="services"><ClipboardList className="h-4 w-4 mr-1" /> Услуги</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="h-4 w-4 mr-1" /> Расписание</TabsTrigger>
          <TabsTrigger value="bookings"><ClipboardList className="h-4 w-4 mr-1" /> Записи</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1" /> Клиенты</TabsTrigger>
          <TabsTrigger value="promos"><Percent className="h-4 w-4 mr-1" /> Промо</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" /> Дашборд</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Мои услуги</CardTitle>
                  <CardDescription>До {masterProfile?.max_services || 10} услуг</CardDescription>
                </div>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Добавьте свою первую услугу</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Моё расписание</CardTitle>
              <CardDescription>Управление рабочим временем</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Настройте дни и часы работы</p>
                <Button variant="outline" className="mt-3">Настроить расписание</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Записи клиентов</CardTitle>
              <CardDescription>Подтверждение и управление записями (до {masterProfile?.max_monthly_bookings || 100} в месяц)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Нет активных записей</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Клиенты</CardTitle>
                  <CardDescription>Теги, оценки и черный список</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"><Tag className="h-4 w-4 mr-1" /> Теги</Button>
                  <Button size="sm" variant="outline"><Ban className="h-4 w-4 mr-1" /> Чёрный список</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Клиентская база пуста</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Промоакции и скидки</CardTitle>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Создать</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Percent className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Создайте первую акцию для привлечения клиентов</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Дашборд</CardTitle>
              <CardDescription>Показатели за период</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Записей</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0 ₽</p>
                  <p className="text-sm text-muted-foreground">Доход</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">Рейтинг</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Клиентов</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDashboard;
