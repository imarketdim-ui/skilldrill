import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Gift, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

const ClientBonusPoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState({ balance: 0, total_earned: 0, total_spent: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [ptsRes, txRes] = await Promise.all([
      supabase.from('bonus_points').select('balance, total_earned, total_spent').eq('user_id', user!.id).maybeSingle(),
      supabase.from('bonus_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (ptsRes.data) setPoints(ptsRes.data);
    setTransactions(txRes.data || []);
    setLoading(false);
  };

  const sourceLabels: Record<string, string> = {
    booking_complete: 'Завершённая запись',
    referral: 'Реферальный бонус',
    promo: 'Промокод',
    review: 'Отзыв',
    purchase: 'Оплата баллами',
    admin: 'Начисление администратором',
  };

  const typeLabels: Record<string, string> = {
    earn: 'Начисление',
    spend: 'Списание',
    expire: 'Истечение срока',
    admin_adjust: 'Корректировка',
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Текущий баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              <span className="text-3xl font-bold">{points.balance}</span>
              <span className="text-muted-foreground">баллов</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего заработано</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">+{points.total_earned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего потрачено</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">−{points.total_spent}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Как заработать баллы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5">+50</Badge>
              <div><p className="text-sm font-medium">Завершённая запись</p><p className="text-xs text-muted-foreground">За каждую оплаченную услугу</p></div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5">+30</Badge>
              <div><p className="text-sm font-medium">Отзыв</p><p className="text-xs text-muted-foreground">За оставленный отзыв с оценкой</p></div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5">+200</Badge>
              <div><p className="text-sm font-medium">Приглашение друга</p><p className="text-xs text-muted-foreground">Когда друг завершит первую запись</p></div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge variant="secondary" className="mt-0.5">−100</Badge>
              <div><p className="text-sm font-medium">Скидка 100 ₽</p><p className="text-xs text-muted-foreground">Списание 100 баллов = 100 ₽ скидки</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История баллов</CardTitle>
          <CardDescription>Последние 50 операций</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Операций пока нет. Запишитесь на услугу, чтобы начать зарабатывать баллы!</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                      {tx.amount > 0 ? <ArrowDown className="h-4 w-4 text-primary" /> : <ArrowUp className="h-4 w-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{typeLabels[tx.type] || tx.type}</p>
                      <p className="text-xs text-muted-foreground">{sourceLabels[tx.source] || tx.source}{tx.description ? ` · ${tx.description}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
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

export default ClientBonusPoints;
