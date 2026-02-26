import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Check, X, Loader2, Crown, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminAssignment {
  id: string;
  role: string;
  status: string;
  created_at: string;
  assigner: { first_name: string | null; last_name: string | null } | null;
}

const ClientRequests = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [adminInvites, setAdminInvites] = useState<AdminAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadRequests();
  }, [user]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from('admin_assignments')
      .select('id, role, status, created_at, assigner:profiles!admin_assignments_assigner_id_fkey(first_name, last_name)')
      .eq('assignee_id', user!.id)
      .order('created_at', { ascending: false });
    setAdminInvites(data || []);
    setLoading(false);
  };

  const handleAdminInvite = async (assignmentId: string, accept: boolean) => {
    setProcessing(assignmentId);
    try {
      const newStatus = accept ? 'accepted' : 'rejected';
      const { error } = await supabase
        .from('admin_assignments')
        .update({ status: newStatus, resolved_at: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;

      if (accept) {
        // Add admin role
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: user!.id,
          role: 'platform_admin' as any,
          is_active: true,
        });
        if (roleError && !roleError.message.includes('duplicate')) throw roleError;

        // Send notification back to assigner
        const invite = adminInvites.find(a => a.id === assignmentId);
        if (invite) {
          await supabase.from('notifications').insert({
            user_id: user!.id,
            type: 'role_granted',
            title: 'Роль администратора получена',
            message: 'Вы приняли назначение администратором платформы. Перезайдите для активации.',
          });
        }

        await refreshProfile();
        toast({ title: 'Вы стали администратором платформы' });
      } else {
        toast({ title: 'Приглашение отклонено' });
      }

      loadRequests();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = adminInvites.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="admin_invites">
        <TabsList>
          <TabsTrigger value="admin_invites" className="gap-1.5">
            <Crown className="h-4 w-4" />
            Назначения
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="role_requests" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Мои заявки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin_invites">
          <Card>
            <CardHeader>
              <CardTitle>Входящие назначения</CardTitle>
              <CardDescription>Приглашения на роли от администраторов</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : adminInvites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет входящих назначений</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">
                            {invite.role === 'platform_admin' ? 'Администратор платформы' : invite.role}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          От: {invite.assigner?.first_name || ''} {invite.assigner?.last_name || 'Супер-администратор'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invite.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      {invite.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAdminInvite(invite.id, true)}
                            disabled={processing === invite.id}
                          >
                            {processing === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminInvite(invite.id, false)}
                            disabled={processing === invite.id}
                          >
                            <X className="h-4 w-4 mr-1" /> Отклонить
                          </Button>
                        </div>
                      ) : (
                        <Badge variant={invite.status === 'accepted' ? 'default' : 'destructive'}>
                          {invite.status === 'accepted' ? 'Принято' : 'Отклонено'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role_requests">
          <Card>
            <CardHeader>
              <CardTitle>Мои заявки на роли</CardTitle>
              <CardDescription>Статусы ваших запросов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет активных заявок</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientRequests;
