import { useState, useEffect, useCallback } from 'react';
import { Shield, Info, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props { userId: string; }

interface ScoreData {
  total_score: number;
  completed_visits: number;
  no_show_count: number;
  cancel_under_1h: number;
  cancel_under_3h: number;
  total_cancellations: number;
  vip_by_count: number;
  blacklist_by_count: number;
  account_age_days: number;
  status: string;
}

function noShowColor(pct: number) {
  if (pct <= 2) return 'bg-primary/10 border-primary/30 text-primary';
  if (pct <= 5) return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
  return 'bg-destructive/10 border-destructive/30 text-destructive';
}
function cancel1hColor(pct: number) {
  if (pct <= 3) return 'bg-primary/10 border-primary/30 text-primary';
  if (pct <= 7) return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
  return 'bg-destructive/10 border-destructive/30 text-destructive';
}
function cancel3hColor(pct: number) {
  if (pct <= 5) return 'bg-primary/10 border-primary/30 text-primary';
  if (pct <= 10) return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
  return 'bg-destructive/10 border-destructive/30 text-destructive';
}
function blacklistColor(bl: number, vip: number) {
  if (bl === 0) return 'bg-primary/10 border-primary/30 text-primary';
  if (bl === 1) return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
  if (vip === 0) return 'bg-destructive/10 border-destructive/30 text-destructive';
  const ratio = (bl / vip) * 100;
  if (ratio < 2) return 'bg-primary/10 border-primary/30 text-primary';
  if (ratio < 10) return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
  return 'bg-destructive/10 border-destructive/30 text-destructive';
}
function pct(count: number, total: number) { return total === 0 ? 0 : (count / total) * 100; }

// Profile completeness items that affect master decisions
const PROFILE_ITEMS = [
  { key: 'first_name', label: 'Имя', desc: 'Мастера видят ваше имя' },
  { key: 'last_name', label: 'Фамилия', desc: 'Полное имя повышает доверие' },
  { key: 'avatar_url', label: 'Фото профиля', desc: 'Фото значительно повышает доверие' },
  { key: 'phone', label: 'Телефон', desc: 'Мастера могут связаться с вами' },
  { key: 'bio', label: 'О себе', desc: 'Краткое описание о вас' },
  { key: 'kyc_verified', label: 'KYC верификация', desc: 'Подтверждение личности — наивысший уровень доверия' },
];

export default function ClientStats({ userId }: Props) {
  const { toast } = useToast();
  const [score, setScore] = useState<ScoreData | null>(null);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadScore = useCallback(async () => {
    const [scoreRes, profileRes] = await Promise.all([
      // Try user_scores_public view, fall back gracefully
      supabase.from('user_scores_public').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('first_name, last_name, avatar_url, phone, bio, kyc_verified').eq('id', userId).maybeSingle(),
    ]);
    if (scoreRes.data) {
      setScore(scoreRes.data as any);
      setLastUpdated(new Date());
    } else {
      // No score yet — that's OK, show empty state
      setScore(null);
    }
    if (profileRes.data) setProfileData(profileRes.data);
    setLoading(false);
  }, [userId]);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      // calculate_user_score returns a TABLE, not a single value
      const { data, error } = await supabase.rpc('calculate_user_score', { _user_id: userId });
      if (error) throw error;
      // After recalc, reload from user_scores_public which was updated
      await loadScore();
      toast({ title: 'Статистика обновлена' });
    } catch (err: any) {
      toast({ title: 'Ошибка обновления', description: err.message, variant: 'destructive' });
    } finally { setRecalculating(false); }
  };

  // Auto-refresh every 3 minutes while tab is active
  useEffect(() => {
    loadScore();
    const interval = setInterval(loadScore, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadScore]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const totalBookings = (score?.completed_visits ?? 0) + (score?.total_cancellations ?? 0) + (score?.no_show_count ?? 0);
  const isNewUser = !score || (score.account_age_days < 90 && score.completed_visits < 20);

  const noShowP = score ? pct(score.no_show_count, totalBookings) : 0;
  const cancel1hP = score ? pct(score.cancel_under_1h, totalBookings) : 0;
  const cancel3hP = score ? pct(score.cancel_under_3h, totalBookings) : 0;

  const grayStyle = 'bg-muted border-border text-muted-foreground';

  const metrics = score ? [
    { label: 'Неявки', value: `${noShowP.toFixed(1)}%`, sub: `${score.no_show_count} из ${totalBookings}`, color: isNewUser ? grayStyle : noShowColor(noShowP) },
    { label: 'Отмены < 1 часа', value: `${cancel1hP.toFixed(1)}%`, sub: `${score.cancel_under_1h} из ${totalBookings}`, color: isNewUser ? grayStyle : cancel1hColor(cancel1hP) },
    { label: 'Отмены < 3 часов', value: `${cancel3hP.toFixed(1)}%`, sub: `${score.cancel_under_3h} из ${totalBookings}`, color: isNewUser ? grayStyle : cancel3hColor(cancel3hP) },
    { label: 'VIP у мастеров', value: String(score.vip_by_count), sub: 'Добавили вас в VIP', color: isNewUser ? grayStyle : 'bg-primary/10 border-primary/30 text-primary' },
    { label: 'В чёрных списках', value: String(score.blacklist_by_count), sub: score.blacklist_by_count > 0 ? `К VIP: ${score.vip_by_count > 0 ? ((score.blacklist_by_count / score.vip_by_count) * 100).toFixed(0) : '—'}%` : 'Не в ЧС', color: isNewUser ? grayStyle : blacklistColor(score.blacklist_by_count, score.vip_by_count) },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Ваша статистика
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastUpdated && <span>Обновлено: {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}
          <Button size="sm" variant="ghost" onClick={recalculate} disabled={recalculating} className="h-7 px-2">
            {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Privacy notice — what masters CAN see */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-medium">Что видят мастера о вас?</p>
              <p>Мастера видят <strong>только обобщённые данные</strong>: «часто / редко / никогда». Точные цифры (количество неявок, отмен) мастерам <strong>не показываются</strong>. Они видят уровень надёжности: Высокий / Средний / Низкий.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {score && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-3">
              Статистика помогает мастерам оценить вашу надёжность. Хорошие показатели дают доступ к автоматическому подтверждению записей, скидкам и бонусам.
            </p>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
              <div>
                <p className="text-xs text-muted-foreground">Завершённых визитов</p>
                <p className="text-2xl font-bold">{score.completed_visits}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">На платформе</p>
                <p className="text-2xl font-bold">{score.account_age_days} <span className="text-sm font-normal text-muted-foreground">дней</span></p>
              </div>
            </div>
            {isNewUser && (
              <div className="mt-3 p-3 rounded-lg bg-muted border border-border">
                <p className="text-sm text-muted-foreground">
                  📊 Пока мало данных — статистика становится информативной после 20 визитов или 3 месяцев. Показатели отображаются серым — это нормально для новых аккаунтов.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!score && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Статистика ещё не рассчитана</p>
            <Button size="sm" variant="outline" onClick={recalculate} disabled={recalculating}>
              {recalculating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Рассчитать
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics grid */}
      {metrics.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m, i) => (
            <div key={i} className={`p-4 rounded-xl border ${m.color}`}>
              {isNewUser && <p className="text-[10px] uppercase tracking-wider mb-1 opacity-60">Мало данных</p>}
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-sm font-medium mt-1">{m.label}</p>
              <p className="text-xs mt-0.5 opacity-75">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Profile completeness — what influences master decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Заполненность профиля
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Мастера учитывают заполненность профиля при принятии решений о записи. Заполненный профиль = больше доверия.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PROFILE_ITEMS.map(item => {
              const value = profileData[item.key];
              const filled = item.key === 'kyc_verified' ? !!value : !!value && String(value).trim() !== '';
              return (
                <div key={item.key} className="flex items-center gap-3 py-1.5">
                  {filled
                    ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${filled ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {filled
                    ? <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Заполнено</Badge>
                    : <Badge variant="secondary" className="text-[10px]">Пусто</Badge>
                  }
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
