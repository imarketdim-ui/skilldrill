import { useState, useEffect } from 'react';
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

const NetworkDashboard = () => {
  const { user } = useAuth();
  const [networks, setNetworks] = useState<any[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      supabase
        .from('networks')
        .select('*')
        .eq('owner_id', user.id)
        .then(({ data }) => {
          setNetworks(data || []);
          if (data && data.length > 0) {
            setSelectedNetwork(data[0]);
            supabase
              .from('business_locations')
              .select('*')
              .eq('network_id', data[0].id)
              .then(({ data: locs }) => setLocations(locs || []));
          }
          setLoading(false);
        });
    }
  }, [user]);

  if (!selectedNetwork && !loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Нет сетей</h2>
          <p className="text-muted-foreground">Создайте запрос на создание сети в разделе Клиент.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedNetwork?.name || 'Сеть'}</h2>
          <p className="text-muted-foreground">{locations.length} точек</p>
        </div>
        <Badge variant="outline">3 000 ₽/мес + 1 000 ₽/доп. точка</Badge>
      </div>

      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="locations"><Building2 className="h-4 w-4 mr-1" /> Точки</TabsTrigger>
          <TabsTrigger value="masters"><Users className="h-4 w-4 mr-1" /> Мастера</TabsTrigger>
          <TabsTrigger value="clients"><Heart className="h-4 w-4 mr-1" /> CRM</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="h-4 w-4 mr-1" /> Финансы</TabsTrigger>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Дашборд</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Точки сети</CardTitle>
                  <CardDescription>3 бесплатных, каждая доп. +1 000 ₽/мес</CardDescription>
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
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0 ₽</p>
                  <p className="text-sm text-muted-foreground">Общий доход</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0 ₽</p>
                  <p className="text-sm text-muted-foreground">Общий расход</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0 ₽</p>
                  <p className="text-sm text-muted-foreground">Прибыль</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader><CardTitle>Дашборд сети</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{locations.length}</p>
                  <p className="text-sm text-muted-foreground">Точек</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Мастеров</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">Ср. рейтинг</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Клиентов</p>
                </div>
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
