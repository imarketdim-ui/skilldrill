import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Wallet, Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, 
  Banknote, CreditCard, Building2, Trash2, Edit2, History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  businessId: string;
}

const registerTypes = [
  { value: 'cash', label: 'Касса (наличные)', icon: Banknote },
  { value: 'card', label: 'Терминал (эквайринг)', icon: CreditCard },
  { value: 'bank_account', label: 'Расчётный счёт', icon: Building2 },
  { value: 'terminal', label: 'Касса мастера', icon: Wallet },
];

const transactionCategories = [
  { value: 'service_payment', label: 'Оплата услуги', type: 'income' },
  { value: 'product_sale', label: 'Продажа товара', type: 'income' },
  { value: 'cash_deposit', label: 'Внесение', type: 'income' },
  { value: 'procurement', label: 'Закупка материалов', type: 'expense' },
  { value: 'salary', label: 'Выплата зарплаты', type: 'expense' },
  { value: 'rent', label: 'Аренда', type: 'expense' },
  { value: 'utilities', label: 'Коммунальные', type: 'expense' },
  { value: 'encashment', label: 'Инкассация', type: 'expense' },
  { value: 'transfer', label: 'Перевод между кассами', type: 'transfer' },
  { value: 'other', label: 'Прочее', type: 'both' },
];

