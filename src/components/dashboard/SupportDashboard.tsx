import AdminDashboard from './AdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LifeBuoy, Building2, MessageSquare } from 'lucide-react';

const SupportDashboard = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><LifeBuoy className="h-4 w-4" /> Поддержка</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Работа с обращениями, пользовательскими вопросами и проблемными кейсами.</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Чаты</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Обрабатывайте новые сообщения и держите SLA по ответам.</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Организации</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Проверяйте, что у бизнеса заполнены реквизиты и базовые данные для запуска.</CardContent>
      </Card>
    </div>
    <AdminDashboard
      modeOverride="support"
      titleOverride="Кабинет поддержки"
      descriptionOverride="Доступ только к обращениям, чатам и просмотру организаций."
    />
  </div>
);

export default SupportDashboard;
