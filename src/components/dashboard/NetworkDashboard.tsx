import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, Building2, Users, BarChart3, DollarSign, Heart, 
  Plus, Settings
} from 'lucide-react';
import ProfileCompletionCheck from './ProfileCompletionCheck';
import SubscriptionManager from './SubscriptionManager';

const NetworkDashboard = () => {
  const { user } = useAuth();
  const [networks, setNetworks] = useState<any[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNetworks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('networks').select('*').eq('owner_id', user.id);
    setNetworks(data || []);
    if (data && data.length > 0) {
      setSelectedNetwork(data[0]);
      const { data: locs } = await supabase.from('business_locations').select('*').eq('network_id', data[0].id);
      setLocations(locs || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNetworks(); }, [fetchNetworks]);

  if (!selectedNetwork && !loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Нет сетей</h2>
          <p className="text-muted-foreground">Создайте бизнес-аккаунт типа «Сеть» в разделе Клиент.</p>
        </CardContent>
      </Card>
    );
  }

  const showCompletion = selectedNetwork?.moderation_status !== 'approved';

  return (
    <div className="space-y-6">
      {showCompletion && selectedNetwork && (
        <ProfileCompletionCheck
          entityType="network"
          entityData={selectedNetwork}
          onProfileUpdated={fetchNetworks}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedNetwork?.name || 'Сеть'}</h2>
          <p className="text-muted-foreground">{locations.length} точек</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedNetwork?.moderation_status === 'approved' && <Badge variant="outline">Опубликован</Badge>}
          {selectedNetwork?.moderation_status === 'pending' && <Badge>На модерации</Badge>}
          {selectedNetwork?.moderation_status === 'draft' && <Badge variant="secondary">Черновик</Badge>}
          <Badge variant="outline">Про · 6 490 ₽/мес</Badge>
        </div>
      </div>

      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="locations"><Building2 className="h-4 w-4 mr-1" /> Точки</TabsTrigger>
          <TabsTrigger value="masters"><Users className="h-4 w-4 mr-1" /> Мастера</TabsTrigger>
          <TabsTrigger value="clients"><Heart className="h-4 w-4 mr-1" /> CRM</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="h-4 w-4 mr-1" /> Финансы</TabsTrigger>
          <TabsTrigger value="subscription">Подписка</TabsTrigger>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Дашборд</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Точки сети</CardTitle>
                  <CardDescription>3 бесплатных, каждая доп. +1 200 ₽/мес</CardDescription>
                </div>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить точку</Button>
              </div>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Нет точек</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-sm text-muted-foreground">{loc.address || 'Адрес не указан'}</p>
                      </div>
                      <Badge variant={loc.is_active ? 'default' : 'secondary'}>
                        {loc.is_active ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masters">
          <Card>
            <CardHeader><CardTitle>Все мастера сети</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Мастера появятся после добавления точек</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader><CardTitle>Общая CRM / База клиентов</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Система лояльности и клиентская база</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader><CardTitle>Общие финансы сети</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {['Общий доход', 'Общий расход', 'Прибыль'].map(label => (
                  <div key={label} className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">0 ₽</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionManager
            entityType="network"
            subscriptionStatus={selectedNetwork?.subscription_status || 'trial'}
            trialStartDate={selectedNetwork?.trial_start_date}
            trialDays={14}
            lastPaymentDate={selectedNetwork?.last_payment_date}
            basePrice={6490}
            parentManaged={false}
            parentLabel=""
          />
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader><CardTitle>Дашборд сети</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { val: locations.length, label: 'Точек' },
                  { val: 0, label: 'Мастеров' },
                  { val: '—', label: 'Ср. рейтинг' },
                  { val: 0, label: 'Клиентов' },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{item.val}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Настройки сети</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Редактировать информацию</Button>
              <Button variant="outline" className="w-full justify-start">Управление менеджерами</Button>
              <Button variant="outline" className="w-full justify-start">Передать управление</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkDashboard;
