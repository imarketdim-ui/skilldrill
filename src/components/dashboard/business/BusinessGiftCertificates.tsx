import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Gift, Plus, Ticket, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

interface Props { businessId: string; }

interface Certificate {
  id: string; code: string; amount: number; recipient_name: string | null;
  validity_days: number; status: string;
  created_at: string; redeemed_at: string | null;
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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ amount: 1000, recipientName: '', validity: '90' });

  useEffect(() => { fetchCerts(); }, [businessId]);

  const fetchCerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gift_certificates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    setCerts((data || []) as Certificate[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.recipientName.trim()) { toast({ title: 'Введите имя получателя', variant: 'destructive' }); return; }
    const { error } = await supabase.from('gift_certificates').insert({
      business_id: businessId,
      code: generateCode(),
      amount: form.amount,
      recipient_name: form.recipientName,
      validity_days: Number(form.validity),
      status: 'issued',
    });
    if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Сертификат создан' });
    setDialogOpen(false);
    setForm({ amount: 1000, recipientName: '', validity: '90' });
    fetchCerts();
  };

  const redeem = async (id: string) => {
    await supabase.from('gift_certificates').update({ status: 'redeemed', redeemed_at: new Date().toISOString() }).eq('id', id);
    setCerts(c => c.map(cert => cert.id === id ? { ...cert, status: 'redeemed', redeemed_at: new Date().toISOString() } : cert));
    toast({ title: 'Сертификат погашен' });
  };

  const statusBadge = (s: string) => {
    if (s === 'issued') return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Активен</Badge>;
    if (s === 'redeemed') return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Погашен</Badge>;
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Истёк</Badge>;
  };

  const totalIssued = certs.filter(c => c.status === 'issued').reduce((s, c) => s + c.amount, 0);
  const totalRedeemed = certs.filter(c => c.status === 'redeemed').reduce((s, c) => s + c.amount, 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

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
                  <p className="text-sm">{c.recipient_name} · {c.amount.toLocaleString()} ₽</p>
                  <p className="text-xs text-muted-foreground">Срок: {c.validity_days} дней · {new Date(c.created_at).toLocaleDateString('ru-RU')}</p>
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
