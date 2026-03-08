import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users, X, Loader2, Shield, Briefcase, Wrench } from 'lucide-react';

interface Props {
  businessId: string;
  freeMasters: number;
  extraMasterPrice: number;
}

type StaffRole = 'master' | 'manager' | 'admin';

interface StaffEntry {
  id: string;
  user_id: string;
  role: StaffRole;
  status: string;
  source: 'business_masters' | 'business_managers';
  profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null; skillspot_id: string };
}

const roleLabels: Record<StaffRole, string> = {
  master: 'Мастер',
  manager: 'Менеджер',
  admin: 'Управляющий',
};

const roleIcons: Record<StaffRole, typeof Wrench> = {
  master: Wrench,
  manager: Briefcase,
  admin: Shield,
};

const roleBadgeVariant: Record<StaffRole, 'default' | 'secondary' | 'outline'> = {
  master: 'default',
  manager: 'secondary',
  admin: 'outline',
};

const BusinessMasters = ({ businessId, freeMasters, extraMasterPrice }: Props) => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [skillspotId, setSkillspotId] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('master');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { fetchStaff(); }, [businessId]);

  const fetchStaff = async () => {
    setLoading(true);
    const [mastersRes, managersRes] = await Promise.all([
      supabase
        .from('business_masters')
        .select('*, profile:profiles!business_masters_master_id_fkey(first_name, last_name, avatar_url, skillspot_id)')
        .eq('business_id', businessId),
      supabase
        .from('business_managers')
        .select('*, profile:profiles!business_managers_user_id_fkey(first_name, last_name, avatar_url, skillspot_id)')
        .eq('business_id', businessId),
    ]);

    const masterEntries: StaffEntry[] = (mastersRes.data || []).map((m: any) => ({
      id: m.id,
      user_id: m.master_id,
      role: 'master' as StaffRole,
      status: m.status,
      source: 'business_masters' as const,
      profile: m.profile,
    }));

    const managerEntries: StaffEntry[] = (managersRes.data || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.is_active ? 'manager' as StaffRole : 'admin' as StaffRole,
      status: m.is_active ? 'accepted' : 'inactive',
      source: 'business_managers' as const,
      profile: m.profile,
    }));

    setStaff([...masterEntries, ...managerEntries]);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!skillspotId.trim()) return;
    setInviting(true);
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, skillspot_id')
        .eq('skillspot_id', skillspotId.trim().toUpperCase())
        .maybeSingle();

      if (pErr || !profile) {
        toast({ title: 'Пользователь не найден', description: 'Проверьте SkillSpot ID', variant: 'destructive' });
        setInviting(false);
        return;
      }

      // Check if already in staff
      const existing = staff.find(s => s.user_id === profile.id);
      if (existing) {
        toast({ title: 'Сотрудник уже добавлен', variant: 'destructive' });
        setInviting(false);
        return;
      }

      const currentUserId = (await supabase.auth.getUser()).data.user?.id;

      if (selectedRole === 'master') {
        // Check master role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('role', 'master')
          .eq('is_active', true);

        if (!roles || roles.length === 0) {
          toast({ title: 'Нет роли мастера', description: 'У этого пользователя нет роли мастера на платформе', variant: 'destructive' });
          setInviting(false);
          return;
        }

        const { error } = await supabase.from('business_masters').insert({
          business_id: businessId,
          master_id: profile.id,
          status: 'pending',
          invited_by: currentUserId,
        });
        if (error) throw error;
      } else {
        // Manager or admin — insert into business_managers
        const { error } = await supabase.from('business_managers').insert({
          business_id: businessId,
          user_id: profile.id,
          is_active: true,
        });
        if (error) throw error;
      }

      toast({
        title: 'Приглашение отправлено',
        description: `${profile.first_name || ''} ${profile.last_name || ''} — ${roleLabels[selectedRole]}`,
      });
      setSkillspotId('');
      setInviteOpen(false);
      fetchStaff();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const handleRemove = async (entry: StaffEntry) => {
    if (entry.source === 'business_masters') {
      await supabase.from('business_masters').delete().eq('id', entry.id);
    } else {
      await supabase.from('business_managers').delete().eq('id', entry.id);
    }
    toast({ title: 'Сотрудник удалён' });
    fetchStaff();
  };

  const activeMasters = staff.filter(s => s.role === 'master' && s.status === 'accepted');
  const extraCount = Math.max(0, activeMasters.length - freeMasters);

  const statusLabel = (status: string) => {
    if (status === 'pending') return <Badge variant="secondary">Ожидает</Badge>;
    if (status === 'accepted') return <Badge variant="default">Активен</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Отклонён</Badge>;
    if (status === 'inactive') return <Badge variant="secondary">Неактивен</Badge>;
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Сотрудники</CardTitle>
              <CardDescription>
                Мастеров: {activeMasters.length} (бесплатных: {freeMasters})
                {extraCount > 0 && ` · Доп.: ${extraCount} (+${(extraCount * extraMasterPrice).toLocaleString()} ₽/мес)`}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Пригласить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Пригласите сотрудников по их SkillSpot ID</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map(s => {
                const RoleIcon = roleIcons[s.role];
                return (
                  <div key={`${s.source}-${s.id}`} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                        {(s.profile?.first_name?.[0] || '') + (s.profile?.last_name?.[0] || '')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.profile?.first_name || ''} {s.profile?.last_name || ''}</p>
                        <p className="text-xs text-muted-foreground">{s.profile?.skillspot_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={roleBadgeVariant[s.role]} className="gap-1">
                        <RoleIcon className="h-3 w-3" />
                        {roleLabels[s.role]}
                      </Badge>
                      {statusLabel(s.status)}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove(s)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить сотрудника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Роль</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as StaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">
                    <span className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Мастер</span>
                  </SelectItem>
                  <SelectItem value="manager">
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Менеджер</span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Управляющий</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SkillSpot ID</label>
              <Input
                value={skillspotId}
                onChange={e => setSkillspotId(e.target.value.toUpperCase())}
                placeholder="AB1234"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">Введите ID пользователя для приглашения</p>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={inviting || !skillspotId.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Отправить приглашение
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessMasters;
