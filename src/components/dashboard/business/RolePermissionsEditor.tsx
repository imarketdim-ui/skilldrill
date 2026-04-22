import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Wrench, Briefcase, Save, RotateCcw, Plus, Trash2, UserCog } from 'lucide-react';

interface Props { businessId: string; }
type RoleKey = string;

interface PermissionItem { key: string; label: string; description: string; group: string; }

const permissionGroups = [
  { key: 'crm', label: 'CRM' },
  { key: 'erp', label: 'ERP' },
  { key: 'system', label: 'Система' },
];

const permissions: PermissionItem[] = [
  { key: 'bookings:view', label: 'Просмотр записей', description: 'Просмотр записей клиентов', group: 'crm' },
  { key: 'bookings:manage', label: 'Управление записями', description: 'Создание, редактирование и отмена записей', group: 'crm' },
  { key: 'schedule:view', label: 'Просмотр расписания', description: 'Просмотр расписания сотрудников', group: 'crm' },
  { key: 'schedule:manage', label: 'Управление расписанием', description: 'Редактирование рабочего графика', group: 'crm' },
  { key: 'clients:view', label: 'Просмотр клиентов', description: 'Список клиентов и история визитов', group: 'crm' },
  { key: 'clients:manage', label: 'Управление клиентами', description: 'Теги, заметки, чёрный список', group: 'crm' },
  { key: 'chats:view', label: 'Чаты', description: 'Переписка с клиентами', group: 'crm' },
  { key: 'marketing:view', label: 'Просмотр рассылок', description: 'Просмотр истории рассылок', group: 'crm' },
  { key: 'marketing:manage', label: 'Отправка рассылок', description: 'Создание и отправка маркетинговых сообщений', group: 'crm' },
  { key: 'stats:view', label: 'Статистика', description: 'Просмотр аналитики и отчётов', group: 'erp' },
  { key: 'services:view', label: 'Просмотр услуг', description: 'Каталог услуг организации', group: 'erp' },
  { key: 'services:manage', label: 'Управление услугами', description: 'Создание и редактирование услуг', group: 'erp' },
  { key: 'team:view', label: 'Просмотр команды', description: 'Список сотрудников', group: 'erp' },
  { key: 'team:manage', label: 'Управление командой', description: 'Приглашение и удаление сотрудников', group: 'erp' },
  { key: 'inventory:view', label: 'Просмотр склада', description: 'Остатки товаров и материалов', group: 'erp' },
  { key: 'inventory:manage', label: 'Управление складом', description: 'Приходы, расходы, корректировки', group: 'erp' },
  { key: 'promotions:view', label: 'Просмотр акций', description: 'Активные и архивные акции', group: 'erp' },
  { key: 'promotions:manage', label: 'Управление акциями', description: 'Создание и редактирование акций', group: 'erp' },
  { key: 'finance:view', label: 'Просмотр финансов', description: 'Доходы, расходы, отчёты', group: 'erp' },
  { key: 'finance:manage', label: 'Управление финансами', description: 'Добавление записей, выплаты', group: 'erp' },
  { key: 'notifications:view', label: 'Уведомления', description: 'Получение системных уведомлений', group: 'system' },
  { key: 'profile:view', label: 'Просмотр профиля', description: 'Просмотр настроек организации', group: 'system' },
  { key: 'profile:manage', label: 'Редактирование профиля', description: 'Изменение данных организации', group: 'system' },
  { key: 'subscription:view', label: 'Просмотр подписки', description: 'Статус и история платежей', group: 'system' },
  { key: 'subscription:manage', label: 'Управление подпиской', description: 'Оплата и изменение тарифа', group: 'system' },
];

const defaultPermissions: Record<string, string[]> = {
  master: [
    'bookings:view', 'schedule:view', 'clients:view', 'chats:view',
    'services:view', 'notifications:view',
  ],
  manager: [
    'bookings:view', 'bookings:manage', 'schedule:view', 'schedule:manage',
    'clients:view', 'clients:manage', 'chats:view',
    'marketing:view', 'marketing:manage',
    'stats:view', 'services:view', 'services:manage',
    'team:view', 'inventory:view', 'inventory:manage',
    'promotions:view', 'promotions:manage',
    'finance:view', 'notifications:view', 'profile:view',
  ],
  business_admin: [
    'bookings:view', 'bookings:manage', 'schedule:view', 'schedule:manage',
    'clients:view', 'clients:manage', 'chats:view',
    'marketing:view', 'marketing:manage',
    'stats:view', 'services:view', 'services:manage',
    'team:view', 'team:manage', 'inventory:view', 'inventory:manage',
    'promotions:view', 'promotions:manage',
    'finance:view', 'finance:manage',
    'notifications:view', 'profile:view', 'profile:manage',
  ],
  admin: [
    'bookings:view', 'bookings:manage', 'schedule:view', 'schedule:manage',
    'clients:view', 'clients:manage', 'chats:view',
    'marketing:view', 'marketing:manage',
    'stats:view', 'services:view', 'services:manage',
    'team:view', 'team:manage', 'inventory:view', 'inventory:manage',
    'promotions:view', 'promotions:manage',
    'finance:view', 'finance:manage',
    'notifications:view', 'profile:view', 'profile:manage',
    'subscription:view',
  ],
};

const systemRoles = [
  { key: 'master', label: 'Мастер', icon: Wrench, description: 'Специалист, оказывающий услуги' },
  { key: 'manager', label: 'Менеджер', icon: Briefcase, description: 'Управление записями и клиентами' },
  { key: 'business_admin', label: 'Администратор точки', icon: UserCog, description: 'Полный RW в одной точке' },
  { key: 'admin', label: 'Управляющий', icon: Shield, description: 'Полное управление организацией' },
];

