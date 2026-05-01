import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Activity,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  QrCode,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ru } from 'date-fns/locale';

type EarningsPeriod = 'week' | 'month' | 'year';

type ReferralDashboardResponse = {
  referralCode: string | null;
  summary: {
    totalReferrals?: number;
    paidReferrals?: number;
    trialReferrals?: number;
    inactiveReferrals?: number;
    totalEarnings?: number;
    referralBalance?: number;
  };
  referrals: Array<{
    relationshipId: string;
    referredUserId: string;
    displayName: string;
    skillspotId: string | null;
    email: string | null;
    invitedAt: string;
    lastSignInAt: string | null;
    targetType: 'client' | 'master' | 'business' | 'network';
    targetName: string;
    subscriptionStatus: string;
    lastPaymentDate: string | null;
    engagementStatus: 'paid' | 'trial' | 'managed' | 'inactive' | 'registered';
    totalCommission: number;
    paidCycles: number;
    lastCommissionAt: string | null;
  }>;
  commissions: Array<{
    id: string;
    referredUserId: string;
    referredName: string;
    amount: number;
    baseAmount: number;
    rate: number;
    sourceEntityType: 'master' | 'business' | 'network';
    status: string;
    createdAt: string;
    description: string | null;
  }>;
  series: Array<{
    date: string;
    amount: number;
  }>;
};

const statusMeta: Record<ReferralDashboardResponse['referrals'][number]['engagementStatus'], { label: string; className: string }> = {
  paid: { label: 'На платной подписке', className: 'bg-primary text-primary-foreground' },
  trial: { label: 'На триале', className: 'bg-blue-500 text-white' },
  managed: { label: 'В составе бизнеса', className: 'bg-purple-500 text-white' },
  inactive: { label: 'Давно не активен', className: 'bg-muted text-muted-foreground' },
  registered: { label: 'Зарегистрирован', className: 'bg-amber-500 text-white' },
};

const entityMeta: Record<ReferralDashboardResponse['referrals'][number]['targetType'], string> = {
  client: 'Клиент',
  master: 'Мастер',
  business: 'Организация',
  network: 'Сеть',
};

const periodLabel: Record<EarningsPeriod, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
};

const formatRelative = (value: string | null) => {
  if (!value) return 'Пока нет активности';
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: ru });
};

