import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, Ban, TrendingUp, Calendar, Clock, StickyNote, Plus, Trash2 } from 'lucide-react';
import { CategoryConfig } from './categoryConfig';
import UserScoreCard from '@/components/dashboard/UserScoreCard';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ClientInfo {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; skillspot_id: string;
  totalSessions: number; completedSessions: number; noShows: number;
  cancellations: number; firstVisit: string | null;
}

interface Props { config: CategoryConfig; }

const UniversalClients = ({ config }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => { if (user) fetchClients(); }, [user]);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bookings } = await supabase
      .from('lesson_bookings')
      .select('student_id, status, lesson_id, created_at, lessons!inner(teacher_id, status, price, lesson_date)')
      .eq('lessons.teacher_id', user.id);
    if (!bookings || bookings.length === 0) { setClients([]); setLoading(false); return; }
    const clientIds = [...new Set(bookings.map(b => b.student_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email, phone, skillspot_id').in('id', clientIds);
    const list: ClientInfo[] = (profiles || []).map(p => {
      const cb = bookings.filter(b => b.student_id === p.id);
      const sorted = cb.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        id: p.id, first_name: p.first_name, last_name: p.last_name,
        email: p.email, phone: p.phone, skillspot_id: p.skillspot_id,
        totalSessions: cb.length,
        completedSessions: cb.filter(b => (b.lessons as any)?.status === 'completed').length,
        noShows: cb.filter(b => b.status === 'cancelled' && (b.lessons as any)?.status === 'no_show').length,
        cancellations: cb.filter(b => b.status === 'cancelled').length,
        firstVisit: sorted.length > 0 ? (sorted[0].lessons as any)?.lesson_date : null,
      };
    });
    setClients(list);
    setLoading(false);
  };

  const openProfile = async (client: ClientInfo) => {
    setSelectedClient(client);
    if (!user) return;
    const [histRes, notesRes] = await Promise.all([
      supabase.from('lesson_bookings')
        .select('*, lessons!inner(title, lesson_date, start_time, end_time, price, status, teacher_id)')
        .eq('student_id', client.id).eq('lessons.teacher_id', user.id)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('client_tags')
        .select('*')
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
      // Reload notes
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

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.skillspot_id.includes(q);
  });

  const getRate = (c: ClientInfo) => c.totalSessions === 0 ? '—' : Math.round((c.completedSessions / c.totalSessions) * 100) + '%';

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Поиск по имени, email или ID...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
          {filtered.map(c => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openProfile(c)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback className="bg-primary/10 text-primary">{c.first_name?.[0] || 'C'}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{c.first_name || ''} {c.last_name || ''}{!c.first_name && !c.last_name && c.email}</p>
                      <p className="text-sm text-muted-foreground">ID: {c.skillspot_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center"><p className="font-semibold">{c.totalSessions}</p><p className="text-muted-foreground">{config.sessionNamePlural}</p></div>
                    <div className="text-center"><p className="font-semibold">{getRate(c)}</p><p className="text-muted-foreground">Посещ.</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Профиль {config.clientName.toLowerCase()}а</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/10 text-primary text-xl">{selectedClient.first_name?.[0] || 'C'}</AvatarFallback></Avatar>
                <div>
                  <p className="text-xl font-bold">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-muted-foreground">{selectedClient.email}</p>
                  {selectedClient.phone && <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>}
                  <Badge variant="secondary" className="font-mono mt-1">ID: {selectedClient.skillspot_id}</Badge>
                </div>
              </div>

              {/* Score card (without specific numbers, just assessment + total) */}
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
                    <Textarea
                      placeholder="Добавить заметку..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()} className="shrink-0 self-end">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Нет заметок</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map(n => (
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
    </div>
  );
};

export default UniversalClients;
