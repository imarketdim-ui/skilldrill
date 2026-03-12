import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PushNotificationToggle = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications(user?.id);
  const { toast } = useToast();

  if (!isSupported) return null;

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const success = await subscribe();
      if (success) {
        toast({ title: 'Push-уведомления включены', description: 'Вы будете получать уведомления о записях и напоминания.' });
      } else if (permission === 'denied') {
        toast({ title: 'Уведомления заблокированы', description: 'Разрешите уведомления в настройках браузера.', variant: 'destructive' });
      }
    } else {
      await unsubscribe();
      toast({ title: 'Push-уведомления отключены' });
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="h-4 w-4 text-primary" />
        ) : (
          <BellOff className="h-4 w-4 text-muted-foreground" />
        )}
        <div>
          <Label className="font-medium text-sm">Push-уведомления</Label>
          <p className="text-xs text-muted-foreground">
            {isSubscribed ? 'Вы получаете уведомления' : 'Напоминания о записях, новые записи, обновления'}
          </p>
        </div>
      </div>
      <Switch checked={isSubscribed} onCheckedChange={handleToggle} />
    </div>
  );
};

export default PushNotificationToggle;
