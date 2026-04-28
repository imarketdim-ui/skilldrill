import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, Loader2, BriefcaseBusiness, ShieldCheck, CircleHelp } from 'lucide-react';
import SupportChat from './SupportChat';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('manager_clients')
        .select('*, client:profiles!manager_clients_client_id_fkey(id, first_name, last_name, email, avatar_url, skillspot_id, phone, created_at)')
        .eq('manager_id', user.id)
        .eq('is_active', true);
      setClients(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Менеджер площадки</h2>
        <p className="text-muted-foreground mt-1">Работа с закреплёнными клиентами, сопровождением и первичной поддержкой без доступа к административным разделам платформы.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{clients.length}</p>
            <p className="text-sm text-muted-foreground">Клиентов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Безопасный контур</p>
            <p className="text-sm text-muted-foreground">Нет доступа к модерации и системным настройкам</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BriefcaseBusiness className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Операционная роль</p>
            <p className="text-sm text-muted-foreground">Фокус на сопровождении и удержании клиентов</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1" /> Мои клиенты</TabsTrigger>
          <TabsTrigger value="support"><MessageSquare className="h-4 w-4 mr-1" /> Поддержка</TabsTrigger>
          <TabsTrigger value="scope"><CircleHelp className="h-4 w-4 mr-1" /> Область доступа</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Привязанные клиенты</CardTitle>
              <CardDescription>Клиенты, назначенные вам администратором</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : clients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет привязанных клиентов</p>
                  <p className="text-sm mt-1">Администратор может назначить вам клиентов</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.map((mc: any) => {
                    const c = mc.client;
                    return (
                      <div key={mc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={c?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {`${(c?.first_name || '')[0] || ''}${(c?.last_name || '')[0] || ''}`.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{c?.first_name} {c?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{c?.email}</p>
                          <p className="text-xs text-muted-foreground font-mono">ID: {c?.skillspot_id}</p>
                        </div>
                        {c?.phone && <Badge variant="outline" className="text-xs">{c.phone}</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <SupportChat />
        </TabsContent>

        <TabsContent value="scope">
          <Card>
            <CardHeader>
              <CardTitle>Область доступа</CardTitle>
              <CardDescription>Что доступно менеджеру площадки в текущей модели платформы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Вы можете работать с закреплёнными клиентами, вести коммуникацию и помогать в пользовательских сценариях.</p>
              <p>Вам недоступны системная модерация, антифрод, массовое администрирование пользователей и изменение ролей платформы.</p>
              <p>Если нужен более широкий доступ, его должен выдать администратор платформы через отдельную роль.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerDashboard;