const RolePermissionsEditor = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState<RoleKey>('master');
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(defaultPermissions);
  const [customRoles, setCustomRoles] = useState<{ key: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('business_locations')
        .select('role_permissions')
        .eq('id', businessId)
        .single();

      if (data?.role_permissions && Object.keys(data.role_permissions as object).length > 0) {
        const saved = data.role_permissions as Record<string, any>;
        const perms: Record<string, string[]> = {
          master: saved.master || defaultPermissions.master,
          manager: saved.manager || defaultPermissions.manager,
          admin: saved.admin || defaultPermissions.admin,
        };
        // Load custom roles
        const customs: { key: string; label: string }[] = [];
        const customMeta = saved._custom_roles as any[];
        if (Array.isArray(customMeta)) {
          customMeta.forEach((cr: any) => {
            customs.push({ key: cr.key, label: cr.label });
            perms[cr.key] = saved[cr.key] || [];
          });
        }
        setCustomRoles(customs);
        setRolePerms(perms);
      }
      setLoaded(true);
    };
    load();
  }, [businessId]);

  const togglePermission = (perm: string) => {
    setRolePerms(prev => {
      const current = prev[activeRole] || [];
      const updated = current.includes(perm)
        ? current.filter(p => p !== perm)
        : [...current, perm];
      return { ...prev, [activeRole]: updated };
    });
  };

  const toggleAll = (group: string, checked: boolean) => {
    const groupPerms = permissions.filter(p => p.group === group).map(p => p.key);
    setRolePerms(prev => {
      const current = prev[activeRole] || [];
      const updated = checked
        ? [...new Set([...current, ...groupPerms])]
        : current.filter(p => !groupPerms.includes(p));
      return { ...prev, [activeRole]: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = { ...rolePerms, _custom_roles: customRoles };
    const { error } = await supabase
      .from('business_locations')
      .update({ role_permissions: payload as any })
      .eq('id', businessId);

    if (error) {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Настройки доступов сохранены' });
    }
    setSaving(false);
  };

  const handleReset = () => {
    const isSystem = systemRoles.some(r => r.key === activeRole);
    if (isSystem) {
      setRolePerms(prev => ({ ...prev, [activeRole]: defaultPermissions[activeRole] }));
    } else {
      setRolePerms(prev => ({ ...prev, [activeRole]: [] }));
    }
    toast({ title: 'Сброшено к значениям по умолчанию' });
  };

  const handleAddRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    const key = `custom_${Date.now()}`;
    setCustomRoles(prev => [...prev, { key, label: trimmed }]);
    setRolePerms(prev => ({ ...prev, [key]: [] }));
    setActiveRole(key);
    setNewRoleName('');
    setAddDialogOpen(false);
    toast({ title: `Должность «${trimmed}» добавлена` });
  };

  const handleDeleteCustomRole = (roleKey: string) => {
    setCustomRoles(prev => prev.filter(r => r.key !== roleKey));
    setRolePerms(prev => {
      const { [roleKey]: _, ...rest } = prev;
      return rest;
    });
    if (activeRole === roleKey) setActiveRole('master');
    toast({ title: 'Должность удалена' });
  };

  if (!loaded) return <p className="text-center py-10 text-muted-foreground">Загрузка...</p>;

  const allRoles = [
    ...systemRoles.map(r => ({ ...r, isSystem: true })),
    ...customRoles.map(r => ({ key: r.key, label: r.label, icon: UserCog, description: 'Пользовательская должность', isSystem: false })),
  ];

  const currentPerms = rolePerms[activeRole] || [];
  const activeRoleInfo = allRoles.find(r => r.key === activeRole) || allRoles[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> Настройки доступов
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Выберите роль и настройте, какие разделы будут доступны сотрудникам
        </p>
      </div>

      {/* Role tabs + Add button */}
      <div className="flex gap-2 flex-wrap items-center">
        {allRoles.map(role => {
          const Icon = role.icon;
          return (
            <Button
              key={role.key}
              variant={activeRole === role.key ? 'default' : 'outline'}
              onClick={() => setActiveRole(role.key)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {role.label}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </div>

      {/* Role description */}
      <Card>
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <activeRoleInfo.icon className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{activeRoleInfo.label}</p>
            <p className="text-xs text-muted-foreground">{activeRoleInfo.description}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {currentPerms.length}/{permissions.length} разрешений
          </Badge>
          {!activeRoleInfo.isSystem && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDeleteCustomRole(activeRole)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Permission groups */}
      {permissionGroups.map(group => {
        const groupPerms = permissions.filter(p => p.group === group.key);
        const checkedCount = groupPerms.filter(p => currentPerms.includes(p.key)).length;
        const allChecked = checkedCount === groupPerms.length;

        return (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{group.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {checkedCount}/{groupPerms.length}
                  </span>
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(checked) => toggleAll(group.key, !!checked)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {groupPerms.map(perm => (
                  <label
                    key={perm.key}
                    className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <Checkbox
                      checked={currentPerms.includes(perm.key)}
                      onCheckedChange={() => togglePermission(perm.key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Сбросить
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      {/* Add custom role dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая должность</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Название должности..."
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRole()}
            />
            <p className="text-sm text-muted-foreground">
              После создания выберите необходимые доступы через чекбоксы.
            </p>
            <Button onClick={handleAddRole} disabled={!newRoleName.trim()} className="w-full gap-1">
              <Plus className="h-4 w-4" /> Создать должность
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolePermissionsEditor;
