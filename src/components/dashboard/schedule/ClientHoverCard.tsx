import { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Phone, AlertTriangle, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useClientInsights } from '@/hooks/useClientInsights';

interface Props {
  clientId: string | null | undefined;
  fallbackName?: string;
  children: React.ReactNode;
}

export default function ClientHoverCard({ clientId, fallbackName, children }: Props) {
  const [hovered, setHovered] = useState(false);
  const insights = useClientInsights(clientId, hovered);

  if (!clientId) {
    return <>{children}</>;
  }

  const name =
    [insights.profile?.first_name, insights.profile?.last_name].filter(Boolean).join(' ') ||
    fallbackName ||
    'Клиент';
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <HoverCard openDelay={300} closeDelay={120} onOpenChange={open => open && setHovered(true)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-[340px] p-0 overflow-hidden"
      >
        {insights.loading ? (
          <div className="p-4 text-sm text-muted-foreground">Загрузка…</div>
        ) : (
          <div className="text-xs">
            {/* Header */}
            <div className="flex items-start gap-3 p-3 border-b bg-muted/30">
              <Avatar className="h-11 w-11">
                {insights.profile?.avatar_url && <AvatarImage src={insights.profile.avatar_url} />}
                <AvatarFallback>{initials || '??'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate">{name}</p>
                  {insights.vip && (
                    <Badge variant="default" className="h-4 px-1.5 text-[10px] gap-0.5">
                      <Crown className="h-2.5 w-2.5" /> VIP
                    </Badge>
                  )}
                  {insights.completed >= 5 && !insights.vip && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      Постоянный
                    </Badge>
                  )}
                  {insights.totalBookings === 0 && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                      Новый
                    </Badge>
                  )}
                </div>
                {insights.profile?.skillspot_id && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ID: {insights.profile.skillspot_id}
                  </p>
                )}
                {insights.profile?.phone && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {insights.profile.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-px bg-border">
              <Stat label="Записей" value={String(insights.totalBookings)} />
              <Stat label="Завершено" value={String(insights.completed)} tone="positive" />
              <Stat
                label="No-show"
                value={String(insights.noShow)}
                tone={insights.noShow > 1 ? 'negative' : 'neutral'}
              />
              <Stat label="Отмен" value={String(insights.cancelled)} />
              <Stat label="LTV" value={`${insights.ltv.toLocaleString('ru')} ₽`} />
              <Stat label="Ср. чек" value={`${insights.averageCheck.toLocaleString('ru')} ₽`} />
            </div>

            {/* Behaviour */}
            <div className="p-3 space-y-1.5 border-t">
              {insights.lastVisit && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Последний визит: {format(insights.lastVisit, 'd MMM yyyy', { locale: ru })}</span>
                </div>
              )}
              {insights.noShow > 1 && (
                <div className="flex items-center gap-1.5 text-rose-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Часто не приходит — {insights.noShow} неявок</span>
                </div>
              )}
              {insights.favouriteServices.length > 0 && (
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="leading-snug">
                    Любимые: {insights.favouriteServices.map(s => `${s.name} (${s.count})`).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {insights.notes.length > 0 && (
              <div className="p-3 border-t bg-amber-50/60 dark:bg-amber-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                  <Sparkles className="h-3 w-3" /> Заметки
                </div>
                {insights.notes.map((n, i) => (
                  <p key={i} className="text-foreground/80 leading-snug line-clamp-2">
                    «{n}»
                  </p>
                ))}
              </div>
            )}

            {insights.totalBookings === 0 && insights.notes.length === 0 && (
              <div className="p-3 border-t text-muted-foreground text-center">
                Нет данных по клиенту
              </div>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const color =
    tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : 'text-foreground';
  return (
    <div className="bg-background p-2 text-center">
      <p className={`text-[13px] font-semibold leading-tight ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
