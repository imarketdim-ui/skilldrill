import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Shield, MessageSquare, 
  CheckCircle, XCircle, AlertTriangle, Tag, ShieldBan
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUserList from './admin/AdminUserList';
import RevocationRequests from './admin/RevocationRequests';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [rr, cr, dp] = await Promise.all([
      supabase.from('role_requests').select('*, profiles!role_requests_requester_id_fkey(first_name, last_name, email, skillspot_id)').order('created_at', { ascending: false }),
      supabase.from('category_requests').select('*, profiles!category_requests_requester_id_fkey(first_name, last_name, email)').order('created_at', { ascending: false }),
      supabase.from('disputes').select('*').order('created_at', { ascending: false }),
    ]);
    setRoleRequests(rr.data || []);
    setCategoryRequests(cr.data || []);
    setDisputes(dp.data || []);
    setLoading(false);
  };

  const handleRoleRequest = async (requestId: string, approve: boolean, requestType: string, requesterId: string, request: any) => {
    try {
      const { error } = await supabase
        .from('role_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      if (approve) {
        const roleMap: Record<string, string> = { master: 'master', business: 'business_owner', network: 'network_owner' };
        const role = roleMap[requestType];
        if (role) {
          await supabase.from('user_roles').insert([{ user_id: requesterId, role: role as any }]);
        }

        if (requestType === 'master') {
          await supabase.from('master_profiles').insert({
            user_id: requesterId,
            category_id: request.category_id,
            trial_days: request.promo_code ? 45 : 14,
            promo_code_used: request.promo_code,
          });
        } else if (requestType === 'business') {
          await supabase.from('business_locations').insert({
            owner_id: requesterId,
            name: request.business_name,
            address: request.business_address,
            inn: request.business_inn,
            legal_form: request.business_legal_form || 'other',
            description: request.business_description,
            contact_email: request.business_contact_email,
            contact_phone: request.business_contact_phone,
          });
        } else if (requestType === 'network') {
          await supabase.from('networks').insert({
            owner_id: requesterId,
            name: request.network_name,
            description: request.network_description,
          });
        }
      }

      toast({ title: approve ? 'Заявка одобрена' : 'Заявка отклонена' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const handleCategoryRequest = async (requestId: string, approve: boolean, name: string, description: string | null) => {
    try {
      await supabase.from('category_requests').update({
        status: approve ? 'approved' : 'rejected',
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId);

      if (approve) {
        await supabase.from('service_categories').insert({ name, description });
      }

      toast({ title: approve ? 'Категория добавлена' : 'Заявка отклонена' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const requestTypeLabels: Record<string, string> = { master: 'Мастер', business: 'Бизнес', network: 'Сеть' };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Панель администратора</h2>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Пользователи</TabsTrigger>
          <TabsTrigger value="role_requests"><Shield className="h-4 w-4 mr-1" /> Заявки на роли</TabsTrigger>
          <TabsTrigger value="revocations"><ShieldBan className="h-4 w-4 mr-1" /> Аннулирование</TabsTrigger>
          <TabsTrigger value="category_requests"><Tag className="h-4 w-4 mr-1" /> Категории</TabsTrigger>
          <TabsTrigger value="disputes"><AlertTriangle className="h-4 w-4 mr-1" /> Споры</TabsTrigger>
          <TabsTrigger value="support"><MessageSquare className="h-4 w-4 mr-1" /> Поддержка</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AdminUserList />
        </TabsContent>

        <TabsContent value="revocations">
          <RevocationRequests />
        </TabsContent>

        <TabsContent value="role_requests">
          <Card>
            <CardHeader>
              <CardTitle>Заявки на присвоение ролей</CardTitle>
              <CardDescription>Мастер / Бизнес / Сеть</CardDescription>
            </CardHeader>
            <CardContent>
              {roleRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Нет заявок</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roleRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge>{requestTypeLabels[req.request_type]}</Badge>
                          <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'}>
                            {req.status === 'pending' ? 'Ожидает' : req.status === 'approved' ? 'Одобрена' : 'Отклонена'}
                          </Badge>
                        </div>
                        <p className="mt-1 font-medium">
                          {req.profiles?.first_name} {req.profiles?.last_name} ({req.profiles?.email})
                        </p>
                        <p className="text-sm text-muted-foreground">ID: {req.profiles?.skillspot_id}</p>
                        {req.business_name && <p className="text-sm">Бизнес: {req.business_name}</p>}
                        {req.network_name && <p className="text-sm">Сеть: {req.network_name}</p>}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleRoleRequest(req.id, true, req.request_type, req.requester_id, req)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Одобрить
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRoleRequest(req.id, false, req.request_type, req.requester_id, req)}>
                            <XCircle className="h-4 w-4 mr-1" /> Отклонить
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category_requests">
          <Card>
            <CardHeader><CardTitle>Заявки на добавление категорий</CardTitle></CardHeader>
            <CardContent>
              {categoryRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Нет заявок на категории</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">{req.name}</p>
                        <p className="text-sm text-muted-foreground">{req.description}</p>
                        <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'}>
                          {req.status}
                        </Badge>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleCategoryRequest(req.id, true, req.name, req.description)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleCategoryRequest(req.id, false, req.name, req.description)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader><CardTitle>Споры</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Нет открытых споров</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader><CardTitle>Техническая поддержка</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Чат поддержки</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
