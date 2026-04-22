import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

interface Props {
  business: any;
}

const BusinessOnboardingProgress = ({ business }: Props) => {
  const checklist = useMemo(() => ([
    { key: 'name', label: 'Название', ok: !!business?.name },
    { key: 'inn', label: 'ИНН', ok: !!business?.inn },
    { key: 'address', label: 'Адрес', ok: !!business?.address },
    { key: 'director', label: 'ФИО руководителя', ok: !!business?.director_name },
    { key: 'phone', label: 'Контактный телефон', ok: !!business?.contact_phone },
    { key: 'email', label: 'Контактный email', ok: !!business?.contact_email },
    { key: 'description', label: 'Описание', ok: !!business?.description },
    { key: 'photos_ext', label: 'Фото фасада', ok: (business?.exterior_photos?.length ?? 0) > 0 },
    { key: 'photos_int', label: 'Фото интерьера', ok: (business?.interior_photos?.length ?? 0) > 0 },
    { key: 'photos_work', label: 'Фото работ', ok: (business?.work_photos?.length ?? 0) > 0 },
  ]), [business]);

  const filled = checklist.filter(c => c.ok).length;
  const total = checklist.length;
  const percent = Math.round((filled / total) * 100);

  const status = business?.onboarding_status || (percent === 100 ? 'pending_review' : 'in_progress');
  const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    in_progress: { label: 'В процессе', variant: 'secondary' },
    pending_review: { label: 'Ожидает проверки', variant: 'secondary' },
    approved: { label: 'Одобрено', variant: 'default' },
    rejected: { label: 'Требует доработки', variant: 'outline' },
  };
  const stat = statusLabel[status] || statusLabel.in_progress;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Онбординг бизнеса
            </CardTitle>
            <CardDescription>Заполните профиль для допуска к каталогу.</CardDescription>
          </div>
          <Badge variant={stat.variant}>{stat.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium">{filled}/{total} · {percent}%</span>
          </div>
          <Progress value={percent} />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {checklist.map(c => (
            <div key={c.key} className="flex items-center gap-2 text-sm">
              {c.ok
                ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessOnboardingProgress;
