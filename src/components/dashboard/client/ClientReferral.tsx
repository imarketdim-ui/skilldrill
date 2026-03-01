import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Users, UserCheck, Wallet, Loader2, QrCode, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, subMonths, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { ru } from 'date-fns/locale';

const ClientReferral = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);
  const [stats, setStats] = useState({ totalEarnings: 0, totalReferrals: 0, activeReferrals: 0, referralBalance: 0 });
  const [showQr, setShowQr] = useState(false);
  const [earningsPeriod, setEarningsPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [earningsData, setEarningsData] = useState<any[]>([]);

  const baseUrl = window.location.origin;

  useEffect(() => { if (user) loadData(); }, [user]);
  useEffect(() => { if (user) loadEarningsChart(); }, [user, earningsPeriod]);

  const loadData = async () => {
    const [codeRes, earningsRes, balRes] = await Promise.all([
      supabase.from('referral_codes').select('code').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
      supabase.from('referral_earnings').select('amount, referred_id').eq('referrer_id', user!.id),
      supabase.from('user_balances').select('referral_balance').eq('user_id', user!.id).maybeSingle(),
    ]);
    if (codeRes.data) setReferralCode(codeRes.data.code);
    const earnings = earningsRes.data || [];
    const referredIds = [...new Set(earnings.map(e => e.referred_id))];
    
    // Also count referrals from profiles.referred_by matching any of user's referral codes
    let profileReferralCount = 0;
    if (codeRes.data?.code) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', codeRes.data.code);
      profileReferralCount = count || 0;
    }

    let activeCount = 0;
    const allReferredIds = [...referredIds];
    if (profileReferralCount > 0 && codeRes.data?.code) {
      const { data: refProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', codeRes.data.code);
      (refProfiles || []).forEach(p => { if (!allReferredIds.includes(p.id)) allReferredIds.push(p.id); });
    }

    if (allReferredIds.length > 0) {
      const { data: masters } = await supabase
        .from('master_profiles')
        .select('user_id, subscription_status')
        .in('user_id', allReferredIds)
        .in('subscription_status', ['active', 'trial', 'in_business']);
      activeCount = masters?.length || 0;
    }

    const totalReferrals = Math.max(referredIds.length, profileReferralCount);

    setStats({
      totalEarnings: earnings.reduce((s: number, e: any) => s + Number(e.amount), 0),
      totalReferrals,
      activeReferrals: activeCount,
      referralBalance: balRes.data?.referral_balance || 0,
    });
  };

  const loadEarningsChart = async () => {
    if (!user) return;
    let startDate: Date;
    if (earningsPeriod === 'week') startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    else if (earningsPeriod === 'month') startDate = startOfMonth(new Date());
    else startDate = startOfYear(new Date());

    const { data } = await supabase
      .from('referral_earnings')
      .select('amount, created_at')
      .eq('referrer_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    if (!data || data.length === 0) {
      setEarningsData([]);
      return;
    }

    // Group by date
    const grouped: Record<string, number> = {};
    data.forEach(e => {
      const key = format(new Date(e.created_at), earningsPeriod === 'year' ? 'MMM' : 'd MMM', { locale: ru });
      grouped[key] = (grouped[key] || 0) + Number(e.amount);
    });
    setEarningsData(Object.entries(grouped).map(([date, amount]) => ({ date, amount })));
  };

  const handleCreateCode = async () => {
    if (!user) return;
    setCreatingCode(true);
    try {
      const code = 'REF-' + (profile?.skillspot_id || '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data, error } = await supabase.from('referral_codes').insert({ user_id: user.id, code, is_active: true }).select('code').single();
      if (error) throw error;
      setReferralCode(data.code);
      toast({ title: 'Реферальный код создан' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setCreatingCode(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} скопирован` });
  };

  const referralLink = referralCode ? `${baseUrl}/auth?ref=${referralCode}` : '';
  const qrUrl = referralCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`
    : '';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Реферальная программа</CardTitle>
          <CardDescription>Приглашайте друзей и получайте бонусы</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <h4 className="font-semibold">Как это работает?</h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Создайте свой уникальный реферальный код или ссылку</li>
              <li>Поделитесь кодом или ссылкой с друзьями</li>
              <li>Друг вводит ваш код при регистрации или переходит по ссылке</li>
              <li>Когда друг оплачивает первую услугу — вы получаете <span className="font-medium text-primary">бонус на реферальный баланс</span></li>
              <li>Реферальный баланс можно перевести на основной для оплаты услуг</li>
            </ol>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3 rounded-lg border text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Приглашённых</p>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <UserCheck className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.activeReferrals}</p>
              <p className="text-xs text-muted-foreground">Активных</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">С действующей подпиской</p>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.totalEarnings.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground">Заработано</p>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <Wallet className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.referralBalance.toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground">На балансе</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Заработано</CardTitle>
            <Tabs value={earningsPeriod} onValueChange={(v) => setEarningsPeriod(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-2 h-6">Неделя</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2 h-6">Месяц</TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-2 h-6">Год</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {earningsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Нет данных за выбранный период</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <RechartsTooltip formatter={(v: number) => [`${v.toLocaleString()} ₽`, 'Сумма']} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ваш реферальный код</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {referralCode ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <code className="text-lg font-mono font-bold flex-1">{referralCode}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(referralCode, 'Код')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Ссылка для регистрации</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <code className="text-xs flex-1 truncate">{referralLink}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(referralLink, 'Ссылка')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={referralLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="gap-2" onClick={() => setShowQr(!showQr)}>
                  <QrCode className="h-4 w-4" /> {showQr ? 'Скрыть' : 'Показать'} QR-код
                </Button>
                {showQr && (
                  <div className="flex justify-center p-4 bg-background rounded-lg border">
                    <img src={qrUrl} alt="QR код реферальной ссылки" className="w-48 h-48" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">У вас ещё нет реферального кода</p>
              <Button onClick={handleCreateCode} disabled={creatingCode} className="gap-2">
                {creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Создать реферальный код
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientReferral;
