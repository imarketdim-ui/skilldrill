import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Ban, User, Calendar, TrendingUp, AlertTriangle, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import UserScoreCard from '@/components/dashboard/UserScoreCard';

interface StudentInfo {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; skillspot_id: string;
  totalLessons: number; completedLessons: number; noShows: number; totalPaid: number; totalOwed: number;
}

const TeachingStudents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [blacklistTarget, setBlacklistTarget] = useState<StudentInfo | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [blacklistCount, setBlacklistCount] = useState(0);

  useEffect(() => { if (user) { fetchStudents(); fetchBlacklistCount(); } }, [user]);

  const fetchBlacklistCount = async () => {
    if (!user) return;
    const { count } = await supabase.from('blacklists').select('id', { count: 'exact' }).eq('blocker_id', user.id);
    setBlacklistCount(count || 0);
  };

  const fetchStudents = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bookings } = await supabase.from('lesson_bookings')
      .select('student_id, status, lesson_id, lessons!inner(teacher_id, status, price)')
      .eq('lessons.teacher_id', user.id);
    if (!bookings || bookings.length === 0) { setStudents([]); setLoading(false); return; }

    const studentIds = [...new Set(bookings.map(b => b.student_id))];
    const { data: profiles } = await supabase.from('profiles')
      .select('id, first_name, last_name, email, phone, skillspot_id').in('id', studentIds);

    setStudents((profiles || []).map(p => {
      const sb = bookings.filter(b => b.student_id === p.id);
      return {
        id: p.id, first_name: p.first_name, last_name: p.last_name,
        email: p.email, phone: p.phone, skillspot_id: p.skillspot_id,
        totalLessons: sb.length,
        completedLessons: sb.filter(b => (b.lessons as any)?.status === 'completed').length,
        noShows: sb.filter(b => b.status === 'cancelled').length,
        totalPaid: 0, totalOwed: 0,
      };
    }));
    setLoading(false);
  };

  const openStudentProfile = async (student: StudentInfo) => {
    setSelectedStudent(student);
    if (!user) return;
    const { data } = await supabase.from('lesson_bookings')
      .select('*, lessons!inner(title, lesson_date, start_time, end_time, price, status, teacher_id)')
      .eq('student_id', student.id).eq('lessons.teacher_id', user.id)
      .order('created_at', { ascending: false }).limit(20);
    setStudentLessons(data || []);
  };

  const handleBlacklist = async () => {
    if (!user || !blacklistTarget) return;
    const { error } = await supabase.from('blacklists').insert({
      blocker_id: user.id, blocked_id: blacklistTarget.id, reason: blacklistReason || null,
    });
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Добавлен в чёрный список' }); setBlacklistTarget(null); setBlacklistReason(''); fetchBlacklistCount(); }
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return !q || s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.skillspot_id.includes(q);
  });

  const getRate = (s: StudentInfo) => s.totalLessons === 0 ? '—' : Math.round((s.completedLessons / s.totalLessons) * 100) + '%';
  const getInitials = (first?: string | null, last?: string | null) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Студенты</h2>
        <p className="text-sm text-muted-foreground">{filtered.length} студентов · {blacklistCount} в чёрном списке</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по имени или Telegram..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Student List */}
      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{search ? 'Студенты не найдены' : 'У вас пока нет студентов'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(student => (
            <Card key={student.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openStudentProfile(student)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(student.first_name, student.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.first_name || ''} {student.last_name || ''}{!student.first_name && !student.last_name && student.email}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center hidden sm:block">
                      <p className="font-semibold text-primary">{student.totalLessons}</p>
                      <p className="text-muted-foreground text-xs">Занятий</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="font-semibold">{getRate(student)}</p>
                      <p className="text-muted-foreground text-xs">Посещ.</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setBlacklistTarget(student); }} className="text-destructive">
                          <Ban className="h-4 w-4 mr-2" /> В чёрный список
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student Profile Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Профиль студента</DialogTitle></DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">{getInitials(selectedStudent.first_name, selectedStudent.last_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p className="text-muted-foreground">{selectedStudent.email}</p>
                  <Badge variant="secondary" className="font-mono mt-1">ID: {selectedStudent.skillspot_id}</Badge>
                </div>
              </div>
              <UserScoreCard userId={selectedStudent.id} viewMode="master" />
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-4 text-center"><Calendar className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xl font-bold">{selectedStudent.completedLessons}</p><p className="text-xs text-muted-foreground">Посещено</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><Ban className="h-5 w-5 mx-auto mb-1 text-destructive" /><p className="text-xl font-bold">{selectedStudent.noShows}</p><p className="text-xs text-muted-foreground">Пропуски</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xl font-bold">{getRate(selectedStudent)}</p><p className="text-xs text-muted-foreground">Посещаемость</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">История занятий</CardTitle></CardHeader>
                <CardContent>
                  {studentLessons.length === 0 ? <p className="text-center py-4 text-muted-foreground">Нет данных</p> : (
                    <div className="space-y-2">
                      {studentLessons.map(b => (
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

      {/* Blacklist Dialog */}
      <Dialog open={!!blacklistTarget} onOpenChange={() => { setBlacklistTarget(null); setBlacklistReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" /> Добавить в чёрный список
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Студент не сможет записываться на занятия и отправлять сообщения</p>

          {blacklistTarget && (
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(blacklistTarget.first_name, blacklistTarget.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{blacklistTarget.first_name} {blacklistTarget.last_name}</p>
                    <p className="text-sm text-muted-foreground">{blacklistTarget.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Внимание!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Это действие заблокирует студента. Вы сможете разблокировать его позже.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Причина (необязательно)</Label>
            <Textarea value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)} placeholder="Укажите причину блокировки..." className="min-h-[80px]" />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setBlacklistTarget(null); setBlacklistReason(''); }}>Отмена</Button>
            <Button variant="destructive" onClick={handleBlacklist} className="gap-2">
              <Ban className="h-4 w-4" /> Заблокировать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachingStudents;
