import { useState, useEffect, useCallback } from 'react';
import { Shield, Info, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props { userId: string; onNavigate?: (section: string) => void; }

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

const PROFILE_ITEMS = [
  { key: 'first_name', label: 'Имя', desc: 'Мастера видят ваше имя' },
  { key: 'last_name', label: 'Фамилия', desc: 'Полное имя повышает доверие' },
  { key: 'avatar_url', label: 'Фото профиля', desc: 'Фото значительно повышает доверие' },
  { key: 'phone', label: 'Телефон', desc: 'Мастера могут связаться с вами' },
  { key: 'bio', label: 'О себе', desc: 'Краткое описание о вас' },
  { key: 'kyc_verified', label: 'KYC верификация', desc: 'Скоро будет добавлена' },
];

type MetricKey = 'no_show' | 'cancel_1h' | 'cancel_3h' | 'vip' | 'blacklist';

export default function ClientStats({ userId, onNavigate }: Props) {
  const { toast } = useToast();
  const [score, setScore] = useState<ScoreData | null>(null);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [metricDetail, setMetricDetail] = useState<any[]>([]);
  const [metricLoading, setMetricLoading] = useState(false);

  const loadScore = useCallback(async () => {
    const [scoreRes, profileRes] = await Promise.all([
      supabase.from('user_scores_public').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('first_name, last_name, avatar_url, phone, bio, kyc_verified').eq('id', userId).maybeSingle(),
    ]);
    if (scoreRes.data) {
      setScore(scoreRes.data as any);
      setLastUpdated(new Date());
    } else {
      setScore(null);
    }
    if (profileRes.data) setProfileData(profileRes.data);
    setLoading(false);
  }, [userId]);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.rpc('calculate_user_score', { _user_id: userId });
      if (error) throw error;
      await loadScore();
      toast({ title: 'Статистика обновлена' });
    } catch (err: any) {
      toast({ title: 'Ошибка обновления', description: err.message, variant: 'destructive' });
    } finally { setRecalculating(false); }
  };

  // Auto-recalc on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await supabase.rpc('calculate_user_score', { _user_id: userId });
      } catch {}
      await loadScore();
    })();
  }, [userId, loadScore]);

  const loadMetricDetail = async (metric: MetricKey) => {
    setActiveMetric(metric);
    setMetricLoading(true);
    setMetricDetail([]);
    try {
      if (metric === 'no_show') {
        const { data } = await supabase.from('bookings').select('id, scheduled_at, services!inner(name)').eq('client_id', userId).eq('status', 'no_show').order('scheduled_at', { ascending: false }).limit(20);
        setMetricDetail(data || []);
      } else if (metric === 'cancel_1h' || metric === 'cancel_3h') {
        const { data } = await supabase.from('bookings').select('id, scheduled_at, cancellation_reason, services!inner(name)').eq('client_id', userId).eq('status', 'cancelled').order('scheduled_at', { ascending: false }).limit(30);
        setMetricDetail(data || []);
      } else if (metric === 'vip') {
        const { data } = await supabase.from('client_tags').select('id, tagger_id, created_at, tag, profiles:tagger_id(first_name, last_name)').eq('client_id', userId).eq('tag', 'vip').limit(20);
        setMetricDetail(data || []);
      } else if (metric === 'blacklist') {
        const { data } = await supabase.from('blacklists').select('id, blocker_id, reason, created_at, profiles:blocker_id(first_name, last_name)').eq('blocked_id', userId).limit(20);
        setMetricDetail(data || []);
      }
    } catch {}
    setMetricLoading(false);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  // Metric detail drill-down view
  if (activeMetric) {
    const titles: Record<MetricKey, string> = {
      no_show: 'Неявки — подробности',
      cancel_1h: 'Отмены менее чем за 1 час',
      cancel_3h: 'Отмены менее чем за 3 часа',
      vip: 'Мастера, добавившие вас в VIP',
      blacklist: 'Чёрные списки',
    };
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveMetric(null)}>
          <ChevronLeft className="h-4 w-4" /> Назад к статистике
        </Button>
        <h3 className="font-semibold text-lg">{titles[activeMetric]}</h3>
        {metricLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : metricDetail.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {metricDetail.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="py-3 px-4">
                  {(activeMetric === 'no_show' || activeMetric === 'cancel_1h' || activeMetric === 'cancel_3h') && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{(item.services as any)?.name || 'Услуга'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.scheduled_at).toLocaleDateString('ru-RU')}</p>
                        {item.cancellation_reason && <p className="text-xs text-muted-foreground mt-1">Причина: {item.cancellation_reason}</p>}
                      </div>
                    </div>
                  )}
                  {activeMetric === 'vip' && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{(item as any).profiles?.first_name} {(item as any).profiles?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                  )}
                  {activeMetric === 'blacklist' && (
                    <div>
                      <p className="text-sm font-medium">{(item as any).profiles?.first_name} {(item as any).profiles?.last_name}</p>
                      {item.reason && <p className="text-xs text-muted-foreground">Причина: {item.reason}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const totalBookings = (score?.completed_visits ?? 0) + (score?.total_cancellations ?? 0) + (score?.no_show_count ?? 0);
  const isNewUser = !score || (score.account_age_days < 90 && score.completed_visits < 20);

  const noShowP = score ? pct(score.no_show_count, totalBookings) : 0;
  const cancel1hP = score ? pct(score.cancel_under_1h, totalBookings) : 0;
  const cancel3hP = score ? pct(score.cancel_under_3h, totalBookings) : 0;

  const grayStyle = 'bg-muted border-border text-muted-foreground';

  const metrics: { label: string; value: string; sub: string; color: string; metricKey: MetricKey }[] = score ? [
    { label: 'Неявки', value: `${noShowP.toFixed(1)}%`, sub: `${score.no_show_count} из ${totalBookings}`, color: isNewUser ? grayStyle : noShowColor(noShowP), metricKey: 'no_show' },
    { label: 'Отмены < 1 часа', value: `${cancel1hP.toFixed(1)}%`, sub: `${score.cancel_under_1h} из ${totalBookings}`, color: isNewUser ? grayStyle : cancel1hColor(cancel1hP), metricKey: 'cancel_1h' },
    { label: 'Отмены < 3 часов', value: `${cancel3hP.toFixed(1)}%`, sub: `${score.cancel_under_3h} из ${totalBookings}`, color: isNewUser ? grayStyle : cancel3hColor(cancel3hP), metricKey: 'cancel_3h' },
    { label: 'VIP у мастеров', value: String(score.vip_by_count), sub: 'Добавили вас в VIP', color: isNewUser ? grayStyle : 'bg-primary/10 border-primary/30 text-primary', metricKey: 'vip' },
    { label: 'В чёрных списках', value: String(score.blacklist_by_count), sub: score.blacklist_by_count > 0 ? `К VIP: ${score.vip_by_count > 0 ? ((score.blacklist_by_count / score.vip_by_count) * 100).toFixed(0) : '—'}%` : 'Не в ЧС', color: isNewUser ? grayStyle : blacklistColor(score.blacklist_by_count, score.vip_by_count), metricKey: 'blacklist' },
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

      {/* Privacy notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-medium">Что видят мастера о вас?</p>
              <p>Мастера видят <strong>только обобщённые данные</strong>: «часто / редко / никогда». Точные цифры мастерам <strong>не показываются</strong>.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {score && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-3">
              Хорошие показатели дают доступ к автоматическому подтверждению записей, скидкам и бонусам.
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
                  📊 Пока мало данных — статистика становится информативной после 20 визитов или 3 месяцев.
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

      {/* Metrics grid — clickable */}
      {metrics.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${m.color}`}
              onClick={() => loadMetricDetail(m.metricKey)}
            >
              {isNewUser && <p className="text-[10px] uppercase tracking-wider mb-1 opacity-60">Мало данных</p>}
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-sm font-medium mt-1">{m.label}</p>
              <p className="text-xs mt-0.5 opacity-75">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Profile completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Заполненность профиля
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Заполненный профиль = больше доверия от мастеров.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PROFILE_ITEMS.map(item => {
              const isKyc = item.key === 'kyc_verified';
              const value = profileData[item.key];
              const filled = isKyc ? false : !!value && String(value).trim() !== '';
              return (
                <div key={item.key} className="flex items-center gap-3 py-1.5">
                  {isKyc
                    ? <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    : filled
                      ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${filled ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {isKyc
                    ? <Badge variant="secondary" className="text-[10px]">Временно недоступна</Badge>
                    : filled
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
