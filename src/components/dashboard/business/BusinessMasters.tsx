import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users, X, Loader2 } from 'lucide-react';

interface Props {
  businessId: string;
  freeMasters: number;
  extraMasterPrice: number;
}

interface MasterEntry {
  id: string;
  master_id: string;
  status: string;
  commission_percent: number | null;
  accepted_at: string | null;
  profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null; skillspot_id: string };
}

const BusinessMasters = ({ businessId, freeMasters, extraMasterPrice }: Props) => {
  const { toast } = useToast();
  const [masters, setMasters] = useState<MasterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [skillspotId, setSkillspotId] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { fetchMasters(); }, [businessId]);

  const fetchMasters = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('business_masters')
      .select('*, profile:profiles!business_masters_master_id_fkey(first_name, last_name, avatar_url, skillspot_id)')
      .eq('business_id', businessId);
    setMasters((data || []).map((m: any) => ({ ...m, profile: m.profile })));
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!skillspotId.trim()) return;
    setInviting(true);
    try {
      // Find user by skillspot_id
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
      // Check if already invited
      const existing = masters.find(m => m.master_id === profile.id);
      if (existing) {
        toast({ title: 'Мастер уже приглашён', variant: 'destructive' });
        setInviting(false);
        return;
      }
      // Check if user has master role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .eq('role', 'master')
        .eq('is_active', true);
      if (!roles || roles.length === 0) {
        toast({ title: 'Пользователь не является мастером', description: 'У этого пользователя нет роли мастера', variant: 'destructive' });
        setInviting(false);
        return;
      }
      const { error } = await supabase.from('business_masters').insert({
        business_id: businessId,
        master_id: profile.id,
        status: 'pending',
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      toast({ title: 'Приглашение отправлено', description: `${profile.first_name || ''} ${profile.last_name || ''} (${profile.skillspot_id})` });
      setSkillspotId('');
      setInviteOpen(false);
      fetchMasters();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const handleRemove = async (id: string) => {
    await supabase.from('business_masters').delete().eq('id', id);
    toast({ title: 'Мастер удалён' });
    fetchMasters();
  };

  const activeMasters = masters.filter(m => m.status === 'accepted');
  const pendingMasters = masters.filter(m => m.status === 'pending');
  const extraCount = Math.max(0, activeMasters.length - freeMasters);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Мастера</CardTitle>
              <CardDescription>
                {freeMasters} бесплатных, каждый доп. +{extraMasterPrice.toLocaleString()} ₽/мес
                {extraCount > 0 && ` · Доп. мастеров: ${extraCount} (+${(extraCount * extraMasterPrice).toLocaleString()} ₽/мес)`}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Пригласить по ID
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : masters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Пригласите мастеров по их SkillSpot ID</p>
            </div>
          ) : (
            <div className="space-y-3">
              {masters.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {(m.profile?.first_name?.[0] || '') + (m.profile?.last_name?.[0] || '')}
                    </div>
                    <div>
                      <p className="font-medium">{m.profile?.first_name || ''} {m.profile?.last_name || ''}</p>
                      <p className="text-xs text-muted-foreground">{m.profile?.skillspot_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === 'pending' && <Badge variant="secondary">Ожидает</Badge>}
                    {m.status === 'accepted' && <Badge variant="default">Активен</Badge>}
                    {m.status === 'rejected' && <Badge variant="destructive">Отклонён</Badge>}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove(m.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить мастера</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Введите SkillSpot ID мастера (например, AB1234)</p>
              <Input
                value={skillspotId}
                onChange={e => setSkillspotId(e.target.value.toUpperCase())}
                placeholder="AB1234"
                maxLength={6}
              />
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={inviting || !skillspotId.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Пригласить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessMasters;
