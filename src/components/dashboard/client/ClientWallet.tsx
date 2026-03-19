import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Loader2, Star, Gift, ArrowLeftRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import CabinetTransferDialog from './CabinetTransferDialog';

// ──── Helpers ────
const TX_TYPE_MAP: Record<string, { label: string; sign: '+' | '-' | '' }> = {
  deposit:              { label: 'Пополнение',               sign: '+' },
  withdrawal:           { label: 'Вывод на карту',           sign: '-' },
  payment:              { label: 'Оплата услуги',            sign: '-' },
  subscription_payment: { label: 'Оплата подписки',          sign: '-' },
  refund:               { label: 'Возврат',                  sign: '+' },
  referral_transfer:    { label: 'Перевод с реф. баланса',   sign: '+' },
  referral_bonus:       { label: 'Реферальный бонус',        sign: '+' },
  subscription:         { label: 'Подписка',                 sign: '-' },
  bonus:                { label: 'Бонус',                    sign: '+' },
  transfer_in:          { label: 'Входящий перевод',         sign: '+' },
  transfer_out:         { label: 'Исходящий перевод',        sign: '-' },
  cabinet_transfer_in:  { label: 'Перевод между кабинетами', sign: '+' },
  cabinet_transfer_out: { label: 'Перевод между кабинетами', sign: '-' },
};

const BONUS_TYPE_MAP: Record<string, string> = {
  earn:         'Начисление',
  spend:        'Списание',
  expire:       'Истечение срока',
  admin_adjust: 'Корректировка администратором',
};

const BONUS_SOURCE_MAP: Record<string, string> = {
  booking_complete: 'За завершённую запись',
  referral:         'Реферальный бонус',
  promo:            'Промокод',
  review:           'За отзыв',
  purchase:         'Оплата бонусами',
  admin:            'Начисление администратором',
};

const ClientWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cabinet balances (isolated per cabinet)
  const [cabinetBalance, setCabinetBalance] = useState({ main_balance: 0, bonus_balance: 0 });
  const [referralBalance, setReferralBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bonusPoints, setBonusPoints] = useState({ balance: 0, total_earned: 0, total_spent: 0 });
  const [bonusTransactions, setBonusTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [cabinetTransferOpen, setCabinetTransferOpen] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [cabBalRes, txRes, bpRes, btRes, refBalRes] = await Promise.all([
      // Client cabinet balance (isolated)
      supabase.from('cabinet_balances')
        .select('main_balance, bonus_balance')
        .eq('user_id', user!.id)
        .eq('cabinet_type', 'client')
        .is('cabinet_id', null)
        .maybeSingle(),
      // Transactions scoped to client cabinet
      supabase.from('balance_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('cabinet_type', 'client')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('bonus_points').select('balance, total_earned, total_spent').eq('user_id', user!.id).maybeSingle(),
      supabase.from('bonus_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('user_balances').select('referral_balance').eq('user_id', user!.id).maybeSingle(),
    ]);
    if (cabBalRes.data) setCabinetBalance(cabBalRes.data);
    setTransactions(txRes.data || []);
    if (bpRes.data) setBonusPoints(bpRes.data);
    setBonusTransactions(btRes.data || []);
    if (refBalRes.data) setReferralBalance(refBalRes.data.referral_balance || 0);
    setLoading(false);
  };

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      // Insert into cabinet_balances
      const { data: existing } = await supabase.from('cabinet_balances')
        .select('id, main_balance')
        .eq('user_id', user!.id).eq('cabinet_type', 'client').is('cabinet_id', null).maybeSingle();

      if (existing) {
        await supabase.from('cabinet_balances')
          .update({ main_balance: existing.main_balance + amount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('cabinet_balances').insert({ user_id: user!.id, cabinet_type: 'client', main_balance: amount });
      }
      await supabase.from('balance_transactions').insert({
        user_id: user!.id, amount, type: 'deposit', description: 'Пополнение клиентского баланса', cabinet_type: 'client'
      });
      toast({ title: 'Баланс пополнен', description: `+${amount} ₽` });
      setDepositOpen(false); setDepositAmount(''); loadData();
    } catch (err: any) { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); }
    finally { setProcessing(false); }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    if (amount > cabinetBalance.main_balance) { toast({ title: 'Недостаточно средств', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      const { data: existing } = await supabase.from('cabinet_balances')
        .select('id, main_balance').eq('user_id', user!.id).eq('cabinet_type', 'client').is('cabinet_id', null).maybeSingle();
      if (existing) {
        await supabase.from('cabinet_balances')
          .update({ main_balance: existing.main_balance - amount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
      await supabase.from('balance_transactions').insert({
        user_id: user!.id, amount: -amount, type: 'withdrawal', description: 'Вывод на карту', cabinet_type: 'client'
      });
      toast({ title: 'Заявка на вывод создана', description: `${amount} ₽ будут перечислены на карту` });
      setWithdrawOpen(false); setWithdrawAmount(''); loadData();
    } catch (err: any) { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); }
    finally { setProcessing(false); }
  };

  const handleTransferReferral = async () => {
    const amount = Number(transferAmount);
    if (!amount || amount <= 0) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    if (amount > referralBalance) { toast({ title: 'Недостаточно средств на реферальном балансе', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      await supabase.from('user_balances').update({
        referral_balance: referralBalance - amount,
      }).eq('user_id', user!.id);
      const { data: existing } = await supabase.from('cabinet_balances')
        .select('id, main_balance').eq('user_id', user!.id).eq('cabinet_type', 'client').is('cabinet_id', null).maybeSingle();
      if (existing) {
        await supabase.from('cabinet_balances')
          .update({ main_balance: existing.main_balance + amount, updated_at: new Date().toISOString() }).eq('id', existing.id);
      }
      await supabase.from('balance_transactions').insert({
        user_id: user!.id, amount, type: 'referral_transfer', description: 'Перевод с реферального баланса', cabinet_type: 'client'
      });
      toast({ title: 'Переведено на клиентский баланс', description: `${amount} ₽` });
      setTransferOpen(false); setTransferAmount(''); loadData();
    } catch (err: any) { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Cabinet isolation info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-primary font-medium mb-1">🔒 Клиентский баланс</p>
          <p className="text-xs text-muted-foreground">
            Это баланс вашего клиентского кабинета — он отделён от баланса мастера и организации.
            Переводы между кабинетами доступны через кнопку «Перевести между кабинетами».
          </p>
        </CardContent>
      </Card>

      {/* Balance cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Main cabinet balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> Клиентский баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-3">{Number(cabinetBalance.main_balance).toLocaleString()} ₽</p>
            <div className="flex gap-2 flex-wrap">
              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><ArrowDownLeft className="h-3.5 w-3.5" /> Пополнить</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Пополнение баланса</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>Сумма (₽)</Label>
                      <Input type="text" inputMode="numeric" placeholder="1000" value={depositAmount} onChange={e => setDepositAmount(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map(v => (
                        <Button key={v} variant="outline" size="sm" onClick={() => setDepositAmount(String(v))}>{v} ₽</Button>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4 inline mr-1" /> Оплата банковской картой (скоро)
                    </div>
                    <Button className="w-full" onClick={handleDeposit} disabled={processing}>
                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Пополнить {depositAmount ? `${depositAmount} ₽` : ''}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> Вывести</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Вывод средств</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Доступно: {Number(cabinetBalance.main_balance).toLocaleString()} ₽</p>
                    <div className="space-y-2"><Label>Сумма (₽)</Label>
                      <Input type="text" inputMode="numeric" placeholder="1000" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <Button className="w-full" onClick={handleWithdraw} disabled={processing}>
                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Вывести {withdrawAmount ? `${withdrawAmount} ₽` : ''}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Referral balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Реферальный баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-3">{Number(referralBalance).toLocaleString()} ₽</p>
            <div className="flex gap-2 flex-wrap">
              <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" /> На клиентский
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Перевод на клиентский баланс</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Реф. баланс: {Number(referralBalance).toLocaleString()} ₽</p>
                    <div className="space-y-2"><Label>Сумма (₽)</Label>
                      <Input type="text" inputMode="numeric" placeholder="500" value={transferAmount} onChange={e => setTransferAmount(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    <Button className="w-full" onClick={handleTransferReferral} disabled={processing}>
                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Перевести
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => navigate('/referral')}>
                Реф. программа →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bonus points */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 text-amber-500" /> Бонусные баллы</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-1">{bonusPoints.balance} <span className="text-sm font-normal text-muted-foreground">баллов</span></p>
            <div className="flex gap-3 text-xs text-muted-foreground mb-3">
              <span className="text-primary">+{bonusPoints.total_earned} начислено</span>
              <span>−{bonusPoints.total_spent} потрачено</span>
            </div>
            <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => navigate('/referral')}>
              <Gift className="h-3.5 w-3.5" /> Реферальная программа
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inter-cabinet transfer */}
      <Card className="border-dashed cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setCabinetTransferOpen(true)}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Перевести между кабинетами</p>
              <p className="text-sm text-muted-foreground">Перевод между клиентским, мастерским и бизнес-балансом</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to earn bonus */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 fill-current" /> Как начисляются бонусы
          </p>
          <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
            <span>✅ +10 баллов — за завершённую запись</span>
            <span>✅ +5 баллов — за отзыв с оценкой</span>
            <span>✅ +50 баллов — реферальный бонус</span>
            <span>🎁 1 балл = 1 ₽ скидки (если мастер принимает)</span>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Tabs defaultValue="money">
        <TabsList className="w-full">
          <TabsTrigger value="money" className="flex-1">История рублей</TabsTrigger>
          <TabsTrigger value="bonus" className="flex-1">История баллов</TabsTrigger>
        </TabsList>

        <TabsContent value="money">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Операции</CardTitle>
              <CardDescription>Последние 50 операций клиентского кабинета</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Операций пока нет</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => {
                    const info = TX_TYPE_MAP[tx.type] || { label: tx.type, sign: '' as const };
                    const isPos = tx.amount >= 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isPos ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                            {isPos ? <ArrowDownLeft className="h-4 w-4 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-destructive" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{info.label}</p>
                            {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isPos ? 'text-primary' : 'text-destructive'}`}>
                            {isPos ? '+' : ''}{Number(tx.amount).toLocaleString()} ₽
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonus">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 text-amber-500" /> Баллы</CardTitle>
              <CardDescription>Последние 30 операций с баллами</CardDescription>
            </CardHeader>
            <CardContent>
              {bonusTransactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Операций пока нет</p>
              ) : (
                <div className="space-y-2">
                  {bonusTransactions.map(tx => {
                    const isPos = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{BONUS_TYPE_MAP[tx.type] || tx.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {BONUS_SOURCE_MAP[tx.source] || tx.source}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={isPos ? 'default' : 'secondary'} className="text-sm">
                            {isPos ? '+' : ''}{tx.amount} ⭐
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(tx.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CabinetTransferDialog
        open={cabinetTransferOpen}
        onClose={() => setCabinetTransferOpen(false)}
        currentCabinet="client"
        onSuccess={loadData}
      />
    </div>
  );
};

export default ClientWallet;
