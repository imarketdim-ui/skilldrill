import AdminDashboard from './AdminDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LifeBuoy, Building2, MessageSquare, Clock3, ShieldAlert, ArrowUpRight } from 'lucide-react';

const SUPPORT_PLAYBOOK = [
  'Сначала отвечайте в чате поддержки и фиксируйте контекст обращения до эскалации.',
  'По организациям проверяйте базовые реквизиты, контакты и признаки готовности к работе.',
  'Если кейс связан с ролями, антифродом или модерацией, передавайте его администратору платформы.',
];

const SupportDashboard = () => (
  <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">Кабинет поддержки</h2>
        <p className="text-muted-foreground mt-1">Контур для пользовательских обращений, чатов и сопровождения бизнеса без доступа к системному администрированию.</p>
      </div>
      <Badge variant="outline">Support only</Badge>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><LifeBuoy className="h-4 w-4" /> Первая линия</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Закрывайте типовые вопросы пользователей и бизнеса в одном окне.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Поддержка</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Работайте с непрочитанными сообщениями и держите единый тон ответов.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Организации</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Проверяйте, хватает ли бизнесу данных для старта и публикации.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" /> SLA</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Сложные кейсы эскалируйте быстро, не держите их в поддержке без движения.</CardContent>
      </Card>
    </div>

    <Tabs defaultValue="workspace" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="workspace">Рабочее место</TabsTrigger>
        <TabsTrigger value="playbook">Регламент</TabsTrigger>
        <TabsTrigger value="scope">Границы доступа</TabsTrigger>
      </TabsList>

      <TabsContent value="workspace">
        <AdminDashboard
          modeOverride="support"
          titleOverride="Рабочее место поддержки"
          descriptionOverride="Доступ только к обращениям, чатам и просмотру организаций."
        />
      </TabsContent>

      <TabsContent value="playbook">
        <Card>
          <CardHeader>
            <CardTitle>Как работать в этой роли</CardTitle>
            <CardDescription>Короткий регламент, чтобы не смешивать поддержку с модерацией и администрированием.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SUPPORT_PLAYBOOK.map((item) => (
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
            <CardTitle>Что недоступно поддержке</CardTitle>
            <CardDescription>Этот кабинет намеренно уже, чем админский.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span>Поддержка не меняет роли, не подтверждает антифрод и не принимает системные решения по спорным аккаунтам.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <span>Если кейс касается безопасности, массовых нарушений или модерации карточек, его нужно эскалировать администратору или модератору.</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

export default SupportDashboard;
