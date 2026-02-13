import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, ClipboardList, Calendar, BarChart3, Percent, 
  DollarSign, Tag, UserPlus, Plus, Settings, ArrowRightLeft, AlertTriangle
} from 'lucide-react';

const BusinessDashboard = () => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      supabase
        .from('business_locations')
        .select('*')
        .eq('owner_id', user.id)
        .then(({ data }) => {
          setBusinesses(data || []);
          if (data && data.length > 0) setSelectedBusiness(data[0]);
          setLoading(false);
        });
    }
  }, [user]);

  const getSubscriptionBadge = () => {
    if (!selectedBusiness) return null;
    const s = selectedBusiness.subscription_status;
    if (s === 'trial') return <Badge className="bg-blue-500 text-white">Тестовый период</Badge>;
    if (s === 'active') return <Badge className="bg-emerald-500 text-white">Активна</Badge>;
    if (s === 'in_network') return <Badge className="bg-purple-500 text-white">В составе сети</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  if (!selectedBusiness && !loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Нет бизнес-точек</h2>
          <p className="text-muted-foreground">Создайте запрос на создание бизнеса в разделе Клиент.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedBusiness?.name || 'Бизнес'}</h2>
          <p className="text-muted-foreground">{selectedBusiness?.address || 'Адрес не указан'}</p>
        </div>
        <div className="flex items-center gap-2">
          {getSubscriptionBadge()}
          <Badge variant="outline">1 499 ₽/мес</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" /> Точка</TabsTrigger>
          <TabsTrigger value="masters"><Users className="h-4 w-4 mr-1" /> Мастера</TabsTrigger>
          <TabsTrigger value="services"><ClipboardList className="h-4 w-4 mr-1" /> Услуги</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="h-4 w-4 mr-1" /> Расписание</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1" /> Клиенты</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="h-4 w-4 mr-1" /> Финансы</TabsTrigger>
          <TabsTrigger value="promos"><Percent className="h-4 w-4 mr-1" /> Промо</TabsTrigger>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Дашборд</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Информация о точке</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><span className="text-muted-foreground">Название:</span> {selectedBusiness?.name}</div>
                <div><span className="text-muted-foreground">ИНН:</span> {selectedBusiness?.inn}</div>
                <div><span className="text-muted-foreground">Адрес:</span> {selectedBusiness?.address || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span> {selectedBusiness?.contact_email || '—'}</div>
                <div><span className="text-muted-foreground">Телефон:</span> {selectedBusiness?.contact_phone || '—'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Управление</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ArrowRightLeft className="h-4 w-4" /> Передать управление
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <UserPlus className="h-4 w-4" /> Назначить менеджера
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="masters">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Мастера</CardTitle>
                  <CardDescription>3 бесплатных, каждый доп. +500 ₽/мес</CardDescription>
                </div>
                <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Пригласить по ID</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Пригласите мастеров по их SkillSpot ID</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Каталог услуг</CardTitle>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Нет услуг</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Общее расписание</CardTitle>
              <CardDescription>С разбивкой по мастерам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Расписание будет доступно после добавления мастеров</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Клиентская база</CardTitle>
                <Button size="sm" variant="outline"><Tag className="h-4 w-4 mr-1" /> Теги</Button>
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

        <TabsContent value="finance">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">0 ₽</p>
                <p className="text-sm text-muted-foreground">Доход</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">0 ₽</p>
                <p className="text-sm text-muted-foreground">Расход</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">0 ₽</p>
                <p className="text-sm text-muted-foreground">Комиссия</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">0 ₽</p>
                <p className="text-sm text-muted-foreground">Прибыль</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Учёт доходов/расходов</CardTitle>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить запись</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Нет записей</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Промоакции</CardTitle>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Создать</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Percent className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Нет активных акций</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Дашборд бизнеса</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Мастеров</p>
                </div>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки бизнеса</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Редактировать информацию</Button>
              <Button variant="outline" className="w-full justify-start">Загрузить фото интерьера/экстерьера</Button>
              <Button variant="outline" className="w-full justify-start">Настройки комиссий</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
