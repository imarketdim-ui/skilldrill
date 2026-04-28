import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, Save, Clock, Cake, Calendar, Star, MessageSquare, Loader2 } from 'lucide-react';

interface Props { businessId: string; }

interface NotifTemplate {
  key: string; label: string; description: string; icon: any;
  enabled: boolean; timing?: number; timingLabel?: string;
  channels?: { inApp: boolean; push: boolean; telegram: boolean };
}

const defaultTemplates: NotifTemplate[] = [
  { key: 'booking_reminder', label: 'Напоминание о записи', description: 'Автоматическое напоминание клиенту', icon: Clock, enabled: true, timing: 24, timingLabel: 'часов до визита', channels: { inApp: true, push: true, telegram: true } },
  { key: 'booking_created', label: 'Создание записи', description: 'Уведомление о новой записи', icon: Calendar, enabled: true, channels: { inApp: true, push: true, telegram: true } },
  { key: 'booking_cancelled', label: 'Отмена записи', description: 'Уведомление при отмене', icon: Calendar, enabled: true, channels: { inApp: true, push: true, telegram: true } },
  { key: 'booking_rescheduled', label: 'Перенос записи', description: 'Уведомление при переносе', icon: Calendar, enabled: true, channels: { inApp: true, push: true, telegram: true } },
  { key: 'post_cancel_invite', label: 'Приглашение после отмены', description: 'Предложить перезаписаться', icon: MessageSquare, enabled: false, timing: 48, timingLabel: 'часов после отмены', channels: { inApp: true, push: true, telegram: false } },
  { key: 'birthday', label: 'Поздравление с днём рождения', description: 'Автоматическое поздравление', icon: Cake, enabled: false, channels: { inApp: true, push: false, telegram: true } },
  { key: 'holiday', label: 'Праздничное поздравление', description: 'Поздравление с праздниками', icon: Star, enabled: false, channels: { inApp: true, push: false, telegram: true } },
  { key: 'review_request', label: 'Запрос отзыва', description: 'Попросить оставить отзыв', icon: MessageSquare, enabled: false, timing: 2, timingLabel: 'часов после визита', channels: { inApp: true, push: true, telegram: false } },
];

const BusinessNotificationSettings = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotifTemplate[]>(defaultTemplates);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('business_settings').select('notifications').eq('business_id', businessId).maybeSingle()
      .then(({ data }) => {
        if (data?.notifications && Array.isArray(data.notifications)) {
          // Merge saved state with defaults (to pick up new templates)
          const saved = data.notifications as any[];
          setTemplates(defaultTemplates.map(dt => {
            const s = saved.find((st: any) => st.key === dt.key);
            return s ? {
              ...dt,
              enabled: s.enabled,
              timing: s.timing ?? dt.timing,
              channels: { ...dt.channels, ...(s.channels || {}) },
            } : dt;
          }));
        }
        setLoading(false);
      });
  }, [businessId]);

  const save = async () => {
    const serializable = templates.map(t => ({ key: t.key, enabled: t.enabled, timing: t.timing, channels: t.channels }));
    await supabase.from('business_settings').upsert({
      business_id: businessId,
      notifications: serializable as any,
      updated_at: new Date().toISOString(),
    });
    toast({ title: 'Настройки уведомлений сохранены' });
  };

  const toggle = (key: string) => setTemplates(t => t.map(tp => tp.key === key ? { ...tp, enabled: !tp.enabled } : tp));
  const setTiming = (key: string, val: number) => setTemplates(t => t.map(tp => tp.key === key ? { ...tp, timing: val } : tp));
  const toggleChannel = (key: string, channel: 'inApp' | 'push' | 'telegram') =>
    setTemplates(t => t.map(tp => tp.key === key ? {
      ...tp,
      channels: { inApp: true, push: false, telegram: false, ...tp.channels, [channel]: !tp.channels?.[channel] },
    } : tp));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Настройки уведомлений</h2>
      <p className="text-muted-foreground">Управляйте автоматическими уведомлениями клиентам. SMS не используются для маркетинга и сервисных оповещений.</p>

      <div className="space-y-3">
        {templates.map(t => {
          const Icon = t.icon;
          return (
            <Card key={t.key}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                  <Switch checked={t.enabled} onCheckedChange={() => toggle(t.key)} />
                </div>
                {t.enabled && t.timing !== undefined && t.timingLabel && (
                  <div className="mt-3 ml-8 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">За</Label>
                    <Input type="number" className="w-20 h-8 text-sm" value={t.timing} onChange={e => setTiming(t.key, Number(e.target.value))} />
                    <span className="text-xs text-muted-foreground">{t.timingLabel}</span>
                  </div>
                )}
                {t.enabled && (
                  <div className="mt-3 ml-8 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <label className="flex items-center gap-2"><Switch checked={t.channels?.inApp ?? true} onCheckedChange={() => toggleChannel(t.key, 'inApp')} /> In-app</label>
                    <label className="flex items-center gap-2"><Switch checked={t.channels?.push ?? false} onCheckedChange={() => toggleChannel(t.key, 'push')} /> Push</label>
                    <label className="flex items-center gap-2"><Switch checked={t.channels?.telegram ?? false} onCheckedChange={() => toggleChannel(t.key, 'telegram')} /> Telegram</label>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Сохранить настройки</Button>
    </div>
  );
};

export default BusinessNotificationSettings;
