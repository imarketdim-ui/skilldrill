import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Building2, Globe } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

const plans = [
  {
    name: 'Мастер', price: '900', period: 'мес', icon: Crown,
    description: 'Для самозанятых специалистов',
    features: ['До 10 услуг', 'До 100 записей/мес', 'Персональное расписание', 'Клиентская база', 'Промоакции и скидки', 'Дашборд с аналитикой'],
    cta: 'Стать мастером', link: '/request-role?type=master',
  },
  {
    name: 'Бизнес', price: 'от 2 500', period: 'мес', icon: Building2,
    description: 'Для организаций с одной точкой', popular: true,
    features: ['До 5 мастеров бесплатно', '+500 ₽/мес за доп. мастера', 'CRM + ERP (бета)', 'Общее расписание', 'Финансовый учёт', 'Менеджеры', 'Фото интерьера/экстерьера'],
    cta: 'Создать бизнес', link: '/request-role?type=business',
  },
  {
    name: 'Сеть', price: 'от 4 500', period: 'мес', icon: Globe,
    description: 'Для сетей с несколькими точками',
    features: ['До 3 точек бесплатно', '+1 000 ₽/мес за доп. точку', '+500 ₽/мес за доп. мастера', 'Общий дашборд по точкам', 'Централизованная CRM', 'Система лояльности', 'Менеджеры для каждой точки'],
    cta: 'Создать сеть', link: '/request-role?type=network',
  },
];

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container-wide">
          <div className="text-center mb-12 pt-8">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-4">Тарифы</p>
            <h1 className="text-4xl font-display font-bold mb-4">Выберите подходящий план</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Прозрачное ценообразование для вашего бизнеса
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card key={plan.name} className={`relative ${plan.popular ? 'border-primary shadow-md scale-105' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Популярный
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-display">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <span className="text-4xl font-display font-bold">{plan.price}</span>
                      <span className="text-muted-foreground"> ₽/{plan.period}</span>
                    </div>
                    <ul className="space-y-3 text-left mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => navigate(user ? plan.link : '/auth?tab=signup')}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="text-center mt-12 text-sm text-muted-foreground">
            <p>Все цены указаны с учётом НДС. Подключение эквайринга — Т-Банк.</p>
            <p className="mt-1">Готовность к интеграции рекуррентных платежей и автосписаний.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscription;
