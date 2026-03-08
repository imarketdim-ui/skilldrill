import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Ban, TrendingUp, Calendar, Clock, StickyNote, Plus, Trash2, MessageSquare, Crown, Star, Moon, UserX } from 'lucide-react';
import { CategoryConfig } from './categoryConfig';
import UserScoreCard from '@/components/dashboard/UserScoreCard';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ClientInfo {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; skillspot_id: string;
  totalSessions: number; completedSessions: number; noShows: number;
  cancellations: number; firstVisit: string | null; lastVisit: string | null;
  isBlacklisted: boolean; vipByCount: number; ltv: number;
}

type ClientStatus = 'all' | 'vip' | 'regular' | 'new' | 'sleeping' | 'inactive' | 'blacklisted';

interface Props { config: CategoryConfig; }

const statusConfig: Record<ClientStatus, { label: string; icon: any; color: string }> = {
  all: { label: 'Все', icon: User, color: '' },
  vip: { label: 'VIP', icon: Crown, color: 'text-yellow-600' },
  regular: { label: 'Постоянные', icon: Star, color: 'text-primary' },
  new: { label: 'Новые', icon: Plus, color: 'text-green-600' },
  sleeping: { label: 'Спящие', icon: Moon, color: 'text-orange-500' },
  inactive: { label: 'Неактивные', icon: UserX, color: 'text-muted-foreground' },
  blacklisted: { label: 'ЧС', icon: Ban, color: 'text-destructive' },
};

