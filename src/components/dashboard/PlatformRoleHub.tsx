import { useAuth, UserRoleType } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Crown, Headphones, Eye, Settings, Plug, ChevronRight } from 'lucide-react';

interface PlatformRoleHubProps {
  onSelect: (role: UserRoleType) => void;
  onBack: () => void;
}

const PLATFORM_ROLE_META: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Супер-администратор', description: 'Полный контроль платформы', icon: <Crown className="h-5 w-5" /> },
  platform_admin: { label: 'Администратор', description: 'Модерация и управление', icon: <Shield className="h-5 w-5" /> },
  platform_manager: { label: 'Менеджер площадки', description: 'Работа с клиентами', icon: <Settings className="h-5 w-5" /> },
  moderator: { label: 'Модератор', description: 'Проверка контента', icon: <Eye className="h-5 w-5" /> },
  support: { label: 'Поддержка', description: 'Помощь пользователям', icon: <Headphones className="h-5 w-5" /> },
  integrator: { label: 'Интегратор', description: 'Настройка интеграций', icon: <Plug className="h-5 w-5" /> },
};

const PlatformRoleHub = ({ onSelect, onBack }: PlatformRoleHubProps) => {
  const { roles } = useAuth();

  const platformRoles = roles.filter(r =>
    ['super_admin', 'platform_admin', 'platform_manager', 'moderator', 'support', 'integrator'].includes(r)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Управление площадкой</h2>
        <p className="text-muted-foreground mt-1">Выберите роль для работы с платформой</p>
      </div>

      <div className="grid gap-3">
        {platformRoles.map(role => {
          const meta = PLATFORM_ROLE_META[role] || { label: role, description: '', icon: <Shield className="h-5 w-5" /> };
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
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" className="w-full" onClick={onBack}>
        ← Вернуться в кабинет клиента
      </Button>
    </div>
  );
};

export default PlatformRoleHub;
