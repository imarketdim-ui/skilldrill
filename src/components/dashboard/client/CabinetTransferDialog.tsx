import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, User, Briefcase, Building2, Shield } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  currentCabinet: 'client' | 'master' | 'business' | 'platform';
  currentBalance: number;
  onSuccess?: () => void;
}

const CABINET_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  client:   { label: 'Кабинет клиента',    icon: User },
  master:   { label: 'Кабинет мастера',    icon: Briefcase },
};

// Only allow client ↔ master transfers from client wallet
const ALLOWED_TRANSFERS: Record<string, string[]> = {
  client:   ['master'],
  master:   ['client'],
  business: ['client', 'master'],
  platform: ['client', 'master', 'business'],
};

const CabinetTransferDialog = ({ open, onClose, currentCabinet, currentBalance, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [toCabinet, setToCabinet] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const otherCabinets = (ALLOWED_TRANSFERS[currentCabinet] || []).filter(k => k in CABINET_LABELS);

  const handleTransfer = async () => {
    if (!user || !toCabinet || !amount) return;
    const num = Number(amount);
    if (isNaN(num) || num <= 0) { toast({ title: 'Укажите корректную сумму', variant: 'destructive' }); return; }
    if (num > currentBalance) { toast({ title: 'Недостаточно средств', variant: 'destructive' }); return; }

    setProcessing(true);
    try {
      // Deduct from source
      await supabase.from('balance_transactions').insert({
        user_id: user.id,
        amount: -num,
        type: 'transfer_out',
        description: `Перевод в ${CABINET_LABELS[toCabinet]?.label || toCabinet}`,
        cabinet_type: currentCabinet,
      });

      // Credit to target
      await supabase.from('balance_transactions').insert({
        user_id: user.id,
        amount: num,
        type: 'transfer_in',
        description: `Перевод из ${CABINET_LABELS[currentCabinet]?.label || currentCabinet}`,
        cabinet_type: toCabinet,
      });

      // Log transfer
      await supabase.from('cabinet_transfers').insert({
        user_id: user.id,
        from_cabinet_type: currentCabinet,
        to_cabinet_type: toCabinet,
        amount: num,
        note: `Перевод ${num} ₽`,
      });

      toast({ title: 'Перевод выполнен', description: `${num} ₽ переведено в ${CABINET_LABELS[toCabinet]?.label}` });
      onSuccess?.();
      onClose();
      setAmount('');
      setToCabinet('');
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const FromIcon = CABINET_LABELS[currentCabinet]?.icon || User;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Перевод между кабинетами</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <FromIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Откуда</p>
              <p className="font-medium text-sm">{CABINET_LABELS[currentCabinet]?.label}</p>
              <p className="text-xs text-muted-foreground">Доступно: {Number(currentBalance).toLocaleString()} ₽</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>Куда</Label>
            <Select value={toCabinet} onValueChange={setToCabinet}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите кабинет" />
              </SelectTrigger>
              <SelectContent>
                {otherCabinets.map(cab => {
                  const CabIcon = CABINET_LABELS[cab].icon;
                  return (
                    <SelectItem key={cab} value={cab}>
                      <div className="flex items-center gap-2">
                        <CabIcon className="h-4 w-4" />
                        {CABINET_LABELS[cab].label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Сумма (₽)</Label>
            <Input
              type="text" inputMode="numeric" placeholder="1000"
              value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            />
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map(v => (
                <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setAmount(String(v))}>{v}</Button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ℹ️ Каждый кабинет имеет отдельный баланс. Переводы между кабинетами мгновенны и бесплатны.
          </p>

          <Button className="w-full" onClick={handleTransfer} disabled={processing || !toCabinet || !amount}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Перевести {amount ? `${amount} ₽` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CabinetTransferDialog;
