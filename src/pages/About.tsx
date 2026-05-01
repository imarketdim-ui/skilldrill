import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Star, Shield, Calendar, Bell, Gift, Users, ArrowRight, Search, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { getPublicSiteUrl, removeStructuredData, updatePageMeta, updateStructuredData } from '@/lib/seoUtils';

const clientBenefits = [
  { icon: Search, title: 'Умный поиск', description: 'Находите мастеров и организации по услуге, рейтингу, цене и расположению. Фильтры помогают найти именно то, что нужно.' },
  { icon: Calendar, title: 'Онлайн-запись 24/7', description: 'Записывайтесь в удобное время без звонков. Получайте подтверждение мгновенно и напоминание перед визитом.' },
  { icon: Star, title: 'Проверенные рейтинги', description: 'Двусторонняя система оценок: клиенты оценивают мастеров, а мастера — клиентов. Только честные отзывы от реальных людей.' },
  { icon: Shield, title: 'Безопасность и гарантии', description: 'Все мастера проходят верификацию. Ваши данные защищены. Система споров поможет решить любую ситуацию.' },
  { icon: Bell, title: 'Уведомления', description: 'Напоминания о записях, акции от любимых мастеров, оповещения о статусе — вы всегда в курсе.' },
  { icon: Gift, title: 'Реферальная программа', description: 'Приглашайте друзей и получайте бонусы на свой баланс. Друзья тоже получают скидку на первую запись.' },
  { icon: Heart, title: 'Избранное и история', description: 'Сохраняйте любимых мастеров, быстро повторяйте запись. Вся история визитов — в личном кабинете.' },
  { icon: Users, title: 'Персональный рейтинг', description: 'Ваш клиентский рейтинг открывает доступ к эксклюзивным скидкам и приоритетной записи у лучших мастеров.' },
];

const faqItems = [
  {
    question: 'Можно ли записаться без звонка мастеру?',
    answer: 'Да. На SkillSpot клиент выбирает услугу, время и отправляет запись онлайн. Если у мастера включено подтверждение, заявка уходит на подтверждение без лишних звонков.',
  },
  {
    question: 'Как работают рейтинги клиентов и мастеров?',
    answer: 'Платформа учитывает завершённые визиты, отзывы, подтверждения, отмены и другие сигналы доверия. Это помогает мастерам безопаснее работать с клиентами, а клиентам — находить надёжных специалистов.',
  },
  {
    question: 'Можно ли переписываться с мастером прямо на платформе?',
    answer: 'Да. В SkillSpot есть встроенные сообщения и уведомления, чтобы клиент мог уточнить детали без передачи личных контактов.',
  },
];

const About = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const url = getPublicSiteUrl('/about');
    updatePageMeta({
      title: 'О платформе SkillSpot — возможности для клиентов',
      description: 'Узнайте, как SkillSpot помогает находить услуги, записываться онлайн, работать с рейтингами и безопасно взаимодействовать с мастерами.',
      url,
      canonicalUrl: url,
      type: 'article',
    });

    updateStructuredData('about-page', {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'О платформе SkillSpot',
      url,
      description: 'Описание возможностей SkillSpot для клиентов и принципов работы платформы.',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });

    return () => removeStructuredData('about-page');
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-16 bg-background">
          <div className="container-wide max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Почему клиенты выбирают <span className="text-primary">SkillSpot</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Единая платформа для поиска и записи к проверенным специалистам. 
                Удобно, прозрачно, выгодно.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" onClick={() => navigate('/auth?tab=signup')}>
                  Зарегистрироваться бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/')}>
                  Найти услугу
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="py-16 bg-surface">
          <div className="container-wide">
            <h2 className="text-3xl font-bold text-center mb-12">Преимущества для клиентов</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {clientBenefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-6 border border-border/50"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <b.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How ratings work */}
        <section className="py-16 bg-background">
          <div className="container-wide max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Как работает рейтинг</h2>
            <p className="text-muted-foreground mb-8">
              В SkillSpot рейтинг — двусторонний. Мастера оценивают клиентов, а клиенты — мастеров. 
              Высокий рейтинг открывает доступ к лучшим специалистам и эксклюзивным акциям. 
              Рейтинг формируется на основе завершённых визитов, отзывов и поведения (неявки, отмены).
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-surface border border-border/50">
                <p className="text-4xl font-bold text-primary mb-2">4.5+</p>
                <p className="text-sm text-muted-foreground">Доступ к топ-мастерам и приоритетная запись</p>
              </div>
              <div className="p-6 rounded-2xl bg-surface border border-border/50">
                <p className="text-4xl font-bold text-primary mb-2">3.5+</p>
                <p className="text-sm text-muted-foreground">Стандартный доступ ко всем услугам платформы</p>
              </div>
              <div className="p-6 rounded-2xl bg-surface border border-border/50">
                <p className="text-4xl font-bold text-amber-500 mb-2">&lt;3.5</p>
                <p className="text-sm text-muted-foreground">Ограничение записи, рекомендация улучшить рейтинг</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA to business */}
        <section className="py-16 bg-surface">
          <div className="container-wide max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Хотите стать мастером или подключить бизнес?</h2>
            <p className="text-muted-foreground mb-8">
              Любой зарегистрированный пользователь может подать заявку на мастера или создать кабинет бизнеса. 
              Узнайте подробнее о возможностях для специалистов и владельцев.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate('/for-business')}>
                Для бизнеса и мастеров
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/for-business#pricing')}>
                Тарифы
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
