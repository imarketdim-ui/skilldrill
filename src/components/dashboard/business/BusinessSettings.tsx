import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Settings, Percent, Save, Loader2 } from 'lucide-react';

const legalForms = [
  { value: 'ip', label: 'ИП' },
  { value: 'ooo', label: 'ООО' },
  { value: 'zao', label: 'ЗАО' },
  { value: 'oao', label: 'ОАО' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'other', label: 'Другое' },
];

interface Props {
  business: any;
  onUpdated: () => void;
}

const BusinessSettings = ({ business, onUpdated }: Props) => {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [masters, setMasters] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        inn: business.inn || '',
        legal_form: business.legal_form || '',
        address: business.address || '',
        city: business.city || '',
        description: business.description || '',
        director_name: business.director_name || '',
        contact_email: business.contact_email || '',
        contact_phone: business.contact_phone || '',
      });
    }
  }, [business]);

  const handleSaveInfo = async () => {
    setSaving(true);
    const { error } = await supabase.from('business_locations').update({
      name: form.name,
      inn: form.inn,
      legal_form: form.legal_form,
      address: form.address,
      city: form.city || null,
      description: form.description || null,
      director_name: form.director_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
    }).eq('id', business.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Информация обновлена' });
      setEditOpen(false);
      onUpdated();
    }
  };

  const openCommissions = async () => {
    const { data } = await supabase
      .from('business_masters')
      .select('id, master_id, commission_percent, profile:profiles!business_masters_master_id_fkey(first_name, last_name, skillspot_id)')
      .eq('business_id', business.id)
      .eq('status', 'accepted');
    const list = data || [];
    setMasters(list);
    const comms: Record<string, string> = {};
    list.forEach((m: any) => { comms[m.id] = String(m.commission_percent ?? 0); });
    setCommissions(comms);
    setCommissionOpen(true);
  };

  const handleSaveCommissions = async () => {
    setSaving(true);
    for (const [id, val] of Object.entries(commissions)) {
      await supabase.from('business_masters').update({ commission_percent: Number(val) || 0 }).eq('id', id);
    }
    setSaving(false);
    toast({ title: 'Комиссии обновлены' });
    setCommissionOpen(false);
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/[^\d+]/g, '');
    if (v.startsWith('8') && v.length > 1) v = '+7' + v.slice(1);
    return v;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Настройки бизнеса</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Редактировать информацию
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={openCommissions}>
            <Percent className="h-4 w-4" /> Настройки комиссий
          </Button>
        </CardContent>
      </Card>

      {/* Edit Info Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Редактировать информацию</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={form.name || ''} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ИНН</Label>
                <Input value={form.inn || ''} onChange={e => setForm((p: any) => ({ ...p, inn: e.target.value.replace(/\D/g, '') }))} maxLength={12} />
              </div>
              <div className="space-y-2">
                <Label>Правовая форма</Label>
                <Select value={form.legal_form || ''} onValueChange={v => setForm((p: any) => ({ ...p, legal_form: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{legalForms.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>ФИО директора</Label>
              <Input value={form.director_name || ''} onChange={e => setForm((p: any) => ({ ...p, director_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Город</Label>
              <Input value={form.city || ''} onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input value={form.address || ''} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description || ''} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.contact_email || ''} onChange={e => setForm((p: any) => ({ ...p, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={form.contact_phone || ''} onChange={e => setForm((p: any) => ({ ...p, contact_phone: formatPhone(e.target.value) }))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveInfo} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commission Settings Dialog */}
      <Dialog open={commissionOpen} onOpenChange={setCommissionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Настройки комиссий</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {masters.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Нет активных мастеров</p>
            ) : (
              masters.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{m.profile?.first_name} {m.profile?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{m.profile?.skillspot_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="w-20 text-center"
                      value={commissions[m.id] || '0'}
                      onChange={e => setCommissions(prev => ({ ...prev, [m.id]: e.target.value.replace(/[^\d]/g, '') }))}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))
            )}
            <Button className="w-full" onClick={handleSaveCommissions} disabled={saving || masters.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить комиссии
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessSettings;
