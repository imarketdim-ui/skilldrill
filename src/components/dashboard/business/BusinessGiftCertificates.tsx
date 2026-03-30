import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Gift, Plus, Ticket, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Props { businessId: string; }

interface Certificate {
  id: string; code: string; amount: number; recipientName: string;
  validity: string; status: 'issued' | 'redeemed' | 'expired';
  createdAt: string; redeemedAt?: string;
}

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `GC-${code.slice(0, 4)}-${code.slice(4)}`;
};

const BusinessGiftCertificates = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ amount: 1000, recipientName: '', validity: '90' });

  useEffect(() => {
    const saved = localStorage.getItem(`gift_certs_${businessId}`);
    if (saved) try { setCerts(JSON.parse(saved)); } catch {}
  }, [businessId]);

  const save = (updated: Certificate[]) => {
    setCerts(updated);
    localStorage.setItem(`gift_certs_${businessId}`, JSON.stringify(updated));
  };

  const handleCreate = () => {
    if (!form.recipientName.trim()) { toast({ title: 'Введите имя получателя', variant: 'destructive' }); return; }
    const cert: Certificate = {
      id: crypto.randomUUID(), code: generateCode(),
      amount: form.amount, recipientName: form.recipientName,
      validity: form.validity, status: 'issued',
      createdAt: new Date().toISOString(),
    };
    save([cert, ...certs]);
    toast({ title: 'Сертификат создан', description: `Код: ${cert.code}` });
    setDialogOpen(false);
    setForm({ amount: 1000, recipientName: '', validity: '90' });
  };

  const redeem = (id: string) => {
    save(certs.map(c => c.id === id ? { ...c, status: 'redeemed' as const, redeemedAt: new Date().toISOString() } : c));
    toast({ title: 'Сертификат погашен' });
  };

  const statusBadge = (s: Certificate['status']) => {
    if (s === 'issued') return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Активен</Badge>;
    if (s === 'redeemed') return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Погашен</Badge>;
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Истёк</Badge>;
  };

  const totalIssued = certs.filter(c => c.status === 'issued').reduce((s, c) => s + c.amount, 0);
  const totalRedeemed = certs.filter(c => c.status === 'redeemed').reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Ticket className="h-6 w-6" /> Подарочные сертификаты</h2>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Создать</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">Всего выпущено</p>
          <p className="text-2xl font-bold mt-1">{certs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">Активных на сумму</p>
          <p className="text-2xl font-bold mt-1">{totalIssued.toLocaleString()} ₽</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">Погашено</p>
          <p className="text-2xl font-bold mt-1">{totalRedeemed.toLocaleString()} ₽</p>
        </CardContent></Card>
      </div>

      {certs.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Нет сертификатов</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {certs.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-sm">{c.code}</p>
                  <p className="text-sm">{c.recipientName} · {c.amount.toLocaleString()} ₽</p>
                  <p className="text-xs text-muted-foreground">Срок: {c.validity} дней · {new Date(c.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(c.status)}
                  {c.status === 'issued' && <Button size="sm" variant="outline" onClick={() => redeem(c.id)}>Погасить</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый сертификат</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Имя получателя *</Label>
              <Input value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Номинал (₽)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Срок действия</Label>
              <Select value={form.validity} onValueChange={v => setForm(p => ({ ...p, validity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 дней</SelectItem>
                  <SelectItem value="90">90 дней</SelectItem>
                  <SelectItem value="180">180 дней</SelectItem>
                  <SelectItem value="365">1 год</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate}>Создать сертификат</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessGiftCertificates;
