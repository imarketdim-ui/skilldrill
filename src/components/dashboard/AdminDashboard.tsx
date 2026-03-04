import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, Shield, MessageSquare, 
  CheckCircle, XCircle, AlertTriangle, Tag, ShieldBan, Eye, Loader2, Flag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUserList from './admin/AdminUserList';
import RevocationRequests from './admin/RevocationRequests';
import FraudFlagsPanel from './admin/FraudFlagsPanel';
import SupportChat from './SupportChat';
import SignedImage from '@/components/ui/signed-image';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [moderationItems, setModerationItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

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
    await loadModerationItems();
    setLoading(false);
  };

  const loadModerationItems = async () => {
    const masters: any = await supabase.from('master_profiles').select('*, service_categories(name)').eq('moderation_status', 'pending');
    const businesses: any = await supabase.from('business_locations').select('*').eq('moderation_status', 'pending');
    const networks: any = await supabase.from('networks').select('*').eq('moderation_status', 'pending');

    const items: any[] = [];
    (masters.data || []).forEach(m => items.push({ ...m, _type: 'master', _table: 'master_profiles', _idField: 'id' }));
    (businesses.data || []).forEach(b => items.push({ ...b, _type: 'business', _table: 'business_locations', _idField: 'id' }));
    (networks.data || []).forEach(n => items.push({ ...n, _type: 'network', _table: 'networks', _idField: 'id' }));
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setModerationItems(items);
  };

  const handleModeration = async (item: any, approve: boolean) => {
    try {
      const update: any = {
        moderation_status: approve ? 'approved' : 'rejected',
      };
      if (!approve) {
        update.moderation_comment = rejectReason[item.id] || 'Причина не указана';
      }

      const { error } = await (supabase.from(item._table) as any).update(update).eq(item._idField, item.id);
      if (error) throw error;
      toast({ title: approve ? 'Профиль одобрен' : 'Профиль отклонён' });
      await loadModerationItems();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
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
          const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', requesterId).eq('role', role as any).maybeSingle();
          if (existingRole) {
            await supabase.from('user_roles').update({ is_active: true }).eq('id', existingRole.id);
          } else {
            await supabase.from('user_roles').insert([{ user_id: requesterId, role: role as any, is_active: true }]);
          }
        }

        if (requestType === 'master') {
          const { data: existingMp } = await supabase.from('master_profiles').select('id').eq('user_id', requesterId).maybeSingle();
          if (existingMp) {
            await supabase.from('master_profiles').update({
              category_id: request.category_id,
              is_active: true,
              subscription_status: 'trial',
              trial_start_date: new Date().toISOString(),
              trial_days: request.promo_code ? 45 : 14,
              promo_code_used: request.promo_code,
            }).eq('user_id', requesterId);
          } else {
            await supabase.from('master_profiles').insert({
              user_id: requesterId,
              category_id: request.category_id,
              subscription_status: 'trial',
              trial_start_date: new Date().toISOString(),
              trial_days: request.promo_code ? 45 : 14,
              promo_code_used: request.promo_code,
            });
          }
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
  const moderationTypeLabels: Record<string, string> = { master: 'Мастер', business: 'Бизнес', network: 'Сеть' };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Панель администратора</h2>

      <Tabs defaultValue="moderation" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="moderation"><Eye className="h-4 w-4 mr-1" /> Модерация {moderationItems.length > 0 && <Badge className="ml-1" variant="destructive">{moderationItems.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Пользователи</TabsTrigger>
          <TabsTrigger value="role_requests"><Shield className="h-4 w-4 mr-1" /> Заявки на роли</TabsTrigger>
          <TabsTrigger value="revocations"><ShieldBan className="h-4 w-4 mr-1" /> Аннулирование</TabsTrigger>
          <TabsTrigger value="category_requests"><Tag className="h-4 w-4 mr-1" /> Категории</TabsTrigger>
          <TabsTrigger value="fraud_flags"><Flag className="h-4 w-4 mr-1" /> Антифрод</TabsTrigger>
          <TabsTrigger value="disputes"><AlertTriangle className="h-4 w-4 mr-1" /> Споры</TabsTrigger>
          <TabsTrigger value="support"><MessageSquare className="h-4 w-4 mr-1" /> Поддержка</TabsTrigger>
        </TabsList>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Модерация профилей</CardTitle>
              <CardDescription>Проверка и одобрение мастеров, бизнесов и сетей для публикации в поиске</CardDescription>
            </CardHeader>
            <CardContent>
              {moderationItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Нет записей на модерации</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {moderationItems.map(item => (
                    <div key={item.id} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{moderationTypeLabels[item._type]}</Badge>
                          <span className="font-medium">
                            {item._type === 'master'
                              ? `${item.profiles?.first_name || ''} ${item.profiles?.last_name || ''}`
                              : item.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.profiles?.email} · {item.profiles?.skillspot_id}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm">
                        {item._type === 'master' && (
                          <>
                            <div><span className="text-muted-foreground">Категория:</span> {item.service_categories?.name || '—'}</div>
                            <div><span className="text-muted-foreground">Адрес:</span> {item.address || '—'}</div>
                            <div><span className="text-muted-foreground">Описание:</span> {item.description || '—'}</div>
                          </>
                        )}
                        {item._type === 'business' && (
                          <>
                            <div><span className="text-muted-foreground">ИНН:</span> {item.inn}</div>
                            <div><span className="text-muted-foreground">Адрес:</span> {item.address || '—'}</div>
                            <div><span className="text-muted-foreground">ФИО директора:</span> {item.director_name || '—'}</div>
                            <div><span className="text-muted-foreground">Email:</span> {item.contact_email || '—'}</div>
                            <div><span className="text-muted-foreground">Телефон:</span> {item.contact_phone || '—'}</div>
                          </>
                        )}
                        {item._type === 'network' && (
                          <>
                            <div><span className="text-muted-foreground">ИНН:</span> {item.inn || '—'}</div>
                            <div><span className="text-muted-foreground">Адрес:</span> {item.address || '—'}</div>
                            <div><span className="text-muted-foreground">ФИО директора:</span> {item.director_name || '—'}</div>
                          </>
                        )}
                        {(item.hashtags?.length > 0) && (
                          <div className="flex flex-wrap gap-1">
                            {item.hashtags.map((t: string) => <Badge key={t} variant="outline">#{t}</Badge>)}
                          </div>
                        )}
                        {(item.work_photos?.length > 0 || item.interior_photos?.length > 0 || item.certificate_photos?.length > 0) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {[...(item.work_photos || []), ...(item.interior_photos || [])].map((url: string, i: number) => (
                              <img key={`pub-${i}`} src={url} alt="" className="w-16 h-16 rounded object-cover border" />
                            ))}
                            {(item.certificate_photos || []).map((url: string, i: number) => (
                              <SignedImage key={`cert-${i}`} bucket="certificates" storageSrc={url} alt="" className="w-16 h-16 rounded object-cover border" />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            placeholder="Причина отклонения (при отказе)"
                            value={rejectReason[item.id] || ''}
                            onChange={(e) => setRejectReason(prev => ({ ...prev, [item.id]: e.target.value }))}
                          />
                        </div>
                        <Button size="sm" onClick={() => handleModeration(item, true)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Одобрить
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleModeration(item, false)}>
                          <XCircle className="h-4 w-4 mr-1" /> Отклонить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <AdminUserList />
        </TabsContent>

        <TabsContent value="revocations">
          <RevocationRequests />
        </TabsContent>

        <TabsContent value="role_requests">
          <Card>
            <CardHeader>
              <CardTitle>Заявки на присвоение ролей (устаревшие)</CardTitle>
              <CardDescription>Мастер / Бизнес / Сеть — теперь аккаунты создаются автоматически</CardDescription>
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

        <TabsContent value="fraud_flags">
          <FraudFlagsPanel />
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
          <SupportChat isAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
