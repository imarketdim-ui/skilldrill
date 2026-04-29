import AdminDashboard from './AdminDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plug, Ticket, ListChecks, Building2, ArrowUpRight, LockKeyhole } from 'lucide-react';

const INTEGRATOR_CHECKLIST = [
  'Проверьте, что у бизнеса заполнены реквизиты, контакты и базовое описание.',
  'Убедитесь, что владелец понимает логику ролей, уведомлений и стартовых настроек кабинета.',
  'Промокоды и бонусные подключения выдавайте только как часть согласованного сценария онбординга.',
];

const IntegratorDashboard = () => (
  <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">Кабинет интегратора</h2>
        <p className="text-muted-foreground mt-1">Контур для внедрения, запуска и сопровождения кабинетов бизнеса без доступа к системной модерации платформы.</p>
      </div>
      <Badge variant="outline">Integrator only</Badge>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plug className="h-4 w-4" /> Запуск</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Доведите кабинет до состояния, когда бизнес может полноценно стартовать.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" /> Чеклисты</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Контролируйте заполненность реквизитов, описаний, фото и оргданных.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Организации</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Помогайте довести бизнес до публикации без входа в лишние платформенные разделы.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Ticket className="h-4 w-4" /> Промокоды</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Сопровождайте бонусные подключения как часть управляемого внедрения.</CardContent>
      </Card>
    </div>

    <Tabs defaultValue="workspace" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="workspace">Рабочее место</TabsTrigger>
        <TabsTrigger value="checklist">Чеклист запуска</TabsTrigger>
        <TabsTrigger value="scope">Границы доступа</TabsTrigger>
      </TabsList>

      <TabsContent value="workspace">
        <AdminDashboard
          modeOverride="integrator"
          titleOverride="Рабочее место интегратора"
          descriptionOverride="Фокус на настройке ЛК, организациях, поддержке и промокодах."
        />
      </TabsContent>

      <TabsContent value="checklist">
        <Card>
          <CardHeader>
            <CardTitle>Чеклист онбординга</CardTitle>
            <CardDescription>Минимум, который нужен перед реальным запуском кабинета бизнеса.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {INTEGRATOR_CHECKLIST.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <ArrowUpRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scope">
        <Card>
          <CardHeader>
            <CardTitle>Что недоступно интегратору</CardTitle>
            <CardDescription>Эта роль помогает запускать, но не заменяет администратора платформы.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <LockKeyhole className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span>Интегратор не управляет ролями пользователей платформы, антифродом и системной модерацией.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <LockKeyhole className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span>Если нужен доступ сверх онбординга и промокодов, кейс должен перейти администратору платформы.</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

export default IntegratorDashboard;
