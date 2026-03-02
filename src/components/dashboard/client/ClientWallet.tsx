import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, History, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ClientWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState({ main_balance: 0, referral_balance: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [balRes, txRes] = await Promise.all([
      supabase.from('user_balances').select('main_balance, referral_balance').eq('user_id', user!.id).maybeSingle(),
      supabase.from('balance_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (balRes.data) setBalance(balRes.data);
    setTransactions(txRes.data || []);
    setLoading(false);
  };

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      // Record transaction
      await supabase.from('balance_transactions').insert({
        user_id: user!.id, amount, type: 'deposit', description: 'Пополнение баланса с карты',
      });
      // Update balance
      await supabase.from('user_balances').update({
        main_balance: balance.main_balance + amount,
      }).eq('user_id', user!.id);
      toast({ title: 'Баланс пополнен', description: `+${amount} ₽` });
      setDepositOpen(false);
      setDepositAmount('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    if (amount > balance.main_balance) { toast({ title: 'Недостаточно средств', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      await supabase.from('balance_transactions').insert({
        user_id: user!.id, amount: -amount, type: 'withdrawal', description: 'Вывод на банковскую карту',
      });
      await supabase.from('user_balances').update({
        main_balance: balance.main_balance - amount,
      }).eq('user_id', user!.id);
      toast({ title: 'Заявка на вывод создана', description: `${amount} ₽ будут перечислены на карту` });
      setWithdrawOpen(false);
      setWithdrawAmount('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const handleTransferReferral = async () => {
    const amount = Number(transferAmount);
    if (!amount || amount <= 0) { toast({ title: 'Укажите сумму', variant: 'destructive' }); return; }
    if (amount > balance.referral_balance) { toast({ title: 'Недостаточно средств на реферальном балансе', variant: 'destructive' }); return; }
    setProcessing(true);
    try {
      await supabase.from('balance_transactions').insert({
        user_id: user!.id, amount, type: 'referral_transfer', description: 'Перевод с реферального баланса на основной',
      });
      await supabase.from('user_balances').update({
        main_balance: balance.main_balance + amount,
        referral_balance: balance.referral_balance - amount,
      }).eq('user_id', user!.id);
      toast({ title: 'Переведено на основной баланс', description: `${amount} ₽` });
      setTransferOpen(false);
      setTransferAmount('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const formatTxType = (type: string) => {
    const map: Record<string, string> = {
      deposit: 'Пополнение',
      withdrawal: 'Вывод на карту',
      payment: 'Оплата услуги',
      refund: 'Возврат',
      referral_transfer: 'С реферального баланса',
      referral_bonus: 'Реферальный бонус',
      subscription: 'Подписка',
      bonus: 'Бонус',
    };
    return map[type] || type;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Основной баланс</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-4">{Number(balance.main_balance).toLocaleString()} ₽</p>
            <div className="space-y-2">
              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2"><ArrowDownLeft className="h-4 w-4" /> Пополнить баланс</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Пополнение баланса</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Сумма пополнения (₽)</Label>
                      <Input type="text" inputMode="numeric" placeholder="1000" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d]/g, ''))} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map(v => (
                        <Button key={v} variant="outline" size="sm" onClick={() => setDepositAmount(String(v))}>{v} ₽</Button>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4 inline mr-1" /> Оплата банковской картой (интеграция с Т-Банк)
                    </div>
                    <Button className="w-full" onClick={handleDeposit} disabled={processing}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Пополнить {depositAmount ? `${depositAmount} ₽` : ''}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2"><ArrowUpRight className="h-4 w-4" /> Вывести на карту</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Вывод средств</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Доступно: {Number(balance.main_balance).toLocaleString()} ₽</p>
                    <div className="space-y-2">
                      <Label>Сумма вывода (₽)</Label>
                      <Input type="text" inputMode="numeric" placeholder="1000" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^\d]/g, ''))} />
                    </div>
                    <Button className="w-full" onClick={handleWithdraw} disabled={processing}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Вывести {withdrawAmount ? `${withdrawAmount} ₽` : ''}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Реферальный баланс</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-4">{Number(balance.referral_balance).toLocaleString()} ₽</p>
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <ArrowUpRight className="h-4 w-4" /> Перевести на основной
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Перевод на основной баланс</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Реферальный баланс: {Number(balance.referral_balance).toLocaleString()} ₽</p>
                  <div className="space-y-2">
                    <Label>Сумма перевода (₽)</Label>
                    <Input type="text" inputMode="numeric" placeholder="500" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value.replace(/[^\d]/g, ''))} />
                  </div>
                  <Button className="w-full" onClick={handleTransferReferral} disabled={processing}>
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Перевести {transferAmount ? `${transferAmount} ₽` : ''}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> История операций</CardTitle>
          <CardDescription>Последние 50 операций</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Операций пока нет</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tx.amount >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                      {tx.amount >= 0
                        ? <ArrowDownLeft className="h-4 w-4 text-primary" />
                        : <ArrowUpRight className="h-4 w-4 text-destructive" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatTxType(tx.type)}</p>
                      {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} ₽
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientWallet;
