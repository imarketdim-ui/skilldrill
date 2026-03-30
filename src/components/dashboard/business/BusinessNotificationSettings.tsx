import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, Save, Clock, Cake, Calendar, Star, MessageSquare } from 'lucide-react';

interface Props { businessId: string; }

interface NotifTemplate {
  key: string; label: string; description: string; icon: any;
  enabled: boolean; timing?: number; timingLabel?: string;
}

const defaultTemplates: NotifTemplate[] = [
  { key: 'booking_reminder', label: 'Напоминание о записи', description: 'Автоматическое напоминание клиенту', icon: Clock, enabled: true, timing: 24, timingLabel: 'часов до визита' },
  { key: 'booking_created', label: 'Создание записи', description: 'Уведомление о новой записи', icon: Calendar, enabled: true },
  { key: 'booking_cancelled', label: 'Отмена записи', description: 'Уведомление при отмене', icon: Calendar, enabled: true },
  { key: 'booking_rescheduled', label: 'Перенос записи', description: 'Уведомление при переносе', icon: Calendar, enabled: true },
  { key: 'post_cancel_invite', label: 'Приглашение после отмены', description: 'Предложить перезаписаться', icon: MessageSquare, enabled: false, timing: 48, timingLabel: 'часов после отмены' },
  { key: 'birthday', label: 'Поздравление с днём рождения', description: 'Автоматическое поздравление', icon: Cake, enabled: false },
  { key: 'holiday', label: 'Праздничное поздравление', description: 'Поздравление с праздниками', icon: Star, enabled: false },
  { key: 'review_request', label: 'Запрос отзыва', description: 'Попросить оставить отзыв', icon: MessageSquare, enabled: false, timing: 2, timingLabel: 'часов после визита' },
];

const BusinessNotificationSettings = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotifTemplate[]>(defaultTemplates);

  useEffect(() => {
    const saved = localStorage.getItem(`notif_templates_${businessId}`);
    if (saved) try { setTemplates(JSON.parse(saved)); } catch {}
  }, [businessId]);

  const save = () => {
    localStorage.setItem(`notif_templates_${businessId}`, JSON.stringify(templates));
    toast({ title: 'Настройки уведомлений сохранены' });
  };

  const toggle = (key: string) => setTemplates(t => t.map(tp => tp.key === key ? { ...tp, enabled: !tp.enabled } : tp));
  const setTiming = (key: string, val: number) => setTemplates(t => t.map(tp => tp.key === key ? { ...tp, timing: val } : tp));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Настройки уведомлений</h2>
      <p className="text-muted-foreground">Управляйте автоматическими уведомлениями клиентам</p>

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