const UniversalClients = ({ config }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus>('all');
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [blacklistedIds, setBlacklistedIds] = useState<Set<string>>(new Set());
  const [blacklistTarget, setBlacklistTarget] = useState<ClientInfo | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  useEffect(() => { if (user) { fetchClients(); fetchBlacklist(); } }, [user]);

  const fetchBlacklist = async () => {
    if (!user) return;
    const { data } = await supabase.from('blacklists').select('blocked_id').eq('blocker_id', user.id);
    setBlacklistedIds(new Set((data || []).map(b => b.blocked_id)));
  };

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: bookings }, { data: blData }] = await Promise.all([
      supabase.from('lesson_bookings')
        .select('student_id, status, lesson_id, created_at, lessons!inner(teacher_id, status, price, lesson_date)')
        .eq('lessons.teacher_id', user.id),
      supabase.from('blacklists').select('blocked_id').eq('blocker_id', user.id),
    ]);
    const blSet = new Set((blData || []).map(b => b.blocked_id));
    setBlacklistedIds(blSet);

    if (!bookings || bookings.length === 0) { setClients([]); setLoading(false); return; }
    const clientIds = [...new Set(bookings.map(b => b.student_id))];

    const [{ data: profiles }, { data: vipData }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, phone, skillspot_id').in('id', clientIds),
      supabase.from('client_tags').select('client_id').eq('tagger_id', user.id).eq('tag', 'vip'),
    ]);
    const vipSet = new Set((vipData || []).map(v => v.client_id));

    const list: ClientInfo[] = (profiles || []).map(p => {
      const cb = bookings.filter(b => b.student_id === p.id);
      const sorted = cb.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const lastSorted = [...cb].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const completedBookings = cb.filter(b => (b.lessons as any)?.status === 'completed');
      const ltv = completedBookings.reduce((sum, b) => sum + Number((b.lessons as any)?.price || 0), 0);
      return {
        id: p.id, first_name: p.first_name, last_name: p.last_name,
        email: p.email, phone: p.phone, skillspot_id: p.skillspot_id,
        totalSessions: cb.length,
        completedSessions: completedBookings.length,
        noShows: cb.filter(b => b.status === 'cancelled' && (b.lessons as any)?.status === 'no_show').length,
        cancellations: cb.filter(b => b.status === 'cancelled').length,
        firstVisit: sorted.length > 0 ? (sorted[0].lessons as any)?.lesson_date : null,
        lastVisit: lastSorted.length > 0 ? (lastSorted[0].lessons as any)?.lesson_date : null,
        isBlacklisted: blSet.has(p.id),
        vipByCount: vipSet.has(p.id) ? 1 : 0,
        ltv,
      };
    });
    setClients(list);
    setLoading(false);
  };

  const getClientStatus = (c: ClientInfo): ClientStatus => {
    if (c.isBlacklisted) return 'blacklisted';
    if (c.vipByCount > 0) return 'vip';
    const daysSinceLast = c.lastVisit ? differenceInDays(new Date(), new Date(c.lastVisit)) : 999;
    if (c.completedSessions <= 2) return 'new';
    if (daysSinceLast > 180) return 'inactive';
    if (daysSinceLast > 60) return 'sleeping';
    return 'regular';
  };

  const getStatusBadge = (status: ClientStatus) => {
    const cfg = statusConfig[status];
    if (status === 'all') return null;
    return <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>;
  };

  const filterClients = () => {
    let list = clients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.skillspot_id.includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter(c => getClientStatus(c) === statusFilter);
    }
    return list;
  };

  const filtered = filterClients();
  const statusCounts = {
    all: clients.length,
    vip: clients.filter(c => getClientStatus(c) === 'vip').length,
    regular: clients.filter(c => getClientStatus(c) === 'regular').length,
    new: clients.filter(c => getClientStatus(c) === 'new').length,
    sleeping: clients.filter(c => getClientStatus(c) === 'sleeping').length,
    inactive: clients.filter(c => getClientStatus(c) === 'inactive').length,
    blacklisted: clients.filter(c => getClientStatus(c) === 'blacklisted').length,
  };

  const openProfile = async (client: ClientInfo) => {
    setSelectedClient(client);
    if (!user) return;
    const [histRes, notesRes] = await Promise.all([
      supabase.from('lesson_bookings')
        .select('*, lessons!inner(title, lesson_date, start_time, end_time, price, status, teacher_id)')
        .eq('student_id', client.id).eq('lessons.teacher_id', user.id)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('client_tags').select('*')
        .eq('client_id', client.id).eq('tagger_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setClientHistory(histRes.data || []);
    setNotes(notesRes.data || []);
  };

  const addNote = async () => {
    if (!user || !selectedClient || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const { error } = await supabase.from('client_tags').insert({
        client_id: selectedClient.id, tagger_id: user.id,
        tag: 'note', note: newNote.trim(),
      });
      if (error) throw error;
      setNewNote('');
      const { data } = await supabase.from('client_tags').select('*')
        .eq('client_id', selectedClient.id).eq('tagger_id', user.id)
        .order('created_at', { ascending: false });
      setNotes(data || []);
      toast({ title: 'Заметка добавлена' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setAddingNote(false);
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from('client_tags').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    toast({ title: 'Заметка удалена' });
  };

  const handleBlacklist = async () => {
    if (!user || !blacklistTarget) return;
    const { error } = await supabase.from('blacklists').insert({
      blocker_id: user.id, blocked_id: blacklistTarget.id, reason: blacklistReason || null,
    });
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Добавлен в чёрный список' });
      setBlacklistTarget(null); setBlacklistReason('');
      fetchClients();
    }
  };

  const handleUnblacklist = async (clientId: string) => {
    if (!user) return;
    await supabase.from('blacklists').delete().eq('blocker_id', user.id).eq('blocked_id', clientId);
    toast({ title: 'Убран из чёрного списка' });
    fetchClients();
  };

  const startChat = async (client: ClientInfo) => {
    if (!user) return;
    // Check if chat already exists
    const { data: existing } = await supabase.from('chat_messages')
      .select('id').or(`and(sender_id.eq.${user.id},recipient_id.eq.${client.id}),and(sender_id.eq.${client.id},recipient_id.eq.${user.id})`)
      .limit(1);
    if (existing && existing.length > 0) {
      toast({ title: 'Чат уже существует', description: 'Перейдите в раздел Чаты' });
    } else {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id, recipient_id: client.id,
        message: `Здравствуйте, ${client.first_name || 'клиент'}!`,
      });
      if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      else toast({ title: 'Чат создан', description: 'Перейдите в раздел Чаты для продолжения' });
    }
  };

  const getRate = (c: ClientInfo) => c.totalSessions === 0 ? '—' : Math.round((c.completedSessions / c.totalSessions) * 100) + '%';

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по имени, email или ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(statusConfig) as ClientStatus[]).map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setStatusFilter(s)}
          >
            {statusConfig[s].label}
            <span className="opacity-60">({statusCounts[s]})</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">{search ? 'Не найдено' : `Нет ${config.clientNamePlural.toLowerCase()}`}</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => {
            const status = getClientStatus(c);
            return (
              <Card key={c.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${c.isBlacklisted ? 'opacity-60 border-destructive/30' : ''}`} onClick={() => openProfile(c)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarFallback className="bg-primary/10 text-primary">{c.first_name?.[0] || 'C'}</AvatarFallback></Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{c.first_name || ''} {c.last_name || ''}{!c.first_name && !c.last_name && c.email}</p>
                          {getStatusBadge(status)}
                        </div>
                        <p className="text-sm text-muted-foreground">ID: {c.skillspot_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center hidden sm:block"><p className="font-semibold">{c.totalSessions}</p><p className="text-muted-foreground text-xs">{config.sessionNamePlural}</p></div>
                      <div className="text-center hidden sm:block"><p className="font-semibold">{getRate(c)}</p><p className="text-muted-foreground text-xs">Посещ.</p></div>
                      {!c.isBlacklisted && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); startChat(c); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client profile dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Профиль {config.clientName.toLowerCase()}а</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/10 text-primary text-xl">{selectedClient.first_name?.[0] || 'C'}</AvatarFallback></Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold">{selectedClient.first_name} {selectedClient.last_name}</p>
                    {getStatusBadge(getClientStatus(selectedClient))}
                  </div>
                  <p className="text-muted-foreground">{selectedClient.email}</p>
                  {selectedClient.phone && <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>}
                  <Badge variant="secondary" className="font-mono mt-1">ID: {selectedClient.skillspot_id}</Badge>
                </div>
              </div>

              {/* Status picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Статус клиента</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['vip', 'regular', 'new', 'sleeping', 'inactive', 'blacklisted'] as ClientStatus[]).map(s => {
                    const cfg = statusConfig[s];
                    const current = getClientStatus(selectedClient);
                    const isActive = current === s;
                    return (
                      <Button key={s} size="sm" variant={isActive ? 'default' : 'outline'} className={`h-7 text-xs gap-1 ${!isActive ? cfg.color : ''}`}
                        onClick={async () => {
                          if (!user || !selectedClient) return;
                          if (s === 'blacklisted' && !selectedClient.isBlacklisted) {
                            setBlacklistTarget(selectedClient); return;
                          }
                          if (s === 'blacklisted' && selectedClient.isBlacklisted) {
                            handleUnblacklist(selectedClient.id); return;
                          }
                          if (s === 'vip') {
                            if (selectedClient.vipByCount > 0) {
                              await supabase.from('client_tags').delete().eq('client_id', selectedClient.id).eq('tagger_id', user.id).eq('tag', 'vip');
                            } else {
                              await supabase.from('client_tags').insert({ client_id: selectedClient.id, tagger_id: user.id, tag: 'vip' });
                            }
                            fetchClients(); setSelectedClient(null);
                          }
                        }}
                      >
                        <cfg.icon className="h-3 w-3" /> {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {!selectedClient.isBlacklisted && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => startChat(selectedClient)}>
                    <MessageSquare className="h-3.5 w-3.5" /> Написать
                  </Button>
                )}
              </div>

              <UserScoreCard userId={selectedClient.id} viewMode="master" />

              {/* Interaction stats */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Статистика взаимодействия</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold">{selectedClient.firstVisit ? formatDistanceToNow(new Date(selectedClient.firstVisit), { locale: ru }) : '—'}</p>
                      <p className="text-xs text-muted-foreground">С первого визита</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold">{selectedClient.completedSessions}</p>
                      <p className="text-xs text-muted-foreground">Завершено</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <Ban className="h-4 w-4 mx-auto mb-1 text-destructive" />
                      <p className="text-lg font-bold">{selectedClient.noShows}</p>
                      <p className="text-xs text-muted-foreground">Неявок</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-accent-foreground" />
                      <p className="text-lg font-bold">{selectedClient.cancellations}</p>
                      <p className="text-xs text-muted-foreground">Отмен</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{selectedClient.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Всего записей</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{getRate(selectedClient)}</p>
                      <p className="text-xs text-muted-foreground">Посещаемость</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Private notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Мои заметки
                    <span className="text-xs text-muted-foreground font-normal">(видны только вам)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea placeholder="Добавить заметку..." value={newNote} onChange={e => setNewNote(e.target.value)} className="min-h-[60px]" />
                    <Button size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()} className="shrink-0 self-end">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {notes.filter(n => n.tag === 'note').length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Нет заметок</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.filter(n => n.tag === 'note').map(n => (
                        <div key={n.id} className="flex items-start justify-between p-2 rounded-lg bg-muted text-sm">
                          <div>
                            <p>{n.note}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(n.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => deleteNote(n.id)} className="h-7 w-7 p-0 shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* History */}
              <Card>
                <CardHeader><CardTitle className="text-base">История</CardTitle></CardHeader>
                <CardContent>
                  {clientHistory.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">Нет данных</p>
                  ) : (
                    <div className="space-y-2">
                      {clientHistory.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                          <div>
                            <p className="font-medium">{(b.lessons as any)?.title}</p>
                            <p className="text-muted-foreground">{(b.lessons as any)?.lesson_date} · {(b.lessons as any)?.start_time?.slice(0, 5)}</p>
                          </div>
                          <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                            {b.status === 'confirmed' ? 'Подтверждено' : b.status === 'pending' ? 'Ожидание' : b.status === 'cancelled' ? 'Отменено' : b.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Blacklist dialog */}
      <Dialog open={!!blacklistTarget} onOpenChange={() => { setBlacklistTarget(null); setBlacklistReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><Ban className="h-5 w-5" /> Добавить в чёрный список</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Клиент не сможет записываться к вам</p>
          <div className="space-y-2">
            <Textarea value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)} placeholder="Причина (необязательно)" className="min-h-[60px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setBlacklistTarget(null); setBlacklistReason(''); }}>Отмена</Button>
            <Button variant="destructive" onClick={handleBlacklist}><Ban className="h-4 w-4 mr-1" /> Заблокировать</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UniversalClients;
