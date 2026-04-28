import { useState, useEffect } from "react";
import { Shield, User, Activity, AlertTriangle, Heart, Info, Loader2, RefreshCw, BadgeCheck, Flag, CheckCircle2, XCircle, Mail, Phone, MessageCircle, FileCheck, PenLine, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface UserScoreCardProps {
  userId: string;
  viewMode: "master" | "client";
}

interface ScoreData {
  total_score: number;
  profile_score: number;
  activity_score: number;
  risk_score: number;
  reputation_score: number;
  completed_visits: number;
  no_show_count: number;
  cancel_under_1h: number;
  cancel_under_3h: number;
  total_cancellations: number;
  disputes_total: number;
  disputes_won: number;
  disputes_lost: number;
  vip_by_count: number;
  blacklist_by_count: number;
  unique_partners: number;
  top_partner_pct: number;
  has_full_name: boolean;
  has_photo: boolean;
  has_bio: boolean;
  kyc_verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  has_telegram: boolean;
  referral_count: number;
  status: string;
  account_age_days: number;
  last_calculated_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  insufficient_data: { label: "Мало данных", color: "text-muted-foreground" },
  active: { label: "Активный", color: "text-primary" },
  flagged: { label: "На проверке", color: "text-accent" },
  restricted: { label: "Ограничен", color: "text-destructive" },
  blocked: { label: "Заблокирован", color: "text-destructive" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-accent";
  if (score >= 50) return "text-accent";
  return "text-destructive";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-primary/10 border-primary/20";
  if (score >= 60) return "bg-accent/10 border-accent/20";
  if (score >= 50) return "bg-accent/10 border-accent/20";
  return "bg-destructive/10 border-destructive/20";
}

function blockLabel(value: number, max: number, isRisk: boolean = false): { text: string; color: string } {
  if (isRisk) {
    if (value >= 0) return { text: "Низкий", color: "text-primary" };
    if (value >= -20) return { text: "Средний", color: "text-accent" };
    return { text: "Высокий", color: "text-destructive" };
  }
  const pctVal = max > 0 ? (value / max) * 100 : 0;
  if (pctVal >= 60) return { text: "Высокая", color: "text-primary" };
  if (pctVal >= 30) return { text: "Средняя", color: "text-accent" };
  return { text: "Низкая", color: "text-muted-foreground" };
}

function pct(count: number, total: number): string {
  if (total === 0) return "0%";
  return ((count / total) * 100).toFixed(1) + "%";
}

export default function UserScoreCard({ userId, viewMode }: UserScoreCardProps) {
  const { toast } = useToast();
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const loadScore = async () => {
    const table = viewMode === "master" ? "user_scores_master_view" : "user_scores";
    const { data } = await supabase
      .from(table as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      if (viewMode === "master") {
        (data as any).risk_score = 0;
        (data as any).reputation_score = 0;
      }
      setScore(data as any);
    }
    setLoading(false);
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.rpc("calculate_user_score", { _user_id: userId });
      if (error) throw error;
      await loadScore();
      toast({ title: "✅ Рейтинг пересчитан" });
    } catch (err: any) {
      toast({ title: "Ошибка расчёта", description: err.message, variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => { loadScore(); }, [userId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (!score) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 text-center space-y-3">
        <Shield className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Рейтинг ещё не рассчитан</p>
        <Button size="sm" variant="outline" onClick={recalculate} disabled={recalculating}>
          {recalculating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Рассчитать
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[score.status] || STATUS_LABELS.insufficient_data;

  // Profile factors list for client view
  const profileFactors = [
    { label: "Имя и фамилия", done: score.has_full_name, icon: User, hint: "Заполните ФИО в настройках" },
    { label: "Фото профиля", done: score.has_photo, icon: User, hint: "Загрузите фото в настройках" },
    { label: "О себе (био)", done: score.has_bio, icon: PenLine, hint: "Добавьте описание в настройках" },
    { label: "Подтверждение email", done: score.email_verified, icon: Mail, hint: "Подтвердите email-адрес" },
    { label: "Телефон подтверждён", done: score.phone_verified, icon: Phone, hint: "Подтвердите номер телефона по SMS" },
    { label: "Telegram привязан", done: score.has_telegram, icon: MessageCircle, hint: "Укажите Telegram в профиле мастера" },
    { label: "KYC верификация", done: score.kyc_verified, icon: FileCheck, hint: "Пройдите верификацию личности" },
  ];

  const completedFactors = profileFactors.filter(f => f.done).length;
  const totalFactors = profileFactors.length;

  // === CLIENT VIEW ===
  if (viewMode === "client") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Ваша статистика
          </h3>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Статистика отражает вашу активность на платформе. Активируется после 20 визитов или 3 месяцев.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {score.status === "insufficient_data" && (
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <p className="text-sm text-muted-foreground">📊 Мало данных — статистика станет доступна после 20 завершённых визитов или 3 месяцев на платформе</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBox label="Завершённых визитов" value={score.completed_visits.toString()} />
          <StatBox label="Неявки" value={pct(score.no_show_count, score.completed_visits)} warn={score.no_show_count > 0} />
          <StatBox label="Отмены" value={pct(score.total_cancellations, score.completed_visits + score.total_cancellations)} warn={score.total_cancellations > 3} />
          <StatBox label="VIP оценки" value={pct(score.vip_by_count, score.completed_visits)} good />
          <StatBox label="В ЧС" value={score.blacklist_by_count.toString()} warn={score.blacklist_by_count > 0} />
          <StatBox label="Споры" value={pct(score.disputes_total, score.completed_visits)} warn={score.disputes_total > 0} />
        </div>

        {/* Profile completion factors */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Факторы, влияющие на рейтинг</p>
            <span className="text-xs text-muted-foreground">{completedFactors}/{totalFactors}</span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedFactors / totalFactors) * 100}%` }}
            />
          </div>

          <div className="space-y-2">
            {profileFactors.map((factor) => (
              <div key={factor.label} className="flex items-center gap-3 text-sm">
                <div className={`shrink-0 ${factor.done ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {factor.done 
                    ? <CheckCircle2 className="w-4 h-4" /> 
                    : <XCircle className="w-4 h-4" />
                  }
                </div>
                <span className={factor.done ? 'text-foreground' : 'text-muted-foreground'}>
                  {factor.label}
                </span>
                {!factor.done && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">{factor.hint}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>

          {/* Additional behavioral factors */}
          <div className="pt-2 border-t border-border space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Поведенческие факторы</p>
            <FactorHint label="Завершённые визиты" positive hint="Чем больше визитов — тем выше рейтинг" />
            <FactorHint label="Неявки и поздние отмены" positive={false} hint="Снижают рейтинг" />
            <FactorHint label="VIP-оценки от мастеров" positive hint="Повышают репутацию" />
            <FactorHint label="Попадания в ЧС" positive={false} hint="Значительно снижают рейтинг" />
            <FactorHint label="Проигранные споры" positive={false} hint="Снижают репутацию" />
            <FactorHint label="Приглашённые пользователи" positive hint="Бонус за реферальную программу" />
            {score.referral_count > 0 && (
              <div className="flex items-center gap-2 text-xs text-primary pl-6">
                <Users className="w-3.5 h-3.5" /> Приглашено: {score.referral_count}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === MASTER VIEW ===
  const activityBlock = blockLabel(score.activity_score, 15);
  const riskBlock = blockLabel(score.risk_score, 0, true);
  const repBlock = score.reputation_score >= 10
    ? { text: "Лояльность", color: "text-primary" }
    : score.reputation_score <= -10
      ? { text: "Конфликтность", color: "text-destructive" }
      : { text: "Стабильность", color: "text-foreground" };
  
  const profileStatus = score.kyc_verified 
    ? "KYC подтверждён" 
    : (score.has_full_name && score.has_photo ? "Частично" : "Нет");
  const profileColor = score.kyc_verified 
    ? "text-primary" 
    : (score.has_full_name && score.has_photo ? "text-accent" : "text-muted-foreground");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Рейтинг клиента
          <Tooltip>
            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Баллы начисляются по внутренним алгоритмам и не являются оценкой личности. Учитываются только завершённые визиты и подтверждённые действия.
            </TooltipContent>
          </Tooltip>
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          <Button size="sm" variant="ghost" onClick={recalculate} disabled={recalculating} className="h-7 px-2">
            {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {score.status === "insufficient_data" ? (
        <div className="p-4 rounded-lg bg-secondary border border-border text-center">
          <p className="text-sm text-muted-foreground">📊 Мало данных</p>
          <p className="text-xs text-muted-foreground mt-1">{score.completed_visits}/20 визитов или {score.account_age_days}/90 дней</p>
        </div>
      ) : (
        <>
          {/* Score circle */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${scoreBg(score.total_score)}`}>
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                  className={scoreColor(score.total_score)}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${(score.total_score / 100) * 175.9} 175.9`}
                />
              </svg>
              <span className={`absolute text-lg font-bold ${scoreColor(score.total_score)}`}>{Math.round(score.total_score)}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Общий рейтинг</p>
              <p className="text-xs text-muted-foreground mt-0.5">{score.completed_visits} визитов, {score.account_age_days} дней на платформе</p>
            </div>
          </div>

          {/* Block breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <BlockCard icon={score.kyc_verified ? BadgeCheck : User} label="Профиль" status={profileStatus}
              statusColor={profileColor}
              score={score.profile_score} max={20} />
            <BlockCard icon={Activity} label="Активность" status={activityBlock.text} statusColor={activityBlock.color}
              score={score.activity_score} max={15} />
            <BlockCard icon={AlertTriangle} label="Риски" status={riskBlock.text} statusColor={riskBlock.color}
              score={score.risk_score} max={0} isRisk />
            <BlockCard icon={Heart} label="Репутация" status={repBlock.text} statusColor={repBlock.color}
              score={score.reputation_score} max={40} />
          </div>

          {/* Detailed metrics */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Детальные показатели</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <MetricRow label="Неявки" value={`${score.no_show_count} (${pct(score.no_show_count, score.completed_visits)})`} warn={score.no_show_count > 0} />
              <MetricRow label="Отмены <1ч" value={`${score.cancel_under_1h} (${pct(score.cancel_under_1h, score.completed_visits)})`} warn={score.cancel_under_1h > 0} />
              <MetricRow label="Отмены <3ч" value={`${score.cancel_under_3h}`} />
              <MetricRow label="Уник. контрагентов" value={score.unique_partners.toString()} />
              <MetricRow label="Концентрация топ" value={`${Math.round(score.top_partner_pct)}%`} warn={score.top_partner_pct >= 70} />
              <MetricRow label="Споры (выигр/проигр)" value={`${score.disputes_won}/${score.disputes_lost}`} warn={score.disputes_lost > 0} />
              <MetricRow label="В ЧС у мастеров" value={score.blacklist_by_count.toString()} warn={score.blacklist_by_count > 0} />
              <MetricRow label="VIP оценки" value={score.vip_by_count.toString()} good={score.vip_by_count > 0} />
            </div>
          </div>

          {/* Profile factors for master view too */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Профиль клиента</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <MetricRow label="ФИО" value={score.has_full_name ? "✓" : "✗"} good={score.has_full_name} warn={!score.has_full_name} />
              <MetricRow label="Фото" value={score.has_photo ? "✓" : "✗"} good={score.has_photo} warn={!score.has_photo} />
              <MetricRow label="Email" value={score.email_verified ? "✓" : "✗"} good={score.email_verified} warn={!score.email_verified} />
              <MetricRow label="Телефон" value={score.phone_verified ? "✓" : "✗"} good={score.phone_verified} warn={!score.phone_verified} />
              <MetricRow label="KYC" value={score.kyc_verified ? "✓" : "✗"} good={score.kyc_verified} warn={!score.kyc_verified} />
              <MetricRow label="Telegram" value={score.has_telegram ? "✓" : "✗"} good={score.has_telegram} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FactorHint({ label, positive, hint }: { label: string; positive: boolean; hint: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`shrink-0 ${positive ? 'text-primary' : 'text-destructive'}`}>
        {positive ? '▲' : '▼'}
      </span>
      <span className="text-muted-foreground">{label}</span>
      <Tooltip>
        <TooltipTrigger>
          <Info className="w-3 h-3 text-muted-foreground/40" />
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{hint}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function StatBox({ label, value, warn, good }: { label: string; value: string; warn?: boolean; good?: boolean }) {
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <p className={`text-lg font-bold ${warn ? "text-destructive" : good ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function BlockCard({ icon: Icon, label, status, statusColor, score, max, isRisk }: {
  icon: any; label: string; status: string; statusColor: string; score: number; max: number; isRisk?: boolean;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${statusColor}`}>{status}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {isRisk ? `${score}` : `+${score}/${max}`}
      </p>
    </div>
  );
}

function MetricRow({ label, value, warn, good }: { label: string; value: string; warn?: boolean; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${warn ? "text-destructive" : good ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
