import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, ClipboardList, Calendar, BarChart3, Percent, 
  DollarSign, Tag, UserPlus, Plus, Settings, ArrowRightLeft
} from 'lucide-react';
import ProfileCompletionCheck from './ProfileCompletionCheck';
import SubscriptionManager from './SubscriptionManager';

const BusinessDashboard = () => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('business_locations').select('*').eq('owner_id', user.id);
    setBusinesses(data || []);
    if (data && data.length > 0) setSelectedBusiness(data[0]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const getSubscriptionBadge = () => {
    if (!selectedBusiness) return null;
    const s = selectedBusiness.subscription_status;
    if (s === 'trial') return <Badge variant="secondary">Тестовый период</Badge>;
    if (s === 'active') return <Badge variant="default">Активна</Badge>;
    if (s === 'in_network') return <Badge variant="outline">В составе сети</Badge>;
    return <Badge variant="destructive">Неактивна</Badge>;
  };

  if (!selectedBusiness && !loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Нет бизнес-точек</h2>
          <p className="text-muted-foreground">Создайте бизнес-аккаунт в разделе Клиент.</p>
        </CardContent>
      </Card>
    );
  }

  const showCompletion = selectedBusiness?.moderation_status !== 'approved';

  return (
    <div className="space-y-6">
      {showCompletion && selectedBusiness && (
        <ProfileCompletionCheck
          entityType="business"
          entityData={selectedBusiness}
          onProfileUpdated={fetchBusinesses}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedBusiness?.name || 'Бизнес'}</h2>
          <p className="text-muted-foreground">{selectedBusiness?.address || 'Адрес не указан'}</p>
        </div>
        <div className="flex items-center gap-2">
          {getSubscriptionBadge()}
          {selectedBusiness?.moderation_status === 'approved' && <Badge variant="outline">В каталоге</Badge>}
          {selectedBusiness?.moderation_status === 'pending' && <Badge>На модерации</Badge>}
          {selectedBusiness?.moderation_status === 'draft' && <Badge variant="secondary">Черновик</Badge>}
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
          <TabsTrigger value="subscription">Подписка</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Информация о точке</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><span className="text-muted-foreground">Название:</span> {selectedBusiness?.name}</div>
                <div><span className="text-muted-foreground">ИНН:</span> {selectedBusiness?.inn}</div>
                <div><span className="text-muted-foreground">Адрес:</span> {selectedBusiness?.address || '—'}</div>
                <div><span className="text-muted-foreground">ФИО директора:</span> {selectedBusiness?.director_name || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span> {selectedBusiness?.contact_email || '—'}</div>
                <div><span className="text-muted-foreground">Телефон:</span> {selectedBusiness?.contact_phone || '—'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Управление</CardTitle></CardHeader>
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
            {['Доход', 'Расход', 'Комиссия', 'Прибыль'].map(label => (
              <Card key={label}>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold">0 ₽</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionManager
            entityType="business"
            subscriptionStatus={selectedBusiness?.subscription_status || 'trial'}
            trialStartDate={selectedBusiness?.trial_start_date}
            trialDays={14}
            lastPaymentDate={selectedBusiness?.last_payment_date}
            basePrice={2490}
            parentManaged={selectedBusiness?.subscription_status === 'in_network'}
            parentLabel="Управляется сетью"
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Настройки бизнеса</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Редактировать информацию</Button>
              <Button variant="outline" className="w-full justify-start">Настройки комиссий</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
