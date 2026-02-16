import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Check, ArrowRight, Calendar, BarChart3, Users, Shield, 
  Bell, Wallet, Building2, Globe, Star, TrendingUp, 
  UserCheck, Ban, MessageSquare, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const masterFeatures = [
  { icon: Calendar, title: 'Личное расписание', description: 'Управляйте рабочим временем, выходными и перерывами. Клиенты видят только свободные слоты.' },
  { icon: Star, title: 'Профиль и портфолио', description: 'Покажите свои работы, получайте отзывы. Ваш профиль — ваша визитная карточка.' },
  { icon: Users, title: 'Клиентская база', description: 'CRM с тегами, заметками и историей визитов. Знайте своих клиентов.' },
  { icon: BarChart3, title: 'Аналитика', description: 'Следите за доходом, популярностью услуг, загрузкой по дням.' },
  { icon: Bell, title: 'Уведомления', description: 'Оповещения о новых записях, отменах и изменениях в Telegram и других каналах.' },
  { icon: Wallet, title: 'Финансы', description: 'Учёт доходов и расходов, история платежей, баланс.' },
];

const businessFeatures = [
  { icon: Building2, title: 'Управление точкой', description: 'Единый дашборд для расписания, сотрудников, финансов и клиентов.' },
  { icon: UserCheck, title: 'Роли сотрудников', description: 'Назначайте мастеров и менеджеров с гибкими правами доступа.' },
  { icon: BarChart3, title: 'CRM + ERP', description: 'Технологические карты услуг, расчёт себестоимости, учёт расходников.' },
  { icon: TrendingUp, title: 'Финансовая аналитика', description: 'Доходы по мастерам, услугам и периодам. Зарплаты и комиссии.' },
  { icon: Shield, title: 'Рейтинг клиентов', description: 'Видите рейтинг каждого клиента: частоту неявок, отмен и оплат. Принимайте информированные решения.' },
  { icon: Ban, title: 'Чёрные списки', description: 'Блокируйте недобросовестных клиентов на уровне мастера или всей организации.' },
  { icon: MessageSquare, title: 'Встроенный чат', description: 'Общайтесь с клиентами прямо на платформе. Никакого спама в личных мессенджерах.' },
  { icon: Bell, title: 'Оповещения', description: 'Уведомления в Telegram, SMS и email. Ни одна запись не потеряется.' },
];

const plans = [
  {
    name: 'Мастер',
    price: '900',
    description: 'Для самозанятых специалистов',
    features: ['До 10 услуг', 'До 100 записей/мес', 'Расписание и клиенты', 'Аналитика и отчёты'],
    link: '/request-role?type=master',
  },
  {
    name: 'Бизнес',
    price: 'от 2 500',
    description: 'Для организаций с одной точкой',
    popular: true,
    features: ['До 5 мастеров бесплатно', '+500 ₽/мес за доп. мастера', 'CRM + ERP + Финансы', 'Менеджеры и роли'],
    link: '/request-role?type=business',
  },
  {
    name: 'Сеть',
    price: 'от 4 500',
    description: 'Для сетей с несколькими точками',
    features: ['До 3 точек бесплатно', '+1 000 ₽/мес за точку', 'Единый дашборд', 'Централизованная CRM'],
    link: '/request-role?type=network',
  },
];

const ForBusiness = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-16 bg-background">
          <div className="container-wide max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="text-primary">SkillSpot</span> для бизнеса и мастеров
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Операционная система для сервисного бизнеса: от онлайн-записи до финансовой аналитики. 
                Привлекайте клиентов, управляйте командой, контролируйте доходы.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Master features */}
        <section className="py-16 bg-surface">
          <div className="container-wide">
            <h2 className="text-3xl font-bold text-center mb-4">Для мастеров и специалистов</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Всё, что нужно самозанятому мастеру для привлечения клиентов и управления записями
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masterFeatures.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-6 border border-border/50"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Business features */}
        <section className="py-16 bg-background">
          <div className="container-wide">
            <h2 className="text-3xl font-bold text-center mb-4">Для бизнеса и сетей</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Полноценная ERP-система с CRM, аналитикой, управлением командой и финансами
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {businessFeatures.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-6 border border-border/50"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Client ratings explanation */}
        <section className="py-16 bg-surface">
          <div className="container-wide max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Двусторонние рейтинги — ваша защита</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              SkillSpot — единственная платформа, где рейтинг есть не только у мастера, но и у клиента. 
              Это помогает защитить ваш бизнес от недобросовестных клиентов.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
                <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Частота неявок</h3>
                <p className="text-sm text-muted-foreground">
                  Система фиксирует, когда клиент не приходит без предупреждения. 
                  Вы видите эту статистику до подтверждения записи.
                </p>
              </div>
              <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
                <CreditCard className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">История оплат</h3>
                <p className="text-sm text-muted-foreground">
                  Отслеживание оплат и задолженностей. 
                  Прозрачная финансовая история каждого клиента.
                </p>
              </div>
              <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
                <Ban className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Чёрный список</h3>
                <p className="text-sm text-muted-foreground">
                  Заблокируйте нежелательного клиента для конкретного мастера или для всей организации.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 bg-background">
          <div className="container-wide max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Тарифы</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.name} className={`bg-card rounded-2xl p-6 border ${plan.popular ? 'border-primary shadow-lg' : 'border-border/50'} relative`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Популярный
                    </span>
                  )}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <p className="text-3xl font-bold mb-6">{plan.price} <span className="text-base font-normal text-muted-foreground">₽/мес</span></p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'} onClick={() => navigate(plan.link)}>
                    Начать
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-surface">
          <div className="container-wide max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Начните с регистрации</h2>
            <p className="text-muted-foreground mb-8">
              Для начала работы зарегистрируйтесь как пользователь, затем подайте заявку на мастера или создание бизнеса. 
              Любой мастер также пользуется услугами других специалистов — это выгодно и удобно.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate('/auth?tab=signup')}>
                Зарегистрироваться <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/about')}>
                О платформе для клиентов
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ForBusiness;
