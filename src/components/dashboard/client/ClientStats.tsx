import { useState, useEffect } from 'react';
import { Shield, Info, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

// Color thresholds
function noShowColor(pct: number): string {
  if (pct <= 2) return 'bg-primary/15 border-primary/30 text-primary';
  if (pct <= 5) return 'bg-amber-500/15 border-amber-500/30 text-amber-600';
  return 'bg-destructive/15 border-destructive/30 text-destructive';
}

function cancel1hColor(pct: number): string {
  if (pct <= 3) return 'bg-primary/15 border-primary/30 text-primary';
  if (pct <= 7) return 'bg-amber-500/15 border-amber-500/30 text-amber-600';
  return 'bg-destructive/15 border-destructive/30 text-destructive';
}

function cancel3hColor(pct: number): string {
  if (pct <= 5) return 'bg-primary/15 border-primary/30 text-primary';
  if (pct <= 10) return 'bg-amber-500/15 border-amber-500/30 text-amber-600';
  return 'bg-destructive/15 border-destructive/30 text-destructive';
}

function blacklistColor(bl: number, vip: number): string {
  if (bl === 0) return 'bg-primary/15 border-primary/30 text-primary';
  if (bl === 1) return 'bg-amber-500/15 border-amber-500/30 text-amber-600';
  // >1: check ratio to VIP
  if (vip === 0) return 'bg-destructive/15 border-destructive/30 text-destructive';
  const ratio = (bl / vip) * 100;
  if (ratio < 2) return 'bg-primary/15 border-primary/30 text-primary';
  if (ratio < 10) return 'bg-amber-500/15 border-amber-500/30 text-amber-600';
  return 'bg-destructive/15 border-destructive/30 text-destructive';
}

function pctVal(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

export default function ClientStats({ userId }: Props) {
  const { toast } = useToast();
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const loadScore = async () => {
    const { data } = await supabase.from('user_scores').select('*').eq('user_id', userId).maybeSingle();
    if (data) setScore(data as any);
    setLoading(false);
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.rpc('calculate_user_score', { _user_id: userId });
      if (error) throw error;
      await loadScore();
      toast({ title: 'Статистика обновлена' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setRecalculating(false); }
  };

  useEffect(() => { loadScore(); }, [userId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!score) {
    return (
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
    );
  }

  const totalBookings = score.completed_visits + score.total_cancellations + score.no_show_count;
  const isNewUser = score.account_age_days < 90 && score.completed_visits < 20;
  // Stats active when 20+ visits OR 3+ months

  const noShowPct = pctVal(score.no_show_count, totalBookings);
  const cancel1hPct = pctVal(score.cancel_under_1h, totalBookings);
  const cancel3hPct = pctVal(score.cancel_under_3h, totalBookings);

  const grayStyle = 'bg-muted border-border text-muted-foreground';

  const metrics = [
    {
      label: 'Неявки',
      value: `${noShowPct.toFixed(1)}%`,
      sub: `${score.no_show_count} из ${totalBookings}`,
      color: isNewUser ? grayStyle : noShowColor(noShowPct),
    },
    {
      label: 'Отмены менее чем за 1 час',
      value: `${cancel1hPct.toFixed(1)}%`,
      sub: `${score.cancel_under_1h} из ${totalBookings}`,
      color: isNewUser ? grayStyle : cancel1hColor(cancel1hPct),
    },
    {
      label: 'Отмены менее чем за 3 часа',
      value: `${cancel3hPct.toFixed(1)}%`,
      sub: `${score.cancel_under_3h} из ${totalBookings}`,
      color: isNewUser ? grayStyle : cancel3hColor(cancel3hPct),
    },
    {
      label: 'VIP оценки от мастеров',
      value: score.vip_by_count.toString(),
      sub: 'Мастера добавили вас в VIP',
      color: isNewUser ? grayStyle : 'bg-primary/15 border-primary/30 text-primary',
    },
    {
      label: 'В чёрном списке',
      value: score.blacklist_by_count.toString(),
      sub: score.blacklist_by_count > 0 ? `Соотношение к VIP: ${score.vip_by_count > 0 ? ((score.blacklist_by_count / score.vip_by_count) * 100).toFixed(0) : '—'}%` : 'Вас нет в ЧС',
      color: isNewUser ? grayStyle : blacklistColor(score.blacklist_by_count, score.vip_by_count),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Ваша статистика
        </h3>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger><Info className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Статистика помогает мастерам оценить вашу надёжность. Сохраняя хорошие показатели, вы получаете приоритетный доступ к записи, бонусы и скидки.
            </TooltipContent>
          </Tooltip>
          <Button size="sm" variant="ghost" onClick={recalculate} disabled={recalculating} className="h-7 px-2">
            {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Мастера могут использовать вашу статистику, чтобы предоставлять бонусы и скидки, открывать автоматическую запись без предоплаты и другие привилегии.
            Старайтесь приходить вовремя и отменять записи заблаговременно — это поможет получить все выгоды от использования сервиса.
          </p>
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted">
            <div>
              <p className="text-sm font-medium">Завершённых визитов</p>
              <p className="text-2xl font-bold">{score.completed_visits}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-sm font-medium">На платформе</p>
              <p className="text-2xl font-bold">{score.account_age_days} <span className="text-sm font-normal text-muted-foreground">дней</span></p>
            </div>
          </div>

          {isNewUser && (
            <div className="p-3 rounded-lg bg-muted border border-border mb-4">
              <p className="text-sm text-muted-foreground">
                📊 Пока мало данных — статистика станет информативнее после 20 посещений или 3 месяцев на платформе. Продолжайте использовать сервис!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