const BusinessCashRegisters = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registers, setRegisters] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRegisterOpen, setAddRegisterOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const [registerForm, setRegisterForm] = useState({ name: '', type: 'cash' });
  const [txForm, setTxForm] = useState({ 
    type: 'income' as 'income' | 'expense', 
    category: '', 
    amount: '', 
    description: '' 
  });
  const [transferForm, setTransferForm] = useState({
    from_register_id: '',
    to_register_id: '',
    amount: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [businessId]);

  const fetchData = async () => {
    setLoading(true);
    const [regRes, txRes] = await Promise.all([
      supabase.from('cash_registers').select('*').eq('business_id', businessId).order('created_at'),
      supabase.from('cash_register_transactions').select('*, register:cash_registers(name, type)')
        .order('created_at', { ascending: false }).limit(100),
    ]);
    setRegisters(regRes.data || []);
    // Filter transactions to only show ones from this business
    const businessRegisterIds = (regRes.data || []).map(r => r.id);
    setTransactions((txRes.data || []).filter(t => businessRegisterIds.includes(t.register_id)));
    setLoading(false);
  };

  const handleAddRegister = async () => {
    if (!registerForm.name.trim()) {
      toast({ title: 'Введите название кассы', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('cash_registers').insert({
      business_id: businessId,
      name: registerForm.name.trim(),
      type: registerForm.type,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Касса создана' });
      setAddRegisterOpen(false);
      setRegisterForm({ name: '', type: 'cash' });
      fetchData();
    }
  };

  const handleTransaction = async () => {
    if (!txForm.amount || !txForm.category || !selectedRegister) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const amount = Number(txForm.amount);
    
    // Insert transaction
    const { error: txError } = await supabase.from('cash_register_transactions').insert({
      register_id: selectedRegister.id,
      type: txForm.type,
      category: txForm.category,
      amount: txForm.type === 'expense' ? -amount : amount,
      description: txForm.description || null,
      performed_by: user?.id,
    });

    if (!txError) {
      // Update register balance
      const newBalance = txForm.type === 'income' 
        ? selectedRegister.balance + amount 
        : selectedRegister.balance - amount;
      await supabase.from('cash_registers').update({ balance: newBalance }).eq('id', selectedRegister.id);
    }

    setSaving(false);
    if (txError) {
      toast({ title: 'Ошибка', description: txError.message, variant: 'destructive' });
    } else {
      toast({ title: txForm.type === 'income' ? 'Приход добавлен' : 'Расход добавлен' });
      setTransactionOpen(false);
      setTxForm({ type: 'income', category: '', amount: '', description: '' });
      fetchData();
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.from_register_id || !transferForm.to_register_id || !transferForm.amount) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }
    if (transferForm.from_register_id === transferForm.to_register_id) {
      toast({ title: 'Выберите разные кассы', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const amount = Number(transferForm.amount);
    const fromReg = registers.find(r => r.id === transferForm.from_register_id);
    const toReg = registers.find(r => r.id === transferForm.to_register_id);

    if (fromReg.balance < amount) {
      toast({ title: 'Недостаточно средств', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Create two transactions: out and in
    await supabase.from('cash_register_transactions').insert([
      {
        register_id: fromReg.id,
        type: 'transfer_out',
        category: 'transfer',
        amount: -amount,
        description: `Перевод в ${toReg.name}. ${transferForm.description || ''}`.trim(),
        performed_by: user?.id,
      },
      {
        register_id: toReg.id,
        type: 'transfer_in',
        category: 'transfer',
        amount: amount,
        description: `Перевод из ${fromReg.name}. ${transferForm.description || ''}`.trim(),
        performed_by: user?.id,
      }
    ]);

    // Update balances
    await Promise.all([
      supabase.from('cash_registers').update({ balance: fromReg.balance - amount }).eq('id', fromReg.id),
      supabase.from('cash_registers').update({ balance: toReg.balance + amount }).eq('id', toReg.id),
    ]);

    setSaving(false);
    toast({ title: 'Перевод выполнен' });
    setTransferOpen(false);
    setTransferForm({ from_register_id: '', to_register_id: '', amount: '', description: '' });
    fetchData();
  };

  const deleteRegister = async (id: string) => {
    if (!confirm('Удалить кассу? Все связанные операции будут удалены.')) return;
    const { error } = await supabase.from('cash_registers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Касса удалена' });
      fetchData();
    }
  };

  const openTransaction = (register: any, type: 'income' | 'expense') => {
    setSelectedRegister(register);
    setTxForm({ type, category: '', amount: '', description: '' });
    setTransactionOpen(true);
  };

  const openHistory = (register: any) => {
    setSelectedRegister(register);
    setHistoryOpen(true);
  };

  const totalBalance = registers.reduce((s, r) => s + Number(r.balance), 0);
  const registerHistory = selectedRegister 
    ? transactions.filter(t => t.register_id === selectedRegister.id) 
    : [];

  const fmtNum = (n: number) => n.toLocaleString();

  const getTypeIcon = (type: string) => {
    const t = registerTypes.find(rt => rt.value === type);
    return t ? t.icon : Wallet;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Кассы
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)} disabled={registers.length < 2}>
            <ArrowLeftRight className="h-4 w-4 mr-1" /> Перевод
          </Button>
          <Button size="sm" onClick={() => setAddRegisterOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Добавить кассу
          </Button>
        </div>
      </div>

      {/* Total balance */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Общий баланс</p>
            <p className="text-2xl font-bold">{fmtNum(totalBalance)} ₽</p>
          </div>
          <Badge variant="secondary">{registers.length} касс(ы)</Badge>
        </CardContent>
      </Card>

      {/* Registers grid */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
      ) : registers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Нет касс. Создайте первую кассу для учёта денежных средств.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {registers.map(reg => {
            const TypeIcon = getTypeIcon(reg.type);
            const typeLabel = registerTypes.find(t => t.value === reg.type)?.label || reg.type;
            return (
              <Card key={reg.id} className="relative group">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{reg.name}</p>
                        <p className="text-xs text-muted-foreground">{typeLabel}</p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteRegister(reg.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className={`text-xl font-bold ${Number(reg.balance) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                    {fmtNum(Number(reg.balance))} ₽
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openTransaction(reg, 'income')}>
                      <ArrowUpRight className="h-3 w-3 mr-1 text-green-600" /> Приход
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openTransaction(reg, 'expense')}>
                      <ArrowDownRight className="h-3 w-3 mr-1 text-red-600" /> Расход
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openHistory(reg)}>
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Register Dialog */}
      <Dialog open={addRegisterOpen} onOpenChange={setAddRegisterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить кассу</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input 
                placeholder="Основная касса" 
                value={registerForm.name} 
                onChange={e => setRegisterForm(p => ({ ...p, name: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Тип</Label>
              <Select value={registerForm.type} onValueChange={v => setRegisterForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {registerTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddRegister} disabled={saving} className="w-full">
              {saving ? 'Создание...' : 'Создать кассу'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={transactionOpen} onOpenChange={setTransactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {txForm.type === 'income' ? 'Приход' : 'Расход'}: {selectedRegister?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Категория</Label>
              <Select value={txForm.category} onValueChange={v => setTxForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                <SelectContent>
                  {transactionCategories
                    .filter(c => c.type === txForm.type || c.type === 'both')
                    .map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сумма</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={txForm.amount} 
                onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Описание (опционально)</Label>
              <Input 
                placeholder="Комментарий" 
                value={txForm.description} 
                onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} 
              />
            </div>
            <Button onClick={handleTransaction} disabled={saving} className="w-full">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Перевод между кассами</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Из кассы</Label>
              <Select value={transferForm.from_register_id} onValueChange={v => setTransferForm(p => ({ ...p, from_register_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Откуда" /></SelectTrigger>
                <SelectContent>
                  {registers.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({fmtNum(r.balance)} ₽)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>В кассу</Label>
              <Select value={transferForm.to_register_id} onValueChange={v => setTransferForm(p => ({ ...p, to_register_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Куда" /></SelectTrigger>
                <SelectContent>
                  {registers.filter(r => r.id !== transferForm.from_register_id).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({fmtNum(r.balance)} ₽)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сумма</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={transferForm.amount} 
                onChange={e => setTransferForm(p => ({ ...p, amount: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Описание (опционально)</Label>
              <Input 
                placeholder="Комментарий" 
                value={transferForm.description} 
                onChange={e => setTransferForm(p => ({ ...p, description: e.target.value }))} 
              />
            </div>
            <Button onClick={handleTransfer} disabled={saving} className="w-full">
              {saving ? 'Перевод...' : 'Выполнить перевод'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>История: {selectedRegister?.name}</DialogTitle>
          </DialogHeader>
          {registerHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет операций</p>
          ) : (
            <div className="space-y-2">
              {registerHistory.map(t => {
                const catLabel = transactionCategories.find(c => c.value === t.category)?.label || t.category;
                const isPositive = Number(t.amount) > 0;
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{catLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(t.created_at), 'd MMM yyyy HH:mm', { locale: ru })}
                        {t.description && ` · ${t.description}`}
                      </p>
                    </div>
                    <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{fmtNum(Number(t.amount))} ₽
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessCashRegisters;
