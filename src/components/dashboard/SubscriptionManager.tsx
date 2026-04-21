import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CreditCard, Calendar, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import TierComparison from './TierComparison';
import { SubscriptionTierKey } from '@/lib/tierSections';

interface SubscriptionManagerProps {
  entityType: 'master' | 'business' | 'network';
  subscriptionStatus: string;
  trialStartDate?: string | null;
  trialDays?: number;
  lastPaymentDate?: string | null;
  basePrice: number;
  /** If subscription is managed by parent (business in network, master in business) */
  parentManaged?: boolean;
  parentLabel?: string;
}

const periods = [
  { months: 1, label: '1 месяц', discount: 0 },
  { months: 3, label: '3 месяца', discount: 5 },
  { months: 6, label: '6 месяцев', discount: 10 },
  { months: 12, label: '1 год', discount: 20 },
];

const SubscriptionManager = ({
  entityType,
  subscriptionStatus,
  trialStartDate,
  trialDays = 14,
  lastPaymentDate,
  basePrice,
  parentManaged,
  parentLabel,
}: SubscriptionManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [paying, setPaying] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (user) {
      supabase.from('user_balances').select('main_balance').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setBalance(data?.main_balance || 0));
    }
  }, [user]);

  const getExpiryDate = (): Date | null => {
    if (subscriptionStatus === 'trial' && trialStartDate) {
      const start = new Date(trialStartDate);
      return addDays(start, trialDays);
    }
    if (subscriptionStatus === 'active' && lastPaymentDate) {
      return addMonths(new Date(lastPaymentDate), 1);
    }
    return null;
  };

  const expiryDate = getExpiryDate();
  const isExpired = expiryDate ? expiryDate < new Date() : subscriptionStatus !== 'active' && subscriptionStatus !== 'trial' && subscriptionStatus !== 'in_business';

  const getStatusLabel = () => {
    if (parentManaged) return parentLabel || 'Управляется бизнесом';
    switch (subscriptionStatus) {
      case 'trial': return 'Тестовый период';
      case 'active': return 'Активна';
      case 'in_business': return 'В составе бизнеса';
      case 'grace': return 'Льготный период';
      default: return 'Неактивна';
    }
  };

  const getStatusColor = () => {
    if (parentManaged) return 'bg-purple-500 text-white';
    switch (subscriptionStatus) {
      case 'trial': return 'bg-blue-500 text-white';
      case 'active': return 'bg-primary text-primary-foreground';
      case 'in_business': return 'bg-purple-500 text-white';
      default: return 'bg-destructive text-destructive-foreground';
    }
  };

  const selectedPeriodData = periods.find(p => p.months === selectedPeriod)!;
  const totalWithoutDiscount = basePrice * selectedPeriod;
  const discountAmount = Math.round(totalWithoutDiscount * selectedPeriodData.discount / 100);
  const totalPrice = totalWithoutDiscount - discountAmount;

  const handlePay = async () => {
    if (!user) return;
    if (balance < totalPrice) {
      toast({ title: 'Недостаточно средств', description: `На балансе ${balance} ₽, необходимо ${totalPrice} ₽`, variant: 'destructive' });
      return;
    }

    setPaying(true);
    try {
      // Deduct from balance
      const { error: balError } = await supabase.from('user_balances')
        .update({ main_balance: balance - totalPrice })
        .eq('user_id', user.id);
      if (balError) throw balError;

      // Record transaction
      await supabase.from('balance_transactions').insert({
        user_id: user.id,
        amount: -totalPrice,
        type: 'subscription_payment',
        description: `Оплата подписки ${entityType} на ${selectedPeriod} мес.`,
      });

      // Update subscription status
      const now = new Date().toISOString();
      if (entityType === 'master') {
        await supabase.from('master_profiles').update({
          subscription_status: 'active',
          last_payment_date: now,
        }).eq('user_id', user.id);
      } else if (entityType === 'business') {
        await supabase.from('business_locations').update({
          subscription_status: 'active',
          last_payment_date: now,
        }).eq('owner_id', user.id);
      } else if (entityType === 'network') {
        await supabase.from('networks').update({
          subscription_status: 'active',
          last_payment_date: now,
        }).eq('owner_id', user.id);
      }

      setBalance(balance - totalPrice);
      toast({ title: 'Подписка оплачена!', description: `Списано ${totalPrice} ₽ с баланса` });
      setShowPayDialog(false);
    } catch (err: any) {
      toast({ title: 'Ошибка оплаты', description: err.message, variant: 'destructive' });
    }
    setPaying(false);
  };

  const currentTier: SubscriptionTierKey = entityType;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Подписка</span>
            <Badge className={getStatusColor()}>{getStatusLabel()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expiryDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {isExpired ? 'Истекла' : 'Активна до'}: {format(expiryDate, 'd MMMM yyyy', { locale: ru })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Баланс: {balance.toLocaleString()} ₽</span>
          </div>
          {!parentManaged && (
            <Button className="w-full" onClick={() => setShowPayDialog(true)}>
              {isExpired ? 'Оплатить подписку' : 'Продлить подписку'}
            </Button>
          )}
        </CardContent>
      </Card>

      <TierComparison currentTier={currentTier} />

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Оплата подписки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {periods.map(p => (
                <button
                  key={p.months}
                  onClick={() => setSelectedPeriod(p.months)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedPeriod === p.months
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium text-sm">{p.label}</p>
                  {p.discount > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">-{p.discount}%</Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-2">
              {selectedPeriodData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Было</span>
                  <span className="line-through text-muted-foreground">{totalWithoutDiscount.toLocaleString()} ₽</span>
                </div>
              )}
              {selectedPeriodData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Скидка {selectedPeriodData.discount}%</span>
                  <span className="text-primary">-{discountAmount.toLocaleString()} ₽</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1 border-t">
                <span>Итого</span>
                <span>{totalPrice.toLocaleString()} ₽</span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              На балансе: {balance.toLocaleString()} ₽
              {balance < totalPrice && (
                <span className="text-destructive ml-2">Недостаточно средств</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Отмена</Button>
            <Button onClick={handlePay} disabled={paying || balance < totalPrice}>
              {paying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Оплатить с баланса
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionManager;
