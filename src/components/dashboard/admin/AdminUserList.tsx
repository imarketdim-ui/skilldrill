import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Users, ShieldBan, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminUserList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<any[]>([]);
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; user: any; type: string }>({ open: false, user: null, type: '' });
  const [selectedReason, setSelectedReason] = useState('');
  const [revokeDescription, setRevokeDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadReasons();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role, is_active), master_profiles(id, category_id, is_active)')
      .order('created_at', { ascending: false })
      .limit(200);
    setUsers(data || []);
    setLoading(false);
  };

  const loadReasons = async () => {
    const { data } = await supabase
      .from('revocation_reasons')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setReasons(data || []);
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.first_name || '').toLowerCase().includes(q) ||
      (u.last_name || '').toLowerCase().includes(q) ||
      (u.skillspot_id || '').toLowerCase().includes(q)
    );
  });

  const getUserRoles = (u: any) => {
    const roles = u.user_roles?.filter((r: any) => r.is_active).map((r: any) => r.role) || [];
    return roles;
  };

  const canRevoke = (u: any) => {
    const roles = getUserRoles(u);
    return roles.includes('master') || roles.includes('business_owner') || roles.includes('network_owner');
  };

  const openRevokeDialog = (u: any, type: string) => {
    setRevokeDialog({ open: true, user: u, type });
    setSelectedReason('');
    setRevokeDescription('');
  };

  const submitRevocation = async () => {
    if (!selectedReason || !revokeDialog.user) return;
    setSubmitting(true);
    try {
      let entityId = null;
      if (revokeDialog.type === 'master') {
        entityId = revokeDialog.user.master_profiles?.[0]?.id || null;
      }

      const { error } = await supabase.from('revocation_requests').insert({
        target_user_id: revokeDialog.user.id,
        target_type: revokeDialog.type,
        target_entity_id: entityId,
        reason_id: selectedReason,
        description: revokeDescription || null,
        requested_by: user!.id,
      });

      if (error) throw error;
      toast({ title: 'Заявка на аннулирование отправлена', description: 'Ожидает рассмотрения супер администратором' });
      setRevokeDialog({ open: false, user: null, type: '' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const roleLabels: Record<string, string> = {
    master: 'Мастер',
    business_owner: 'Владелец бизнеса',
    network_owner: 'Владелец сети',
    platform_admin: 'Администратор',
    super_admin: 'Супер админ',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Пользователи платформы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, email или ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => {
                const roles = getUserRoles(u);
                return (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {u.first_name || ''} {u.last_name || ''} 
                        {!u.first_name && !u.last_name && <span className="text-muted-foreground">Без имени</span>}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      <p className="text-xs font-mono text-muted-foreground">ID: {u.skillspot_id}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {roles.map((r: string) => (
                          <Badge key={r} variant="secondary" className="text-xs">{roleLabels[r] || r}</Badge>
                        ))}
                        {roles.length === 0 && <Badge variant="outline" className="text-xs">Клиент</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {roles.includes('master') && (
                        <Button size="sm" variant="destructive" onClick={() => openRevokeDialog(u, 'master')}>
                          <ShieldBan className="h-3 w-3 mr-1" /> Мастер
                        </Button>
                      )}
                      {roles.includes('business_owner') && (
                        <Button size="sm" variant="destructive" onClick={() => openRevokeDialog(u, 'business')}>
                          <ShieldBan className="h-3 w-3 mr-1" /> Бизнес
                        </Button>
                      )}
                      {roles.includes('network_owner') && (
                        <Button size="sm" variant="destructive" onClick={() => openRevokeDialog(u, 'network')}>
                          <ShieldBan className="h-3 w-3 mr-1" /> Сеть
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">Пользователи не найдены</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={revokeDialog.open} onOpenChange={(o) => setRevokeDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заявка на аннулирование прав</DialogTitle>
          </DialogHeader>
          {revokeDialog.user && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{revokeDialog.user.first_name} {revokeDialog.user.last_name}</p>
                <p className="text-sm text-muted-foreground">{revokeDialog.user.email}</p>
                <Badge className="mt-1">{revokeDialog.type === 'master' ? 'Мастер' : revokeDialog.type === 'business' ? 'Бизнес' : 'Сеть'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Причина</label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger><SelectValue placeholder="Выберите причину..." /></SelectTrigger>
                  <SelectContent>
                    {reasons.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Описание (необязательно)</label>
                <Textarea
                  placeholder="Опишите ситуацию подробнее..."
                  value={revokeDescription}
                  onChange={(e) => setRevokeDescription(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialog({ open: false, user: null, type: '' })}>Отмена</Button>
            <Button variant="destructive" onClick={submitRevocation} disabled={!selectedReason || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUserList;
