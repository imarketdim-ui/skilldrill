import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Ban, User, Calendar, Banknote, TrendingUp } from 'lucide-react';

interface StudentInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  skillspot_id: string;
  totalLessons: number;
  completedLessons: number;
  noShows: number;
  totalPaid: number;
  totalOwed: number;
}

const TeachingStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchStudents();
  }, [user]);

  const fetchStudents = async () => {
    if (!user) return;
    setLoading(true);

    // Get all bookings for this teacher's lessons
    const { data: bookings } = await supabase
      .from('lesson_bookings')
      .select('student_id, status, lesson_id, lessons!inner(teacher_id, status, price)')
      .eq('lessons.teacher_id', user.id);

    if (!bookings || bookings.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Get unique student IDs
    const studentIds = [...new Set(bookings.map(b => b.student_id))];

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, skillspot_id')
      .in('id', studentIds);

    // Calculate stats per student
    const studentMap = new Map<string, StudentInfo>();
    for (const p of profiles || []) {
      const studentBookings = bookings.filter(b => b.student_id === p.id);
      const completed = studentBookings.filter(b => (b.lessons as any)?.status === 'completed').length;
      const noShows = studentBookings.filter(b => b.status === 'cancelled' && b.status).length;

      studentMap.set(p.id, {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        skillspot_id: p.skillspot_id,
        totalLessons: studentBookings.length,
        completedLessons: completed,
        noShows,
        totalPaid: 0,
        totalOwed: 0,
      });
    }

    setStudents(Array.from(studentMap.values()));
    setLoading(false);
  };

  const openStudentProfile = async (student: StudentInfo) => {
    setSelectedStudent(student);
    if (!user) return;

    const { data } = await supabase
      .from('lesson_bookings')
      .select('*, lessons!inner(title, lesson_date, start_time, end_time, price, status, teacher_id)')
      .eq('student_id', student.id)
      .eq('lessons.teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setStudentLessons(data || []);
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return !q || (s.first_name?.toLowerCase().includes(q)) || (s.last_name?.toLowerCase().includes(q)) || s.email?.toLowerCase().includes(q) || s.skillspot_id.includes(q);
  });

  const getAttendanceRate = (s: StudentInfo) => {
    if (s.totalLessons === 0) return '—';
    return Math.round((s.completedLessons / s.totalLessons) * 100) + '%';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по имени, email или ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {search ? 'Студенты не найдены' : 'У вас пока нет студентов'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(student => (
            <Card key={student.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openStudentProfile(student)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {student.first_name?.[0] || student.email?.[0] || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {student.first_name || ''} {student.last_name || ''}
                        {!student.first_name && !student.last_name && student.email}
                      </p>
                      <p className="text-sm text-muted-foreground">ID: {student.skillspot_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{student.totalLessons}</p>
                      <p className="text-muted-foreground">Занятий</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{getAttendanceRate(student)}</p>
                      <p className="text-muted-foreground">Посещ.</p>
                    </div>
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
          <DialogHeader>
            <DialogTitle>Профиль студента</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedStudent.first_name?.[0] || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p className="text-muted-foreground">{selectedStudent.email}</p>
                  <Badge variant="secondary" className="font-mono mt-1">ID: {selectedStudent.skillspot_id}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{selectedStudent.completedLessons}</p>
                    <p className="text-xs text-muted-foreground">Посещено</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Ban className="h-5 w-5 mx-auto mb-1 text-destructive" />
                    <p className="text-xl font-bold">{selectedStudent.noShows}</p>
                    <p className="text-xs text-muted-foreground">Пропуски</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold">{getAttendanceRate(selectedStudent)}</p>
                    <p className="text-xs text-muted-foreground">Посещаемость</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">История занятий</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentLessons.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">Нет данных</p>
                  ) : (
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
    </div>
  );
};

export default TeachingStudents;
