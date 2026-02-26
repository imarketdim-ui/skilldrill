import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, Users, BarChart3, Shield, UserPlus, Search,
  Loader2, TrendingUp, CreditCard, UserCheck, ShieldBan, FolderTree, ListChecks
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUserList from './admin/AdminUserList';
import RevocationRequests from './admin/RevocationRequests';
import CategoryManager from './admin/CategoryManager';
import ReasonManager from './admin/ReasonManager';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminAssignments, setAdminAssignments] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, masters: 0, businesses: 0, networks: 0 });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [profilesRes, mastersRes, bizRes, netRes, assignRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('master_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('business_locations').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('networks').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('admin_assignments').select('*, assigner:profiles!admin_assignments_assigner_id_fkey(first_name,last_name), assignee:profiles!admin_assignments_assignee_id_fkey(first_name,last_name,email,skillspot_id)').order('created_at', { ascending: false }),
    ]);
    setStats({
      totalUsers: profilesRes.count || 0,
      masters: mastersRes.count || 0,
      businesses: bizRes.count || 0,
      networks: netRes.count || 0,
    });
    setAdminAssignments(assignRes.data || []);
    setLoading(false);
  };

  const searchUser = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role, is_active)')
      .eq('skillspot_id', searchId.trim().toUpperCase())
      .maybeSingle();
    setSearchResult(data);
    setSearching(false);
    if (!data) toast({ title: 'Пользователь не найден', variant: 'destructive' });
  };

  const assignAdmin = async (userId: string) => {
    try {
      await supabase.from('admin_assignments').insert({
        assigner_id: user!.id,
        assignee_id: userId,
        role: 'platform_admin',
      });
      // Send notification to assignee
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'admin_invite',
        title: 'Приглашение стать администратором',
        message: 'Супер-администратор назначил вас администратором платформы. Перейдите в раздел «Запросы» в личном кабинете для подтверждения или отклонения.',
      });
      toast({ title: 'Приглашение отправлено' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-8 w-8 text-amber-500" />
        <h2 className="text-2xl font-bold">Супер Администратор</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.totalUsers}</p><p className="text-sm text-muted-foreground">Пользователей</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.masters}</p><p className="text-sm text-muted-foreground">Мастеров</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.businesses}</p><p className="text-sm text-muted-foreground">Бизнесов</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.networks}</p><p className="text-sm text-muted-foreground">Сетей</p></CardContent></Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Пользователи</TabsTrigger>
          <TabsTrigger value="revocations"><ShieldBan className="h-4 w-4 mr-1" /> Аннулирование</TabsTrigger>
          <TabsTrigger value="categories"><FolderTree className="h-4 w-4 mr-1" /> Категории</TabsTrigger>
          <TabsTrigger value="reasons"><ListChecks className="h-4 w-4 mr-1" /> Причины</TabsTrigger>
          <TabsTrigger value="admins"><Shield className="h-4 w-4 mr-1" /> Администраторы</TabsTrigger>
          <TabsTrigger value="platform"><BarChart3 className="h-4 w-4 mr-1" /> Дашборд</TabsTrigger>
          <TabsTrigger value="subscriptions"><CreditCard className="h-4 w-4 mr-1" /> Подписки</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AdminUserList />
        </TabsContent>

        <TabsContent value="revocations">
          <RevocationRequests isSuperAdmin />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="reasons">
          <ReasonManager />
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader><CardTitle>Назначить администратора</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="SkillSpot ID (например AB1234)" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
                <Button onClick={searchUser} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchResult && (
                <div className="p-4 rounded-lg border mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{searchResult.first_name} {searchResult.last_name}</p>
                      <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                      <p className="text-sm font-mono">ID: {searchResult.skillspot_id}</p>
                      <div className="flex gap-1 mt-1">
                        {searchResult.user_roles?.map((r: any) => (
                          <Badge key={r.role} variant="secondary" className="text-xs">{r.role}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => assignAdmin(searchResult.id)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Назначить
                    </Button>
                  </div>
                </div>
              )}
              <h4 className="font-semibold mt-6 mb-3">Приглашения</h4>
              {adminAssignments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет приглашений</p>
              ) : (
                <div className="space-y-2">
                  {adminAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{a.assignee?.first_name} {a.assignee?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{a.assignee?.email} • {a.assignee?.skillspot_id}</p>
                      </div>
                      <Badge variant={a.status === 'pending' ? 'outline' : a.status === 'accepted' ? 'default' : 'destructive'}>
                        {a.status === 'pending' ? 'Ожидает' : a.status === 'accepted' ? 'Принято' : 'Отклонено'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardHeader><CardTitle>Показатели платформы</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-emerald-500" /><span className="font-medium">Регистрации</span></div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Всего пользователей</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2"><UserCheck className="h-5 w-5 text-blue-500" /><span className="font-medium">Активные</span></div>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">Активных пользователей</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2"><CreditCard className="h-5 w-5 text-purple-500" /><span className="font-medium">Доход</span></div>
                  <p className="text-2xl font-bold">0 ₽</p>
                  <p className="text-sm text-muted-foreground">Доходность платформы</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader><CardTitle>Подписки</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border"><p className="font-medium">Мастера</p><p className="text-sm text-muted-foreground">900 ₽/мес</p><p className="text-2xl font-bold mt-2">{stats.masters}</p></div>
                <div className="p-4 rounded-lg border"><p className="font-medium">Бизнесы</p><p className="text-sm text-muted-foreground">от 2 500 ₽/мес</p><p className="text-2xl font-bold mt-2">{stats.businesses}</p></div>
                <div className="p-4 rounded-lg border"><p className="font-medium">Сети</p><p className="text-sm text-muted-foreground">от 4 500 ₽/мес</p><p className="text-2xl font-bold mt-2">{stats.networks}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