const ClientReferral = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<EarningsPeriod>('month');
  const [loading, setLoading] = useState(true);
  const [creatingCode, setCreatingCode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [dashboard, setDashboard] = useState<ReferralDashboardResponse>({
    referralCode: null,
    summary: {},
    referrals: [],
    commissions: [],
    series: [],
  });

  const baseUrl = window.location.origin;
  const referralLink = dashboard.referralCode ? `${baseUrl}/auth?ref=${dashboard.referralCode}` : '';
  const qrUrl = dashboard.referralCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`
    : '';

  const sortedReferrals = useMemo(
    () =>
      [...dashboard.referrals].sort((a, b) => {
        const order = { paid: 0, trial: 1, managed: 2, registered: 3, inactive: 4 } as const;
        return order[a.engagementStatus] - order[b.engagementStatus] || new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
      }),
    [dashboard.referrals]
  );

  const loadDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_my_referral_dashboard', { _period: period });
      if (error) throw error;

      setDashboard({
        referralCode: data?.referralCode ?? null,
        summary: data?.summary ?? {},
        referrals: data?.referrals ?? [],
        commissions: data?.commissions ?? [],
        series: data?.series ?? [],
      });
    } catch (err: any) {
      toast({
        title: 'Не удалось загрузить рефералов',
        description: err.message || 'Попробуйте обновить страницу',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user, period]);

  const handleCreateCode = async () => {
    if (!user) return;
    setCreatingCode(true);
    try {
      const code = `REF-${profile?.skillspot_id || 'USER'}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({ user_id: user.id, code, is_active: true })
        .select('code')
        .single();
      if (error) throw error;
      toast({ title: 'Реферальный код создан' });
      setDashboard((prev) => ({ ...prev, referralCode: data.code }));
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingCode(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} скопирован` });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Партнёрская программа
          </CardTitle>
          <CardDescription>
            Приглашайте мастеров и организации, помогайте им запускаться на платформе и получайте регулярный процент от их подписок.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold">Как это работает</h4>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Создайте ссылку и поделитесь ей с будущим мастером или организацией.</li>
              <li>Реферал регистрируется по вашей ссылке и закрепляется за вами.</li>
              <li>Когда реферал начинает оплачивать подписку, вы получаете процент на реферальный баланс.</li>
              <li>В кабинете видно, кто зарегистрировался, кто на триале, кто уже на платной подписке, а кто давно не активен.</li>
              <li>Реферальный баланс можно использовать для переводов на основной клиентский баланс.</li>
            </ol>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border p-3 text-center">
              <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{dashboard.summary.totalReferrals || 0}</p>
              <p className="text-xs text-muted-foreground">Всего закреплено</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <UserCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{dashboard.summary.paidReferrals || 0}</p>
              <p className="text-xs text-muted-foreground">На платной подписке</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Activity className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{dashboard.summary.trialReferrals || 0}</p>
              <p className="text-xs text-muted-foreground">На триале</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Gift className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{Number(dashboard.summary.totalEarnings || 0).toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground">Всего начислено</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <Wallet className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{Number(dashboard.summary.referralBalance || 0).toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground">Доступно на балансе</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Динамика начислений</CardTitle>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as EarningsPeriod)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="h-6 px-2 text-xs">Неделя</TabsTrigger>
                <TabsTrigger value="month" className="h-6 px-2 text-xs">Месяц</TabsTrigger>
                <TabsTrigger value="year" className="h-6 px-2 text-xs">Год</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.series.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              За период «{periodLabel[period]}» начислений пока нет
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboard.series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <RechartsTooltip formatter={(value: number) => [`${Number(value).toLocaleString()} ₽`, 'Начислено']} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ваш реферальный код</CardTitle>
          <CardDescription>Одна ссылка для регистрации и закрепления реферала за вами.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dashboard.referralCode ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <code className="flex-1 font-mono text-lg font-bold">{dashboard.referralCode}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(dashboard.referralCode!, 'Код')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Ссылка для регистрации</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <code className="flex-1 truncate text-xs">{referralLink}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(referralLink, 'Ссылка')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={referralLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Button variant="outline" className="gap-2" onClick={() => setShowQr((prev) => !prev)}>
                  <QrCode className="h-4 w-4" />
                  {showQr ? 'Скрыть' : 'Показать'} QR-код
                </Button>
                {showQr && (
                  <div className="flex justify-center rounded-lg border bg-background p-4">
                    <img src={qrUrl} alt="QR-код реферальной ссылки" className="h-48 w-48" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-4 text-muted-foreground">У вас пока нет активного реферального кода</p>
              <Button onClick={handleCreateCode} disabled={creatingCode} className="gap-2">
                {creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Создать реферальный код
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">Рефералы</TabsTrigger>
          <TabsTrigger value="commissions">История начислений</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Список рефералов</CardTitle>
              <CardDescription>
                Видно, кто зарегистрировался, кто уже платит, а кто давно не активен и требует внимания.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedReferrals.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Пока нет закреплённых рефералов. Поделитесь ссылкой, чтобы начать партнёрскую историю.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedReferrals.map((referral) => (
                    <div key={referral.relationshipId} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{referral.displayName}</p>
                            <Badge variant="outline">{entityMeta[referral.targetType]}</Badge>
                            <Badge className={statusMeta[referral.engagementStatus].className}>
                              {statusMeta[referral.engagementStatus].label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {referral.skillspotId ? <span>ID: {referral.skillspotId}</span> : null}
                            {referral.skillspotId && referral.targetName ? <span> · </span> : null}
                            <span>{referral.targetName}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>Закреплён: {formatRelative(referral.invitedAt)}</span>
                            <span>Последний вход: {formatRelative(referral.lastSignInAt)}</span>
                            <span>
                              Последняя подписка:{' '}
                              {referral.lastPaymentDate ? formatRelative(referral.lastPaymentDate) : 'ещё не было'}
                            </span>
                          </div>
                        </div>

                        <div className="grid min-w-[220px] gap-2 rounded-lg bg-muted p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Начислено от реферала</span>
                            <span className="font-semibold">{Number(referral.totalCommission || 0).toLocaleString()} ₽</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Оплаченных циклов</span>
                            <span className="font-semibold">{referral.paidCycles || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Последнее начисление</span>
                            <span className="font-semibold">{formatRelative(referral.lastCommissionAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>История начислений</CardTitle>
              <CardDescription>
                Каждое начисление по подписке видно отдельно: кто оплатил, с какой базы считался процент и сколько пришло вам.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.commissions.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">Начислений пока нет</div>
              ) : (
                <div className="space-y-3">
                  {dashboard.commissions.map((commission) => (
                    <div key={commission.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{commission.referredName}</p>
                          <Badge variant="outline">
                            {commission.sourceEntityType === 'master'
                              ? 'Подписка мастера'
                              : commission.sourceEntityType === 'business'
                                ? 'Подписка организации'
                                : 'Подписка сети'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          База {Number(commission.baseAmount).toLocaleString()} ₽ · ставка {(Number(commission.rate) * 100).toFixed(0)}%
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatRelative(commission.createdAt)}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">+{Number(commission.amount).toLocaleString()} ₽</p>
                        <p className="text-xs text-muted-foreground">{commission.description || 'Реферальное начисление'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientReferral;
