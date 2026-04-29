import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Headphones, Eye, Settings, Plug, ChevronRight, ArrowLeft } from 'lucide-react';

interface PlatformRoleHubProps {
  onSelect: (role: UserRoleType) => void;
  onBack: () => void;
}

const PLATFORM_ROLE_META: Record<string, { label: string; description: string; icon: React.ReactNode; focus: string }> = {
  super_admin: { label: 'Супер-администратор', description: 'Полный контроль платформы', icon: <Crown className="h-5 w-5" />, focus: 'Стратегия и полный доступ' },
  platform_admin: { label: 'Администратор', description: 'Модерация и управление', icon: <Shield className="h-5 w-5" />, focus: 'Пользователи, организации и антифрод' },
  platform_manager: { label: 'Менеджер площадки', description: 'Работа с клиентами', icon: <Settings className="h-5 w-5" />, focus: 'Сопровождение и удержание' },
  moderator: { label: 'Модератор', description: 'Проверка контента', icon: <Eye className="h-5 w-5" />, focus: 'Проверка заявок и карточек' },
  support: { label: 'Поддержка', description: 'Чаты, обращения и сопровождение пользователей', icon: <Headphones className="h-5 w-5" />, focus: 'SLA, обращения и эскалации' },
  integrator: { label: 'Интегратор', description: 'Онбординг бизнеса, чеклисты и промокоды', icon: <Plug className="h-5 w-5" />, focus: 'Запуск кабинетов и внедрение' },
};

const PlatformRoleHub = ({ onSelect, onBack }: PlatformRoleHubProps) => {
  const { roles } = useAuth();

  const platformRoles = roles.filter(r =>
    ['super_admin', 'platform_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(r)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Управление площадкой</h2>
          <p className="text-muted-foreground mt-1">Выберите рабочий контекст: поддержка, модерация, сопровождение клиентов или внедрение бизнеса.</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          К клиенту
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Доступных ролей: {platformRoles.length}</Badge>
        <Badge variant="outline">Роль выбирается без выхода из аккаунта</Badge>
      </div>

      <div className="grid gap-3">
        {platformRoles.map(role => {
          const meta = PLATFORM_ROLE_META[role] || { label: role, description: '', icon: <Shield className="h-5 w-5" />, focus: 'Рабочий контекст платформы' };
          return (
            <Card
              key={role}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(role)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{meta.label}</p>
                    <p className="text-sm text-muted-foreground">{meta.description}</p>
                    <p className="text-xs text-primary mt-1">{meta.focus}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
        <p>Каждый кабинет платформы открывается с собственными ограничениями доступа.</p>
        <p>Поддержка не видит антифрод и роли, интегратор не управляет модерацией, менеджер площадки не меняет системные настройки.</p>
      </div>
    </div>
  );
};

export default PlatformRoleHub;
