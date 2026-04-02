import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Globe, Save, Clock, FileText, Mail, Loader2 } from 'lucide-react';

interface Props { businessId: string; }

interface BookingSettings {
  minBookingHours: number;
  requireMailingConsent: boolean;
  offerText: string;
  autoConfirm: boolean;
  maxAdvanceDays: number;
}

const defaults: BookingSettings = {
  minBookingHours: 2, requireMailingConsent: false,
  offerText: '', autoConfirm: false, maxAdvanceDays: 30,
};

const BusinessBookingSettings = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BookingSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('business_settings').select('booking').eq('business_id', businessId).maybeSingle()
      .then(({ data }) => {
        if (data?.booking) {
          const b = data.booking as any;
          setSettings({
            minBookingHours: b.minBookingHours ?? defaults.minBookingHours,
            requireMailingConsent: b.requireMailingConsent ?? defaults.requireMailingConsent,
            offerText: b.offerText ?? defaults.offerText,
            autoConfirm: b.autoConfirm ?? defaults.autoConfirm,
            maxAdvanceDays: b.maxAdvanceDays ?? defaults.maxAdvanceDays,
          });
        }
        setLoading(false);
      });
  }, [businessId]);

  const save = async () => {
    const { data: existing } = await supabase.from('business_settings').select('id, booking').eq('business_id', businessId).maybeSingle();
    const booking = { ...(existing?.booking as any || {}), ...settings };
    await supabase.from('business_settings').upsert({
      business_id: businessId,
      booking,
      updated_at: new Date().toISOString(),
    });
    toast({ title: 'Настройки онлайн-записи сохранены' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6" /> Онлайн запись</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Время записи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Минимальное время до записи</Label>
            <Select value={String(settings.minBookingHours)} onValueChange={v => setSettings(p => ({ ...p, minBookingHours: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 час</SelectItem>
                <SelectItem value="2">2 часа</SelectItem>
                <SelectItem value="4">4 часа</SelectItem>
                <SelectItem value="12">12 часов</SelectItem>
                <SelectItem value="24">24 часа</SelectItem>
                <SelectItem value="48">48 часов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Макс. дней вперёд для записи</Label>
            <Input type="number" value={settings.maxAdvanceDays} onChange={e => setSettings(p => ({ ...p, maxAdvanceDays: Number(e.target.value) }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Автоподтверждение записей</Label>
            <Switch checked={settings.autoConfirm} onCheckedChange={v => setSettings(p => ({ ...p, autoConfirm: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Согласия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Требовать согласие на рассылку</Label>
            <Switch checked={settings.requireMailingConsent} onCheckedChange={v => setSettings(p => ({ ...p, requireMailingConsent: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Оферта / Правила бронирования</CardTitle>
          <CardDescription>Текст отображается клиенту при записи</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.offerText}
            onChange={e => setSettings(p => ({ ...p, offerText: e.target.value }))}
            placeholder="Правила записи и бронирования вашего салона..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Сохранить</Button>
    </div>
  );
};

export default BusinessBookingSettings;
