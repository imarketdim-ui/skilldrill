import AdminDashboard from './AdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plug, Ticket, ListChecks } from 'lucide-react';

const IntegratorDashboard = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plug className="h-4 w-4" /> Онбординг</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Проверяйте готовность кабинетов бизнеса и помогайте довести данные до публикации.</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" /> Чеклисты</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Контролируйте заполненность реквизитов, фото, контактов и настроек профиля.</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Ticket className="h-4 w-4" /> Промокоды</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Выдавайте и сопровождайте бонусные подключения без доступа к лишним admin-функциям.</CardContent>
      </Card>
    </div>
    <AdminDashboard
      modeOverride="integrator"
      titleOverride="Кабинет интегратора"
      descriptionOverride="Фокус на настройке ЛК, организациях, поддержке и промокодах."
    />
  </div>
);

export default IntegratorDashboard;
