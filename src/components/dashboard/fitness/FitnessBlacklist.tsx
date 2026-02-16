import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Ban, Plus, Search, MessageSquare, UserMinus, AlertTriangle } from 'lucide-react';

const FitnessBlacklist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [reason, setReason] = useState('');

  useEffect(() => { if (user) fetchBlacklist(); }, [user]);

  const fetchBlacklist = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('blacklists')
      .select('*, profiles:blocked_id(first_name, last_name, email, skillspot_id)')
      .eq('blocker_id', user.id);
    setEntries(data || []);
    setLoading(false);
  };

  const searchUser = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, skillspot_id')
      .eq('skillspot_id', searchId.trim())
      .maybeSingle();
    if (data) setFoundUser(data);
    else toast({ title: 'Пользователь не найден', variant: 'destructive' });
  };

  const addToBlacklist = async () => {
    if (!user || !foundUser) return;
    const { error } = await supabase.from('blacklists').insert({
      blocker_id: user.id, blocked_id: foundUser.id, reason: reason || null,
    });
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Добавлен в чёрный список' });
      setIsOpen(false); setFoundUser(null); setSearchId(''); setReason('');
      fetchBlacklist();
    }
  };

  const removeFromBlacklist = async (id: string) => {
    await supabase.from('blacklists').delete().eq('id', id);
    toast({ title: 'Удалён из чёрного списка' });
    fetchBlacklist();
  };

  const getInitials = (f?: string | null, l?: string | null) =>
    `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase() || '?';

  const filtered = entries.filter(e => {
    if (!searchFilter) return true;
    const p = e.profiles as any;
    const q = searchFilter.toLowerCase();
    return p?.first_name?.toLowerCase().includes(q) || p?.last_name?.toLowerCase().includes(q) || p?.email?.toLowerCase().includes(q);
  });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Ban className="h-6 w-6 text-destructive" /> Чёрный список</h2>
          <p className="text-muted-foreground">Клиенты с ограниченным доступом к записи на тренировки</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Добавить в чёрный список</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID пользователя (SkillSpot ID)</Label>
                <div className="flex gap-2">
                  <Input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Введите SkillSpot ID" />
                  <Button variant="outline" onClick={searchUser}><Search className="h-4 w-4" /></Button>
                </div>
              </div>
              {foundUser && (
                <Card><CardContent className="py-3"><div className="flex items-center gap-3">
                  <Avatar><AvatarFallback className="bg-primary/10 text-primary">{getInitials(foundUser.first_name, foundUser.last_name)}</AvatarFallback></Avatar>
                  <div><p className="font-medium">{foundUser.first_name} {foundUser.last_name}</p><p className="text-sm text-muted-foreground">{foundUser.email}</p></div>
                </div></CardContent></Card>
              )}
              <div className="space-y-2">
                <Label>Причина</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Причина блокировки..." />
              </div>
              <Button className="w-full" onClick={addToBlacklist} disabled={!foundUser}>Добавить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
        <p className="font-semibold flex items-center gap-2 text-foreground"><AlertTriangle className="h-5 w-5 text-amber-500" /> Клиенты в чёрном списке:</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground ml-7 list-disc">
          <li>Не могут записываться на тренировки</li>
          <li>Не могут отправлять сообщения в чат</li>
          <li>Не получают уведомления о расписании</li>
        </ul>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по имени или Telegram..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Ban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Чёрный список пуст</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(entry => {
            const profile = entry.profiles as any;
            return (
              <Card key={entry.id} className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-destructive/10 text-destructive font-semibold">
                        {getInitials(profile?.first_name, profile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{profile?.first_name} {profile?.last_name}</p>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">В ЧС</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">@{profile?.skillspot_id}</p>
                    </div>
                  </div>
                  {entry.reason && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Причина:</p>
                      <p className="text-sm text-muted-foreground">{entry.reason}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-around text-center border-t border-b py-3">
                    <div>
                      <p className="text-lg font-bold text-destructive">—</p>
                      <p className="text-xs text-muted-foreground">Неявок</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatDate(entry.created_at)}</p>
                      <p className="text-xs text-muted-foreground">Добавлен</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">—</p>
                      <p className="text-xs text-muted-foreground">Последнее</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" size="sm">
                      <MessageSquare className="h-4 w-4" /> Написать
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                      onClick={() => removeFromBlacklist(entry.id)}
                    >
                      <UserMinus className="h-4 w-4" /> Убрать из ЧС
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FitnessBlacklist;
