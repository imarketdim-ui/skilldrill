import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MessageSquare, CheckCircle2, XCircle, Loader2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface BusinessRow {
  id: string;
  name: string;
  address?: string | null;
  inn?: string | null;
  director_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  description?: string | null;
  work_photos?: any;
  interior_photos?: any;
  exterior_photos?: any;
  subscription_status: string;
  moderation_status: string;
  created_at: string;
  owner_id: string;
  owner?: { first_name: string | null; last_name: string | null; skillspot_id: string | null; email: string | null } | null;
}

type SetupStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected';

const SETUP_LABELS: Record<SetupStatus, string> = {
  not_started: 'Не начата',
  in_progress: 'В процессе',
  pending_review: 'Ожидает проверки',
  approved: 'Одобрена',
  rejected: 'Отклонена',
};

const SETUP_VARIANT: Record<SetupStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  not_started: 'outline',
  in_progress: 'secondary',
  pending_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const computeStatus = (b: BusinessRow): SetupStatus => {
  if (b.moderation_status === 'approved') return 'approved';
  if (b.moderation_status === 'rejected') return 'rejected';
  if (b.moderation_status === 'pending') return 'pending_review';
  const hasBasics = !!b.name && !!b.address && !!b.director_name && !!b.contact_phone;
  const hasPhotos = (b.work_photos?.length ?? 0) + (b.interior_photos?.length ?? 0) + (b.exterior_photos?.length ?? 0) > 0;
  if (hasBasics && hasPhotos) return 'pending_review';
  if (hasBasics || hasPhotos) return 'in_progress';
  return 'not_started';
};

/**
 * Помощь интегратора в настройке ЛК бизнеса.
 * Поиск, чеклист незаполненных полей, переход в чат с владельцем.
 * Только просмотр (без редактирования).
 */
const IntegratorSetup = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BusinessRow | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('business_locations')
      .select('id, name, address, inn, director_name, contact_email, contact_phone, description, work_photos, interior_photos, exterior_photos, subscription_status, moderation_status, created_at, owner_id, owner:profiles!business_locations_owner_id_fkey(first_name, last_name, skillspot_id, email)')
      .order('created_at', { ascending: false })
      .limit(500);
    setItems((data || []) as any);
    setLoading(false);
  };

  const startSupportChat = async (ownerId: string, businessName: string) => {
    if (!user) return;
    try {
      await supabase.from('chat_messages').insert({
        sender_id: user.id,
        recipient_id: ownerId,
        chat_type: 'support',
        message: `Здравствуйте! Я интегратор платформы. Помогу настроить «${businessName}». Какой вопрос?`,
      });
      toast({ title: 'Чат создан', description: 'Перейдите во вкладку «Поддержка»' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.name?.toLowerCase().includes(q) ||
      it.owner?.skillspot_id?.toLowerCase().includes(q) ||
      it.owner?.email?.toLowerCase().includes(q)
    );
  });

  if (selected) {
    const checklist: { label: string; ok: boolean }[] = [
      { label: 'Название', ok: !!selected.name },
      { label: 'Адрес', ok: !!selected.address },
      { label: 'ИНН', ok: !!selected.inn },
      { label: 'ФИО директора', ok: !!selected.director_name },
      { label: 'Контактный email', ok: !!selected.contact_email },
      { label: 'Контактный телефон', ok: !!selected.contact_phone },
      { label: 'Описание', ok: !!selected.description },
      { label: 'Фото работ', ok: (selected.work_photos?.length ?? 0) > 0 },
      { label: 'Фото интерьера', ok: (selected.interior_photos?.length ?? 0) > 0 },
      { label: 'Фото фасада', ok: (selected.exterior_photos?.length ?? 0) > 0 },
    ];
    const status = computeStatus(selected);
    const filled = checklist.filter((c) => c.ok).length;

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>← К списку</Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{selected.name}</CardTitle>
                <CardDescription>
                  Владелец: {selected.owner?.first_name} {selected.owner?.last_name} · {selected.owner?.skillspot_id}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={SETUP_VARIANT[status]}>{SETUP_LABELS[status]}</Badge>
                <Button size="sm" onClick={() => startSupportChat(selected.owner_id, selected.name)}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Связаться с владельцем
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Чеклист настройки</h4>
                <span className="text-xs text-muted-foreground">{filled} / {checklist.length}</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {checklist.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-sm p-2 rounded border">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 text-sm pt-3 border-t">
              <div className="flex justify-between"><span className="text-muted-foreground">Подписка</span><Badge variant="outline">{selected.subscription_status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Модерация</span><Badge variant="outline">{selected.moderation_status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Создан</span><span>{new Date(selected.created_at).toLocaleDateString('ru-RU')}</span></div>
            </div>

            <p className="text-xs text-muted-foreground italic pt-2 border-t">
              Интегратор видит данные бизнеса, но не редактирует их. Для изменений свяжитесь с владельцем.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Настройка ЛК бизнеса</CardTitle>
        <CardDescription>Помощь владельцам в заполнении профиля и онбординге.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск бизнеса по названию или Skillspot ID владельца"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => {
              const status = computeStatus(b);
              return (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/50 transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {b.owner?.first_name} {b.owner?.last_name} · {b.owner?.skillspot_id}
                    </p>
                  </div>
                  <Badge variant={SETUP_VARIANT[status]} className="shrink-0">{SETUP_LABELS[status]}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntegratorSetup;
