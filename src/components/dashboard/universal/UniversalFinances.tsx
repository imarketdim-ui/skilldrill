import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformPricing } from '@/hooks/usePlatformPricing';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import UniversalPayments from './UniversalPayments';
import UniversalExpenses from './UniversalExpenses';
import SubscriptionManager from '../SubscriptionManager';
import CabinetTransferDialog from '../client/CabinetTransferDialog';
import { CategoryConfig } from './categoryConfig';

interface Props {
  config: CategoryConfig;
  masterProfile: any;
}

const UniversalFinances = ({ config, masterProfile }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('payments');
  const pricing = usePlatformPricing();
  const [masterBalance, setMasterBalance] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);

  const loadBalance = async () => {
    if (!user || !masterProfile?.id) return;
    const { data, error } = await supabase.from('cabinet_balances')
      .select('main_balance')
      .eq('user_id', user.id)
      .eq('cabinet_type', 'master')
      .eq('cabinet_id', masterProfile.id)
      .maybeSingle();
    if (error) { console.warn('balance fetch error:', error.message); setMasterBalance(0); return; }
    if (!data) {
      // Auto-create missing row (idempotent)
      await supabase.from('cabinet_balances').insert({
        user_id: user.id, cabinet_type: 'master', cabinet_id: masterProfile.id, main_balance: 0,
      }).select().maybeSingle();
      setMasterBalance(0);
      return;
    }
    setMasterBalance(Number(data.main_balance) || 0);
  };

  useEffect(() => { loadBalance(); }, [user, masterProfile?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Финансы
        </h2>
      </div>

      {/* Cabinet balance card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Баланс мастерского кабинета</p>
              <p className="text-2xl font-bold text-primary">{Number(masterBalance).toLocaleString()} ₽</p>
              <p className="text-xs text-muted-foreground mt-1">
                Отделён от клиентского и бизнес-балансов
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              onClick={() => setTransferOpen(true)}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Перевести
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Оплаты
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <Banknote className="h-3.5 w-3.5" /> Расходы
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Подписка
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments"><UniversalPayments /></TabsContent>
        <TabsContent value="expenses"><UniversalExpenses config={config} /></TabsContent>
        <TabsContent value="subscription">
          <SubscriptionManager
            entityType="master"
            entityId={masterProfile?.id}
            subscriptionStatus={masterProfile?.subscription_status || 'inactive'}
            trialStartDate={masterProfile?.trial_start_date}
            trialDays={masterProfile?.trial_days || 14}
            lastPaymentDate={masterProfile?.last_payment_date}
            basePrice={pricing.master}
            parentManaged={masterProfile?.subscription_status === 'in_business'}
            parentLabel="Управляется бизнесом"
          />
        </TabsContent>
      </Tabs>

      <CabinetTransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        currentCabinet="master"
        currentBalance={masterBalance}
        onSuccess={loadBalance}
      />
    </div>
  );
};

export default UniversalFinances;
