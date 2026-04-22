import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { Mail, Plus, Loader2, Copy, Link2, Clock, Lock, Crown } from 'lucide-react';

interface Props {
  businessId: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const BusinessInviteForm = ({ businessId }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const subscription = useSubscriptionTier(user?.id);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('master');
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStaffCount, setActiveStaffCount] = useState(0);

  useEffect(() => {
    fetchInvitations();
    fetchStaffCount();
  }, [businessId]);

  const fetchInvitations = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20);
    setInvitations((data as any[]) || []);
    setLoading(false);
  };

  const fetchStaffCount = async () => {
    const [masters, managers] = await Promise.all([
      supabase.from('business_masters').select('id', { count: 'exact', head: true })
        .eq('business_id', businessId).eq('status', 'accepted'),
      supabase.from('business_managers').select('id', { count: 'exact', head: true })
        .eq('business_id', businessId).eq('is_active', true),
    ]);
    setActiveStaffCount((masters.count || 0) + (managers.count || 0));
  };

  const employeeLimit = subscription.employeeLimit;
  const isLimitReached = employeeLimit !== Infinity && activeStaffCount >= employeeLimit;
  const limitLabel = employeeLimit === Infinity ? '∞' : employeeLimit;

  const handleSend = async () => {
    if (!email.trim()) return;
    if (isLimitReached) {
      toast({
        title: 'Лимит сотрудников достигнут',
        description: `На тарифе «${subscription.tierLabel}» доступно ${limitLabel} активных сотрудников. Перейдите на «Сеть» для безлимита.`,
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('invitations').insert({
        email: email.trim().toLowerCase(),
        organization_id: businessId,
        role,
        invited_by: user.id,
      });
      if (error) throw error;

      toast({
        title: 'Приглашение создано',
        description: `Ссылка-приглашение для ${email} готова.`,
      });
      setEmail('');
      fetchInvitations();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/accept-invite/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Ссылка скопирована' });
  };

  const roleLabels: Record<string, string> = {
    master: 'Мастер',
    manager: 'Менеджер',
    business_admin: 'Администратор точки',
    admin: 'Управляющий',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" /> Пригласить по email
            <Badge variant={isLimitReached ? 'destructive' : 'secondary'} className="ml-auto">
              {activeStaffCount} / {limitLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLimitReached && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>Лимит сотрудников на тарифе «{subscription.tierLabel}» достигнут.</span>
                <Link to="/subscription">
                  <Button size="sm" variant="outline" className="gap-1">
                    <Crown className="h-3 w-3" /> Перейти на «Сеть»
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3">
            <Input
              placeholder="email@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Мастер</SelectItem>
                <SelectItem value="manager">Менеджер</SelectItem>
                <SelectItem value="business_admin">Администратор точки</SelectItem>
                <SelectItem value="admin">Управляющий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSend} disabled={sending || !email.trim() || isLimitReached} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Создать приглашение
          </Button>
        </CardContent>
      </Card>

      {/* Invitation history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Приглашения
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-6">Загрузка...</p>
          ) : invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Приглашений пока нет</p>
          ) : (
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[inv.role] || inv.role}
                      </Badge>
                      {inv.accepted_at ? (
                        <Badge variant="default" className="text-xs">Принято</Badge>
                      ) : new Date(inv.expires_at) < new Date() ? (
                        <Badge variant="destructive" className="text-xs">Истекло</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Ожидает
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!inv.accepted_at && new Date(inv.expires_at) > new Date() && (
                    <Button variant="ghost" size="icon" onClick={() => copyLink(inv.token)} title="Скопировать ссылку">
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessInviteForm;
