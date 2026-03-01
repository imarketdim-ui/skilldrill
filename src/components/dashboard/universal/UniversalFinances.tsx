import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wallet, CreditCard, Banknote } from 'lucide-react';
import UniversalPayments from './UniversalPayments';
import UniversalExpenses from './UniversalExpenses';
import SubscriptionManager from '../SubscriptionManager';
import { CategoryConfig } from './categoryConfig';

interface Props {
  config: CategoryConfig;
  masterProfile: any;
}

const UniversalFinances = ({ config, masterProfile }: Props) => {
  const [tab, setTab] = useState('payments');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Wallet className="h-6 w-6" /> Финансы
      </h2>
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
            subscriptionStatus={masterProfile?.subscription_status || 'inactive'}
            trialStartDate={masterProfile?.trial_start_date}
            trialDays={masterProfile?.trial_days || 14}
            lastPaymentDate={masterProfile?.last_payment_date}
            basePrice={690}
            parentManaged={masterProfile?.subscription_status === 'in_business'}
            parentLabel="Управляется бизнесом"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UniversalFinances;
