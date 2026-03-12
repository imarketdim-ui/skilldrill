import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Search, Loader2, Shield, Briefcase, Wrench, Star, Phone, Mail, MoreVertical, Calendar, Lock, Link2 } from 'lucide-react';
import RolePermissionsEditor from './RolePermissionsEditor';
import BusinessInviteForm from './BusinessInviteForm';

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
  isActive: boolean;
  source: 'business_masters' | 'business_managers';
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    skillspot_id: string;
    phone: string | null;
    email: string | null;
  };
  masterProfile?: {
    short_description: string | null;
    hashtags: string[] | null;
  };
}

const roleLabels: Record<StaffRole, string> = {
  master: 'Мастер',
  manager: 'Менеджер',
  admin: 'Управляющий',
};

const BusinessMasters = ({ businessId, freeMasters, extraMasterPrice }: Props) => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [skillspotId, setSkillspotId] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('master');
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchStaff(); }, [businessId]);

  const fetchStaff = async () => {
    setLoading(true);
    const [mastersRes, managersRes] = await Promise.all([
      supabase
        .from('business_masters')
        .select('*, profile:profiles!business_masters_master_id_fkey(first_name, last_name, avatar_url, skillspot_id, phone, email)')
        .eq('business_id', businessId),
      supabase
        .from('business_managers')
        .select('*, profile:profiles!business_managers_user_id_fkey(first_name, last_name, avatar_url, skillspot_id, phone, email)')
        .eq('business_id', businessId),
    ]);

    const masterIds = (mastersRes.data || []).map((m: any) => m.master_id);
    let masterProfilesMap: Record<string, any> = {};
    if (masterIds.length > 0) {
      const { data: mps } = await supabase
        .from('master_profiles')
        .select('user_id, short_description, hashtags')
        .in('user_id', masterIds);
      (mps || []).forEach((mp: any) => { masterProfilesMap[mp.user_id] = mp; });
    }

    const masterEntries: StaffEntry[] = (mastersRes.data || []).map((m: any) => ({
      id: m.id,
      user_id: m.master_id,
      role: 'master' as StaffRole,
      status: m.status,
      isActive: m.status === 'accepted',
      source: 'business_masters' as const,
      profile: m.profile,
      masterProfile: masterProfilesMap[m.master_id] || null,
    }));

    const managerEntries: StaffEntry[] = (managersRes.data || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: 'manager' as StaffRole,
      status: m.is_active ? 'accepted' : 'inactive',
      isActive: m.is_active,
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
      // Ensure we have an active session before querying
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: 'Сессия истекла', description: 'Пожалуйста, перезагрузите страницу', variant: 'destructive' });
        setInviting(false);
        return;
      }

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

      const existing = staff.find(s => s.user_id === profile.id);
      if (existing) {
        toast({ title: 'Сотрудник уже в команде', variant: 'destructive' });
        setInviting(false);
        return;
      }

      // Check blacklist before inviting
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const { data: blacklisted } = await supabase
        .from('blacklists')
        .select('id')
        .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${profile.id}),and(blocker_id.eq.${profile.id},blocked_id.eq.${currentUserId})`)
        .limit(1);
      if (blacklisted && blacklisted.length > 0) {
        toast({ title: 'Невозможно пригласить', description: 'Пользователь находится в чёрном списке', variant: 'destructive' });
        setInviting(false);
        return;
      }

      if (selectedRole === 'master') {
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

  const handleToggleActive = async (entry: StaffEntry) => {
    if (entry.source === 'business_masters') {
      const newStatus = entry.isActive ? 'inactive' : 'accepted';
      await supabase.from('business_masters').update({ status: newStatus }).eq('id', entry.id);
    } else {
      await supabase.from('business_managers').update({ is_active: !entry.isActive }).eq('id', entry.id);
    }
    fetchStaff();
  };

  const handleRemove = async (entry: StaffEntry) => {
    if (entry.source === 'business_masters') {
      await supabase.from('business_masters').delete().eq('id', entry.id);
    } else {
      await supabase.from('business_managers').delete().eq('id', entry.id);
    }
    toast({ title: 'Сотрудник удалён из команды' });
    fetchStaff();
  };

  const activeCount = staff.filter(s => s.isActive).length;

  const filtered = staff.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.toLowerCase();
    const desc = (s.masterProfile?.short_description || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || roleLabels[s.role].toLowerCase().includes(q);
  });

  const getInitials = (entry: StaffEntry) =>
    ((entry.profile?.first_name?.[0] || '') + (entry.profile?.last_name?.[0] || '')).toUpperCase() || '?';

  return (
    <div className="space-y-6">
      <Tabs defaultValue="staff" className="w-full">
        <TabsList>
          <TabsTrigger value="staff" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Сотрудники
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Доступы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6 mt-4">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold">Команда</h2>
              <p className="text-muted-foreground">Мастера, менеджеры и сотрудники</p>
            </div>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Добавить сотрудника
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Всего', value: staff.length },
              { label: 'Активных', value: activeCount },
              { label: 'Мастеров', value: staff.filter(s => s.role === 'master').length },
              { label: 'Менеджеров', value: staff.filter(s => s.role !== 'master').length },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или специализации..."
              className="pl-10"
            />
          </div>

          {/* Staff grid */}
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{staff.length === 0 ? 'Пригласите сотрудников по их SkillSpot ID' : 'Ничего не найдено'}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(s => (
                <Card key={`${s.source}-${s.id}`} className={`relative ${!s.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-5 pb-4 px-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(s)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {s.profile?.first_name || ''} {s.profile?.last_name || ''}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {s.masterProfile?.short_description || roleLabels[s.role]}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRemove(s)} className="text-destructive">
                            Удалить из команды
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      {s.profile?.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{s.profile.phone}</span>
                        </div>
                      )}
                      {s.profile?.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{s.profile.email}</span>
                        </div>
                      )}
                    </div>

                    {s.masterProfile?.hashtags && s.masterProfile.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.masterProfile.hashtags.slice(0, 4).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs font-normal">
                            {tag}
                          </Badge>
                        ))}
                        {s.masterProfile.hashtags.length > 4 && (
                          <Badge variant="outline" className="text-xs font-normal">
                            +{s.masterProfile.hashtags.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge variant="secondary" className="text-xs">
                        {roleLabels[s.role]}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {s.status === 'pending' ? 'Ожидает' : s.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                        {s.status !== 'pending' && (
                          <Switch
                            checked={s.isActive}
                            onCheckedChange={() => handleToggleActive(s)}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <RolePermissionsEditor businessId={businessId} />
        </TabsContent>
      </Tabs>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить сотрудника</DialogTitle>
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
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Отправить приглашение
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessMasters;
