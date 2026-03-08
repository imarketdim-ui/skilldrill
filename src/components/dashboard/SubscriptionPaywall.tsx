import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';

interface SubscriptionPaywallProps {
  entityType: 'master' | 'business' | 'network';
  entityId: string;
  entityName: string;
  onPaid: () => void;
}

const periods = [
  { months: 1, label: '1 месяц', discount: 0 },
  { months: 3, label: '3 месяца', discount: 5 },
  { months: 6, label: '6 месяцев', discount: 10 },
  { months: 12, label: '1 год', discount: 20 },
];

const SubscriptionPaywall = ({ entityType, entityId, entityName, onPaid }: SubscriptionPaywallProps) => {
  const { user, setActiveRole } = useAuth();
  const { toast } = useToast();
  const pricing = usePlatformPricing();
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [paying, setPaying] = useState(false);
  const [balance, setBalance] = useState(0);

  const basePrice = entityType === 'master' ? pricing.master : entityType === 'business' ? pricing.business : pricing.network;

  useEffect(() => {
    if (user) {
      supabase.from('user_balances').select('main_balance').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setBalance(data?.main_balance || 0));
    }
  }, [user]);

  const selectedPeriodData = periods.find(p => p.months === selectedPeriod)!;
  const totalWithoutDiscount = basePrice * selectedPeriod;
  const discountAmount = Math.round(totalWithoutDiscount * selectedPeriodData.discount / 100);
  const totalPrice = totalWithoutDiscount - discountAmount;
  const canPayFromBalance = balance >= totalPrice;

  const handlePayFromBalance = async () => {
    if (!user || !canPayFromBalance) return;
    setPaying(true);
    try {
      const { error: balError } = await supabase.from('user_balances')
        .update({ main_balance: balance - totalPrice })
        .eq('user_id', user.id);
      if (balError) throw balError;

      await supabase.from('balance_transactions').insert({
        user_id: user.id,
        amount: -totalPrice,
        type: 'subscription_payment',
        description: `Оплата подписки «${entityName}» на ${selectedPeriod} мес.`,
      });

      const now = new Date().toISOString();
      if (entityType === 'master') {
        await supabase.from('master_profiles').update({
          subscription_status: 'active',
          last_payment_date: now,
          suspended_at: null,
          grace_start_date: null,
        }).eq('id', entityId);
      } else if (entityType === 'business') {
        await supabase.from('business_locations').update({
          subscription_status: 'active',
          last_payment_date: now,
          suspended_at: null,
          grace_start_date: null,
        }).eq('id', entityId);
      } else {
        await supabase.from('networks').update({
          subscription_status: 'active',
          last_payment_date: now,
          suspended_at: null,
          grace_start_date: null,
        }).eq('id', entityId);
      }

      toast({ title: 'Подписка оплачена!', description: `Списано ${totalPrice} ₽ с баланса` });
      onPaid();
    } catch (err: any) {
      toast({ title: 'Ошибка оплаты', description: err.message, variant: 'destructive' });
    }
    setPaying(false);
  };

  const handlePayByCard = () => {
    toast({
      title: 'Оплата картой',
      description: 'Оплата через Т-Банк скоро будет доступна. Пока используйте оплату с баланса.',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-6 px-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Подписка истекла</h2>
            <p className="text-muted-foreground">
              Для доступа к кабинету <span className="font-medium text-foreground">«{entityName}»</span> необходимо оплатить подписку
            </p>
          </div>

          {/* Period selection */}
          <div className="grid grid-cols-2 gap-2">
            {periods.map(p => (
              <button
                key={p.months}
                onClick={() => setSelectedPeriod(p.months)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPeriod === p.months
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(basePrice * p.months * (1 - p.discount / 100)).toLocaleString()} ₽</p>
                {p.discount > 0 && (
                  <Badge variant="secondary" className="text-xs mt-1">-{p.discount}%</Badge>
                )}
              </button>
            ))}
          </div>

          {/* Price summary */}
          <div className="p-4 rounded-lg bg-muted space-y-2">
            {selectedPeriodData.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Без скидки</span>
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

          {/* Payment buttons */}
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base gap-2"
              onClick={handlePayFromBalance}
              disabled={paying || !canPayFromBalance}
            >
              {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
              Оплатить с баланса
              <span className="text-sm opacity-80">({balance.toLocaleString()} ₽)</span>
            </Button>

            {!canPayFromBalance && (
              <p className="text-xs text-destructive text-center">
                Недостаточно средств на балансе. Пополните баланс или оплатите картой.
              </p>
            )}

            <div className="relative flex items-center">
              <div className="flex-1 border-t" />
              <span className="px-3 text-xs text-muted-foreground">или</span>
              <div className="flex-1 border-t" />
            </div>

            <Button
              variant="outline"
              className="w-full h-12 text-base gap-2"
              onClick={handlePayByCard}
            >
              <CreditCard className="h-5 w-5" />
              Оплатить картой (Т-Банк)
            </Button>
          </div>

          {/* Back button */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setActiveRole('client')}
          >
            Вернуться в личный кабинет
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPaywall;
